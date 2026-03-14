// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/ITrustGate.sol";

/**
 * @title TrustGateHook
 * @notice Hook contract for ERC-8183 jobs to require agent certification
 * @dev Deploy this contract and configure it as a hook in your ERC-8183 jobs
 *
 * Usage:
 *   1. Deploy: new TrustGateHook(trustgateAddress, 2) // 2 = TRUSTED only
 *   2. Add as hook in your ERC-8183 job creation
 *   3. Hook automatically rejects uncertified or low-trust agents
 *
 * This makes TRUSTGATE certification a requirement at the protocol level.
 */
contract TrustGateHook {
    /// @notice TRUSTGATE registry contract
    ITrustGate public immutable trustgate;

    /// @notice Minimum certification level required
    /// @dev 0=UNVERIFIED, 1=CONDITIONAL, 2=TRUSTED, 3=FLAGGED
    uint8 public immutable minimumLevel;

    /// @notice Deployer who can update settings (if needed in future versions)
    address public immutable deployer;

    /// @notice Emitted when hook blocks an agent
    event AgentBlocked(
        bytes32 indexed jobId,
        address indexed provider,
        uint8 agentLevel,
        string reason
    );

    /// @notice Emitted when hook allows an agent
    event AgentApproved(
        bytes32 indexed jobId,
        address indexed provider,
        uint8 agentLevel
    );

    /**
     * @notice Deploy hook with certification requirements
     * @param _trustgate Address of TrustGateRegistry contract
     * @param _minimumLevel Minimum certification level (0-3)
     *        0 = UNVERIFIED (allows anyone - no filter)
     *        1 = CONDITIONAL (requires at least CONDITIONAL)
     *        2 = TRUSTED (requires TRUSTED only) - recommended
     *        3 = FLAGGED (blocks everyone - rarely useful)
     */
    constructor(address _trustgate, uint8 _minimumLevel) {
        require(_trustgate != address(0), "TrustGateHook: zero address");
        require(_minimumLevel <= 3, "TrustGateHook: invalid level");

        trustgate = ITrustGate(_trustgate);
        minimumLevel = _minimumLevel;
        deployer = msg.sender;
    }

    /**
     * @notice Hook called before assigning provider to a job
     * @param jobId ERC-8183 job identifier
     * @param provider Address of the agent/provider
     * @param data Additional hook data (unused)
     * @dev Reverts if agent doesn't meet certification requirements
     *
     * This is the core function that ERC-8183 calls before job assignment.
     * If this reverts, the job assignment fails and the agent cannot work on the job.
     */
    function beforeAssign(
        bytes32 jobId,
        address provider,
        bytes calldata data
    ) external view {
        // Get agent certification
        (uint8 level, uint256 expiry, bool active) = trustgate.getCertificationLevel(provider);

        // Check if certification exists and is active
        if (!active) {
            revert("TrustGateHook: agent has no active certification");
        }

        // Check expiry
        if (expiry <= block.timestamp) {
            revert("TrustGateHook: agent certification expired");
        }

        // Check level meets minimum requirement
        if (level < minimumLevel) {
            revert("TrustGateHook: agent certification level insufficient");
        }

        // Special case: FLAGGED agents are always blocked regardless of minimumLevel
        if (level == 3) {
            revert("TrustGateHook: agent is FLAGGED and cannot be assigned");
        }

        // Agent passed all checks
        // Note: Events removed since this is a view function
        // The calling contract should emit events based on success/failure
    }

    /**
     * @notice Get certification requirements
     * @return trustgateAddress Address of TRUSTGATE registry
     * @return minLevel Minimum level required
     * @return minLevelName Human-readable level name
     */
    function getRequirements()
        external
        view
        returns (
            address trustgateAddress,
            uint8 minLevel,
            string memory minLevelName
        )
    {
        return (address(trustgate), minimumLevel, _levelToString(minimumLevel));
    }

    /**
     * @notice Check if an agent would be approved
     * @param provider Address to check
     * @return approved True if agent meets requirements
     * @return reason Human-readable reason if not approved
     */
    function checkAgent(address provider)
        external
        view
        returns (bool approved, string memory reason)
    {
        (uint8 level, uint256 expiry, bool active) = trustgate.getCertificationLevel(provider);

        if (!active) {
            return (false, "No active certification");
        }

        if (expiry <= block.timestamp) {
            return (false, "Certification expired");
        }

        if (level == 3) {
            return (false, "Agent is FLAGGED");
        }

        if (level < minimumLevel) {
            return (
                false,
                string(
                    abi.encodePacked(
                        "Level ",
                        _levelToString(level),
                        " below minimum ",
                        _levelToString(minimumLevel)
                    )
                )
            );
        }

        return (true, "Agent meets requirements");
    }

    /**
     * @notice Get TRUSTGATE accuracy to verify hook credibility
     * @return evalAccuracy Evaluation accuracy percentage * 100
     * @return certAccuracy Certification accuracy percentage * 100
     * @dev Use this to verify TRUSTGATE itself is trustworthy before using hook
     */
    function getTrustgateAccuracy()
        external
        view
        returns (uint256 evalAccuracy, uint256 certAccuracy)
    {
        (uint256 evalAcc, uint256 certAcc, , ) = trustgate.getAccuracyScore();
        return (evalAcc, certAcc);
    }

    /**
     * @notice Convert level code to string
     * @param level Level code (0-3)
     * @return Level name
     */
    function _levelToString(uint8 level) internal pure returns (string memory) {
        if (level == 0) return "UNVERIFIED";
        if (level == 1) return "CONDITIONAL";
        if (level == 2) return "TRUSTED";
        if (level == 3) return "FLAGGED";
        return "UNKNOWN";
    }
}
