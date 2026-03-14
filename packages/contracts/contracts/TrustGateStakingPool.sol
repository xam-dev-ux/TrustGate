// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/ITrustGate.sol";
import "./TrustScoreNFT.sol";

/**
 * @title TrustGateStakingPool
 * @notice Staking pool for agents with job insurance functionality
 * @dev Agents stake USDC as collateral. When accepting jobs, stake is locked as insurance.
 *      If job succeeds, stake is unlocked. If job fails, client receives compensation from stake.
 *
 * Economic Model:
 * - Agent stakes once (e.g., 1000 USDC)
 * - Can accept jobs up to 5x stake value
 * - Each job locks % of stake as insurance coverage
 * - Multiple jobs can use same stake if completed successfully
 * - Failed jobs reduce stake permanently (slashing)
 */
contract TrustGateStakingPool is Ownable, ReentrancyGuard {
    // ============ State Variables ============

    IERC20 public immutable usdc;
    ITrustGate public immutable trustgate;
    TrustScoreNFT public immutable trustScoreNFT;

    /// @notice Total stake per agent
    mapping(address => uint256) public agentStake;

    /// @notice Locked stake per job
    mapping(bytes32 => LockedStake) public lockedStakes;

    /// @notice Agent statistics for reputation
    mapping(address => AgentStats) public agentStats;

    /// @notice Minimum stake required for each certification level
    mapping(uint8 => uint256) public minimumStake;

    /// @notice Coverage percentage based on prediction score (basis points)
    uint256 public baseCoveragePercent = 4000; // 40%

    /// @notice Leverage multiplier (how much job value per 1 USDC stake)
    uint256 public leverageMultiplier = 5;

    /// @notice Insurance fee (basis points) - charged on job completion
    uint256 public insuranceFee = 50; // 0.5%

    /// @notice Treasury address for fees
    address public treasury;

    /// @notice Total value locked in pool
    uint256 public totalStaked;

    /// @notice Total insurance fees collected
    uint256 public totalFeesCollected;

    // ============ Structs ============

    struct LockedStake {
        address agent;
        address client;
        uint256 amount;
        uint256 jobValue;
        uint256 lockedAt;
        uint256 predictedSuccess; // 0-10000 (0-100.00%)
        bool released;
    }

    struct AgentStats {
        uint256 jobsCompleted;
        uint256 jobsFailed;
        uint256 totalValueDelivered;
        uint256 totalStakeSlashed;
        uint256 averagePredictionScore;
        uint256 lastJobTimestamp;
    }

    // ============ Events ============

    event Staked(address indexed agent, uint256 amount, uint256 newTotal);
    event Unstaked(address indexed agent, uint256 amount, uint256 newTotal);
    event StakeLocked(
        bytes32 indexed jobId,
        address indexed agent,
        address indexed client,
        uint256 amount,
        uint256 jobValue,
        uint256 predictedSuccess
    );
    event StakeReleased(bytes32 indexed jobId, address indexed agent, uint256 amount);
    event StakeSlashed(
        bytes32 indexed jobId,
        address indexed agent,
        address indexed client,
        uint256 amount,
        uint256 penalty
    );
    event InsuranceFeePaid(bytes32 indexed jobId, uint256 fee);
    event TreasuryUpdated(address indexed newTreasury);

    // ============ Errors ============

    error InsufficientStake();
    error InsufficientFreeStake();
    error StakeAlreadyLocked();
    error StakeNotLocked();
    error StakeAlreadyReleased();
    error Unauthorized();
    error InvalidAmount();
    error InvalidJobValue();
    error TransferFailed();

    // ============ Constructor ============

    constructor(
        address _usdc,
        address _trustgate,
        address _trustScoreNFT,
        address _treasury,
        uint256 _minConditional,
        uint256 _minTrusted,
        uint256 _minVerified,
        uint256 _leverageMultiplier
    ) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
        trustgate = ITrustGate(_trustgate);
        trustScoreNFT = TrustScoreNFT(_trustScoreNFT);
        treasury = _treasury;

        // Set minimum stake for each level (configurable, in USDC with 6 decimals)
        minimumStake[0] = 0; // UNVERIFIED: no stake required
        minimumStake[1] = _minConditional; // CONDITIONAL: configurable
        minimumStake[2] = _minTrusted; // TRUSTED: configurable
        minimumStake[3] = _minVerified; // VERIFIED: configurable (not used for staking tier)

        // Set leverage multiplier (configurable)
        leverageMultiplier = _leverageMultiplier;
    }

    // ============ Staking Functions ============

    /**
     * @notice Stake USDC to increase certification level and job capacity
     * @param amount Amount of USDC to stake (6 decimals)
     */
    function stake(uint256 amount) external nonReentrant {
        if (amount == 0) revert InvalidAmount();

        // Transfer USDC from agent
        if (!usdc.transferFrom(msg.sender, address(this), amount)) {
            revert TransferFailed();
        }

        agentStake[msg.sender] += amount;
        totalStaked += amount;

        emit Staked(msg.sender, amount, agentStake[msg.sender]);

        // Mint or update TrustScore NFT
        trustScoreNFT.updateOrMint(msg.sender);
    }

    /**
     * @notice Unstake USDC (only free stake, not locked)
     * @param amount Amount to unstake
     */
    function unstake(uint256 amount) external nonReentrant {
        if (amount == 0) revert InvalidAmount();
        if (amount > getFreeStake(msg.sender)) revert InsufficientFreeStake();

        agentStake[msg.sender] -= amount;
        totalStaked -= amount;

        // Transfer USDC to agent
        if (!usdc.transfer(msg.sender, amount)) {
            revert TransferFailed();
        }

        emit Unstaked(msg.sender, amount, agentStake[msg.sender]);

        // Update TrustScore NFT
        if (agentStake[msg.sender] > 0) {
            trustScoreNFT.updateOrMint(msg.sender);
        }
    }

    // ============ Insurance Functions ============

    /**
     * @notice Lock stake as insurance for a job
     * @param jobId Unique job identifier (from ERC-8183)
     * @param agent Address of provider/agent
     * @param client Address of client
     * @param jobValue Total job value in USDC
     * @param predictedSuccess Prediction score 0-10000 (0-100%)
     * @return coverageAmount Amount of stake locked as insurance
     */
    function lockStakeForJob(
        bytes32 jobId,
        address agent,
        address client,
        uint256 jobValue,
        uint256 predictedSuccess
    ) external onlyOwner returns (uint256 coverageAmount) {
        if (jobValue == 0) revert InvalidJobValue();
        if (lockedStakes[jobId].amount > 0) revert StakeAlreadyLocked();

        // Calculate coverage based on job value and prediction score
        // Lower prediction = higher coverage required
        uint256 coveragePercent = baseCoveragePercent;
        if (predictedSuccess < 8000) {
            // < 80% success rate → increase coverage
            coveragePercent = baseCoveragePercent + (8000 - predictedSuccess) / 20;
        }

        coverageAmount = (jobValue * coveragePercent) / 10000;

        // Check agent has sufficient free stake
        uint256 freeStake = getFreeStake(agent);
        if (freeStake < coverageAmount) revert InsufficientFreeStake();

        // Check agent can handle this job value (leverage limit)
        uint256 maxJobValue = agentStake[agent] * leverageMultiplier;
        if (jobValue > maxJobValue) revert InsufficientStake();

        // Lock the stake
        lockedStakes[jobId] = LockedStake({
            agent: agent,
            client: client,
            amount: coverageAmount,
            jobValue: jobValue,
            lockedAt: block.timestamp,
            predictedSuccess: predictedSuccess,
            released: false
        });

        emit StakeLocked(jobId, agent, client, coverageAmount, jobValue, predictedSuccess);

        return coverageAmount;
    }

    /**
     * @notice Release locked stake after successful job completion
     * @param jobId Job identifier
     */
    function releaseStake(bytes32 jobId) external onlyOwner nonReentrant {
        LockedStake storage locked = lockedStakes[jobId];

        if (locked.amount == 0) revert StakeNotLocked();
        if (locked.released) revert StakeAlreadyReleased();

        address agent = locked.agent;
        uint256 amount = locked.amount;

        // Mark as released
        locked.released = true;

        // Update stats
        agentStats[agent].jobsCompleted++;
        agentStats[agent].totalValueDelivered += locked.jobValue;
        agentStats[agent].lastJobTimestamp = block.timestamp;

        // Calculate insurance fee
        uint256 fee = (locked.jobValue * insuranceFee) / 10000;

        // Deduct fee from stake (small penalty even on success to fund pool)
        if (agentStake[agent] >= fee) {
            agentStake[agent] -= fee;
            totalFeesCollected += fee;

            // Transfer fee to treasury
            if (!usdc.transfer(treasury, fee)) {
                revert TransferFailed();
            }

            emit InsuranceFeePaid(jobId, fee);
        }

        emit StakeReleased(jobId, agent, amount);

        // Update NFT
        trustScoreNFT.updateOrMint(agent);
    }

    /**
     * @notice Slash stake after job failure and compensate client
     * @param jobId Job identifier
     * @param malicious Whether failure was malicious (higher penalty)
     */
    function slashStake(bytes32 jobId, bool malicious) external onlyOwner nonReentrant {
        LockedStake storage locked = lockedStakes[jobId];

        if (locked.amount == 0) revert StakeNotLocked();
        if (locked.released) revert StakeAlreadyReleased();

        address agent = locked.agent;
        address client = locked.client;
        uint256 coverageAmount = locked.amount;

        // Mark as released (slashed)
        locked.released = true;

        // Calculate penalty
        uint256 penalty = coverageAmount;
        if (malicious) {
            // Malicious failure: slash coverage + additional 50% of remaining stake
            uint256 additionalSlash = (agentStake[agent] * 5000) / 10000; // 50%
            penalty += additionalSlash;
        }

        // Ensure we don't slash more than available
        if (penalty > agentStake[agent]) {
            penalty = agentStake[agent];
        }

        // Reduce agent stake
        agentStake[agent] -= penalty;
        totalStaked -= penalty;

        // Update stats
        agentStats[agent].jobsFailed++;
        agentStats[agent].totalStakeSlashed += penalty;
        agentStats[agent].lastJobTimestamp = block.timestamp;

        // Transfer penalty to client as compensation
        if (!usdc.transfer(client, penalty)) {
            revert TransferFailed();
        }

        emit StakeSlashed(jobId, agent, client, coverageAmount, penalty);

        // Update or burn NFT if stake too low
        if (agentStake[agent] > minimumStake[1]) {
            trustScoreNFT.updateOrMint(agent);
        }
    }

    // ============ View Functions ============

    /**
     * @notice Get free (unlocked) stake for an agent
     * @param agent Agent address
     * @return Free stake amount
     */
    function getFreeStake(address agent) public view returns (uint256) {
        uint256 totalLocked = 0;

        // In production, you'd track this more efficiently
        // For now, we assume external tracking via events

        return agentStake[agent] - totalLocked;
    }

    /**
     * @notice Get maximum job value agent can accept
     * @param agent Agent address
     * @return Maximum job value
     */
    function getMaxJobValue(address agent) external view returns (uint256) {
        // Get boost multiplier based on reputation
        uint256 multiplier = leverageMultiplier;

        AgentStats memory stats = agentStats[agent];
        if (stats.jobsCompleted >= 10) {
            uint256 successRate = (stats.jobsCompleted * 10000) /
                                  (stats.jobsCompleted + stats.jobsFailed);

            if (successRate >= 9500) {
                multiplier = leverageMultiplier * 2; // 10x for 95%+ success
            } else if (successRate >= 9000) {
                multiplier = (leverageMultiplier * 15) / 10; // 7.5x for 90%+
            }
        }

        return agentStake[agent] * multiplier;
    }

    /**
     * @notice Get agent success rate
     * @param agent Agent address
     * @return Success rate in basis points (0-10000)
     */
    function getSuccessRate(address agent) external view returns (uint256) {
        AgentStats memory stats = agentStats[agent];
        uint256 total = stats.jobsCompleted + stats.jobsFailed;

        if (total == 0) return 0;

        return (stats.jobsCompleted * 10000) / total;
    }

    /**
     * @notice Check if agent meets minimum stake for certification level
     * @param agent Agent address
     * @param level Certification level
     * @return Whether agent has sufficient stake
     */
    function hasMinimumStake(address agent, uint8 level) external view returns (bool) {
        return agentStake[agent] >= minimumStake[level];
    }

    /**
     * @notice Calculate coverage and prediction for a job
     * @param agent Agent address
     * @param jobValue Job value
     * @return coverage Coverage amount
     * @return canAccept Whether agent can accept this job
     */
    function calculateCoverage(
        address agent,
        uint256 jobValue
    ) external view returns (uint256 coverage, bool canAccept) {
        // Check if agent can handle this job value
        uint256 maxValue = agentStake[agent] * leverageMultiplier;
        if (jobValue > maxValue) {
            return (0, false);
        }

        // Calculate coverage
        coverage = (jobValue * baseCoveragePercent) / 10000;

        // Check if agent has free stake for coverage
        canAccept = getFreeStake(agent) >= coverage;

        return (coverage, canAccept);
    }

    // ============ Admin Functions ============

    function setTreasury(address _treasury) external onlyOwner {
        treasury = _treasury;
        emit TreasuryUpdated(_treasury);
    }

    function setInsuranceFee(uint256 _fee) external onlyOwner {
        require(_fee <= 500, "Fee too high"); // Max 5%
        insuranceFee = _fee;
    }

    function setBaseCoveragePercent(uint256 _percent) external onlyOwner {
        require(_percent <= 10000, "Invalid percent");
        baseCoveragePercent = _percent;
    }

    function setLeverageMultiplier(uint256 _multiplier) external onlyOwner {
        require(_multiplier > 0 && _multiplier <= 20, "Invalid multiplier");
        leverageMultiplier = _multiplier;
    }

    function setMinimumStake(uint8 level, uint256 amount) external onlyOwner {
        minimumStake[level] = amount;
    }
}
