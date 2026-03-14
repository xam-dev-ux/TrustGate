// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IERC8004Registry.sol";
import "./interfaces/ITrustGate.sol";

/**
 * @title TrustGateRegistry
 * @notice Onchain certification infrastructure for AI agents on Base mainnet
 * @dev Stores immutable certifications, evaluations, and accuracy scores
 *
 * Core Value: Other ERC-8183 contracts can query isTrusted(address) onchain
 * without any TRUSTGATE backend involvement - pure infrastructure.
 */
contract TrustGateRegistry is Ownable, Pausable, ITrustGate {
    // ============ Enums ============

    /// @notice Certification levels
    /// @dev 0=UNVERIFIED 1=CONDITIONAL 2=TRUSTED 3=FLAGGED
    enum CertLevel {
        UNVERIFIED,
        CONDITIONAL,
        TRUSTED,
        FLAGGED
    }

    // ============ Structs ============

    /// @notice Onchain certification record
    struct CertificationRecord {
        address agentAddress;
        CertLevel level;
        uint256 scoreUint;           // 0-100 score
        uint256 issuedAt;
        uint256 expiresAt;
        bytes32 certHash;            // hash of full analysis JSON
        bytes32 jobId;               // ERC-8183 job that created this cert
        bool active;
        address requestedBy;
    }

    /// @notice Evaluation record for ERC-8183 jobs
    struct EvaluationRecord {
        bytes32 jobId;
        address provider;
        address client;
        bool decision;               // true=complete, false=reject
        bytes32 deliverableHash;
        uint256 evaluatedAt;
        bool disputed;
        int8 wasCorrect;             // -1=unknown, 0=wrong, 1=correct
    }

    /// @notice Accuracy tracking state
    struct AccuracyState {
        // Evaluation accuracy
        uint256 totalEvaluations;
        uint256 correctEvaluations;
        uint256 incorrectEvaluations;
        uint256 disputedEvaluations;

        // Certification accuracy
        uint256 totalCertifications;
        uint256 trustedThatSucceeded;
        uint256 trustedThatFailed;
        uint256 flaggedThatFailed;      // correct prediction
        uint256 flaggedThatSucceeded;   // incorrect prediction
    }

    // ============ State Variables ============

    /// @notice USDC token on Base mainnet
    IERC20 public immutable USDC;

    /// @notice ERC-8004 registry reference (optional)
    IERC8004Registry public erc8004Registry;

    /// @notice Certification fee in USDC (with 6 decimals)
    uint256 public certificationFee;

    /// @notice Default certification expiry period (90 days)
    uint256 public certExpiryDays = 90 days;

    /// @notice Operator address (TRUSTGATE backend)
    address public operator;

    /// @notice Treasury address for fee collection
    address public treasury;

    /// @notice Accuracy state
    AccuracyState public accuracy;

    /// @notice Agent address => array of certification records
    mapping(address => CertificationRecord[]) public certifications;

    /// @notice Job ID => evaluation record
    mapping(bytes32 => EvaluationRecord) public evaluations;

    /// @notice Cert hash => outcome recorded
    mapping(bytes32 => bool) public certOutcomeRecorded;

    /// @notice Total certifications issued
    uint256 public totalCertifications;

    /// @notice Total evaluations made
    uint256 public totalEvaluations;

    // ============ Events ============

    event CertificationRequested(
        address indexed agent,
        address indexed requester,
        bytes32 indexed jobId,
        uint256 fee
    );

    event CertificationIssued(
        address indexed agent,
        CertLevel level,
        uint256 score,
        bytes32 certHash,
        uint256 expiresAt
    );

    event EvaluationRecorded(
        bytes32 indexed jobId,
        address indexed provider,
        bool decision,
        uint256 timestamp
    );

    event AccuracyUpdated(
        bytes32 indexed jobId,
        bool wasCorrect,
        uint256 newEvalAccuracyRate,
        uint256 newCertAccuracyRate
    );

    event CertificationOutcomeRecorded(
        bytes32 indexed certHash,
        bool agentSucceeded,
        uint256 newCertAccuracyRate
    );

    event FeeUpdated(uint256 oldFee, uint256 newFee);

    event OperatorUpdated(address indexed oldOperator, address indexed newOperator);

    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);

    event TreasuryWithdraw(address indexed treasury, uint256 amount);

    // ============ Modifiers ============

    modifier onlyOperator() {
        require(msg.sender == operator, "Only operator");
        _;
    }

    // ============ Constructor ============

    constructor(
        address _usdc,
        address _operator,
        address _treasury,
        uint256 _certificationFee
    ) Ownable(msg.sender) {
        require(_usdc != address(0), "Invalid USDC address");
        require(_operator != address(0), "Invalid operator");
        require(_treasury != address(0), "Invalid treasury");

        USDC = IERC20(_usdc);
        operator = _operator;
        treasury = _treasury;
        certificationFee = _certificationFee;
    }

    // ============ Write Functions - Public ============

    /**
     * @notice Request certification for an agent
     * @param agent Address of the agent to certify
     * @param jobId ERC-8183 job ID that originated this request
     * @dev Anyone can call, must pay USDC fee
     */
    function requestCertification(address agent, bytes32 jobId)
        external
        whenNotPaused
    {
        require(agent != address(0), "Invalid agent address");
        require(certificationFee > 0, "Fee not set");

        // Transfer USDC fee from requester to treasury
        require(
            USDC.transferFrom(msg.sender, treasury, certificationFee),
            "USDC transfer failed"
        );

        emit CertificationRequested(agent, msg.sender, jobId, certificationFee);
    }

    // ============ Write Functions - Operator Only ============

    /**
     * @notice Record certification result onchain
     * @param agent Address of the agent
     * @param level Certification level (0-3)
     * @param score Score 0-100
     * @param certHash Hash of the full analysis report
     * @param jobId ERC-8183 job ID
     * @param expiresAt Expiration timestamp
     * @dev Only operator can call after analysis is complete
     */
    function recordCertification(
        address agent,
        uint8 level,
        uint256 score,
        bytes32 certHash,
        bytes32 jobId,
        uint256 expiresAt
    ) external onlyOperator whenNotPaused {
        require(agent != address(0), "Invalid agent");
        require(level <= 3, "Invalid level");
        require(score <= 100, "Invalid score");
        require(certHash != bytes32(0), "Invalid hash");
        require(expiresAt > block.timestamp, "Invalid expiry");

        CertificationRecord memory cert = CertificationRecord({
            agentAddress: agent,
            level: CertLevel(level),
            scoreUint: score,
            issuedAt: block.timestamp,
            expiresAt: expiresAt,
            certHash: certHash,
            jobId: jobId,
            active: true,
            requestedBy: tx.origin
        });

        certifications[agent].push(cert);
        totalCertifications++;
        accuracy.totalCertifications++;

        emit CertificationIssued(agent, CertLevel(level), score, certHash, expiresAt);
    }

    /**
     * @notice Record evaluation decision for ERC-8183 job
     * @param jobId Job ID
     * @param provider Provider address
     * @param client Client address
     * @param decision true=complete, false=reject
     * @param deliverableHash Hash of the deliverable
     * @param reasoning Reasoning for decision (emitted in event, not stored)
     * @dev Only operator calls after evaluating a job
     */
    function recordEvaluation(
        bytes32 jobId,
        address provider,
        address client,
        bool decision,
        bytes32 deliverableHash,
        string calldata reasoning
    ) external onlyOperator whenNotPaused {
        require(jobId != bytes32(0), "Invalid job ID");
        require(provider != address(0), "Invalid provider");
        require(client != address(0), "Invalid client");
        require(evaluations[jobId].evaluatedAt == 0, "Already evaluated");

        EvaluationRecord memory eval = EvaluationRecord({
            jobId: jobId,
            provider: provider,
            client: client,
            decision: decision,
            deliverableHash: deliverableHash,
            evaluatedAt: block.timestamp,
            disputed: false,
            wasCorrect: -1 // unknown until outcome known
        });

        evaluations[jobId] = eval;
        totalEvaluations++;
        accuracy.totalEvaluations++;

        emit EvaluationRecorded(jobId, provider, decision, block.timestamp);
    }

    /**
     * @notice Resolve evaluation accuracy after outcome is known
     * @param jobId Job ID
     * @param wasCorrect True if evaluation was correct
     * @dev Only operator calls after outcome is verified
     */
    function resolveEvaluationAccuracy(bytes32 jobId, bool wasCorrect)
        external
        onlyOperator
    {
        EvaluationRecord storage eval = evaluations[jobId];
        require(eval.evaluatedAt > 0, "Evaluation not found");
        require(eval.wasCorrect == -1, "Already resolved");

        eval.wasCorrect = wasCorrect ? int8(1) : int8(0);

        if (wasCorrect) {
            accuracy.correctEvaluations++;
        } else {
            accuracy.incorrectEvaluations++;
        }

        if (eval.disputed) {
            accuracy.disputedEvaluations++;
        }

        (uint256 evalRate, uint256 certRate) = _calculateAccuracyRates();
        emit AccuracyUpdated(jobId, wasCorrect, evalRate, certRate);
    }

    /**
     * @notice Record certification outcome after agent performs in real jobs
     * @param certHash Hash of the certification
     * @param agentSucceeded True if agent succeeded in subsequent jobs
     * @dev Only operator calls when tracking certified agent outcomes
     */
    function recordCertificationOutcome(bytes32 certHash, bool agentSucceeded)
        external
        onlyOperator
    {
        require(certHash != bytes32(0), "Invalid cert hash");
        require(!certOutcomeRecorded[certHash], "Outcome already recorded");

        certOutcomeRecorded[certHash] = true;

        // Find the certification by hash
        // Note: In production, we'd optimize this with a certHash => cert mapping
        // For now, operator must ensure certHash exists

        // Update accuracy based on level and outcome
        // This is simplified - operator provides the level context off-chain
        // In full implementation, we'd store certHash => CertRecord mapping

        if (agentSucceeded) {
            accuracy.trustedThatSucceeded++;
        } else {
            accuracy.trustedThatFailed++;
        }

        (, uint256 certRate) = _calculateAccuracyRates();
        emit CertificationOutcomeRecorded(certHash, agentSucceeded, certRate);
    }

    /**
     * @notice Mark evaluation as disputed
     * @param jobId Job ID
     * @dev Called when client/provider disputes evaluation
     */
    function markEvaluationDisputed(bytes32 jobId) external onlyOperator {
        EvaluationRecord storage eval = evaluations[jobId];
        require(eval.evaluatedAt > 0, "Evaluation not found");
        require(!eval.disputed, "Already disputed");

        eval.disputed = true;
    }

    // ============ Write Functions - Owner Only ============

    /**
     * @notice Update certification fee
     * @param newFee New fee in USDC (6 decimals)
     */
    function updateFee(uint256 newFee) external onlyOwner {
        uint256 oldFee = certificationFee;
        certificationFee = newFee;
        emit FeeUpdated(oldFee, newFee);
    }

    /**
     * @notice Update operator address
     * @param newOperator New operator address
     */
    function updateOperator(address newOperator) external onlyOwner {
        require(newOperator != address(0), "Invalid operator");
        address oldOperator = operator;
        operator = newOperator;
        emit OperatorUpdated(oldOperator, newOperator);
    }

    /**
     * @notice Update treasury address
     * @param newTreasury New treasury address
     */
    function updateTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Invalid treasury");
        address oldTreasury = treasury;
        treasury = newTreasury;
        emit TreasuryUpdated(oldTreasury, newTreasury);
    }

    /**
     * @notice Withdraw USDC from treasury
     * @dev Only owner can withdraw to treasury address
     */
    function withdrawTreasury() external onlyOwner {
        uint256 balance = USDC.balanceOf(address(this));
        require(balance > 0, "No balance");
        require(USDC.transfer(treasury, balance), "Transfer failed");
        emit TreasuryWithdraw(treasury, balance);
    }

    /**
     * @notice Set ERC-8004 registry address
     * @param registry Registry address
     */
    function setERC8004Registry(address registry) external onlyOwner {
        erc8004Registry = IERC8004Registry(registry);
    }

    /**
     * @notice Update certification expiry period
     * @param days_ New expiry period in days
     */
    function updateCertExpiryDays(uint256 days_) external onlyOwner {
        require(days_ > 0, "Invalid days");
        certExpiryDays = days_;
    }

    /**
     * @notice Pause contract
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    // ============ Read Functions - ITrustGate Interface ============

    /**
     * @notice Get certification level for an agent (HOOK INTERFACE)
     * @param agent Address of the agent
     * @return level Certification level (0-3)
     * @return expiresAt Expiration timestamp
     * @return active True if cert exists and not expired
     * @dev This is what ERC-8183 hooks call to filter agents
     */
    function getCertificationLevel(address agent)
        external
        view
        override
        returns (uint8 level, uint256 expiresAt, bool active)
    {
        CertificationRecord memory cert = _getLatestCert(agent);

        if (cert.issuedAt == 0) {
            return (uint8(CertLevel.UNVERIFIED), 0, false);
        }

        bool isActive = cert.active && cert.expiresAt > block.timestamp;
        return (uint8(cert.level), cert.expiresAt, isActive);
    }

    /**
     * @notice Check if agent is trusted (HOOK INTERFACE)
     * @param agent Address of the agent
     * @return True if agent has active TRUSTED certification
     * @dev Shorthand for hooks that only need trust check
     */
    function isTrusted(address agent) external view override returns (bool) {
        CertificationRecord memory cert = _getLatestCert(agent);

        return cert.active &&
               cert.level == CertLevel.TRUSTED &&
               cert.expiresAt > block.timestamp;
    }

    /**
     * @notice Get TRUSTGATE's accuracy score (HOOK INTERFACE)
     * @return evalAccuracy Evaluation accuracy rate (percentage * 100)
     * @return certAccuracy Certification accuracy rate (percentage * 100)
     * @return totalEvals Total evaluations
     * @return totalCerts Total certifications
     */
    function getAccuracyScore()
        external
        view
        override
        returns (
            uint256 evalAccuracy,
            uint256 certAccuracy,
            uint256 totalEvals,
            uint256 totalCerts
        )
    {
        (uint256 evalRate, uint256 certRate) = _calculateAccuracyRates();
        return (evalRate, certRate, accuracy.totalEvaluations, accuracy.totalCertifications);
    }

    // ============ Read Functions - Public ============

    /**
     * @notice Get latest certification for an agent
     * @param agent Address of the agent
     * @return Certification record
     */
    function getLatestCertification(address agent)
        external
        view
        returns (CertificationRecord memory)
    {
        return _getLatestCert(agent);
    }

    /**
     * @notice Get all certifications for an agent
     * @param agent Address of the agent
     * @return Array of certification records
     */
    function getCertificationHistory(address agent)
        external
        view
        returns (CertificationRecord[] memory)
    {
        return certifications[agent];
    }

    /**
     * @notice Get evaluation record
     * @param jobId Job ID
     * @return Evaluation record
     */
    function getEvaluation(bytes32 jobId)
        external
        view
        returns (EvaluationRecord memory)
    {
        return evaluations[jobId];
    }

    /**
     * @notice Get current fee
     * @return Fee in USDC (6 decimals)
     */
    function getFee() external view returns (uint256) {
        return certificationFee;
    }

    /**
     * @notice Check if agent certification is expired
     * @param agent Address of the agent
     * @return True if latest cert is expired
     */
    function isExpired(address agent) external view returns (bool) {
        CertificationRecord memory cert = _getLatestCert(agent);
        if (cert.issuedAt == 0) return true;
        return block.timestamp > cert.expiresAt;
    }

    /**
     * @notice Get number of certifications for an agent
     * @param agent Address of the agent
     * @return Count
     */
    function getCertificationCount(address agent) external view returns (uint256) {
        return certifications[agent].length;
    }

    /**
     * @notice Get accuracy state
     * @return Accuracy state struct
     */
    function getAccuracyState() external view returns (AccuracyState memory) {
        return accuracy;
    }

    // ============ Internal Functions ============

    /**
     * @notice Get latest certification for an agent
     * @param agent Address
     * @return Latest cert or empty struct
     */
    function _getLatestCert(address agent)
        internal
        view
        returns (CertificationRecord memory)
    {
        CertificationRecord[] storage certs = certifications[agent];
        if (certs.length == 0) {
            return CertificationRecord({
                agentAddress: address(0),
                level: CertLevel.UNVERIFIED,
                scoreUint: 0,
                issuedAt: 0,
                expiresAt: 0,
                certHash: bytes32(0),
                jobId: bytes32(0),
                active: false,
                requestedBy: address(0)
            });
        }
        return certs[certs.length - 1];
    }

    /**
     * @notice Calculate accuracy rates
     * @return evalRate Evaluation accuracy (percentage * 100)
     * @return certRate Certification accuracy (percentage * 100)
     */
    function _calculateAccuracyRates()
        internal
        view
        returns (uint256 evalRate, uint256 certRate)
    {
        // Evaluation accuracy
        uint256 evalResolved = accuracy.correctEvaluations + accuracy.incorrectEvaluations;
        if (evalResolved > 0) {
            evalRate = (accuracy.correctEvaluations * 10000) / evalResolved;
        }

        // Certification accuracy
        uint256 certTotal = accuracy.trustedThatSucceeded +
                           accuracy.trustedThatFailed +
                           accuracy.flaggedThatFailed +
                           accuracy.flaggedThatSucceeded;

        if (certTotal > 0) {
            uint256 certCorrect = accuracy.trustedThatSucceeded + accuracy.flaggedThatFailed;
            certRate = (certCorrect * 10000) / certTotal;
        }

        return (evalRate, certRate);
    }
}
