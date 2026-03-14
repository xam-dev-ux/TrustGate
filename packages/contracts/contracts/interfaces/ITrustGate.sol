// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ITrustGate
 * @notice Hook interface for ERC-8183 contracts to query TRUSTGATE certifications
 * @dev This is what makes TRUSTGATE infrastructure - other contracts can query onchain
 */
interface ITrustGate {
    /**
     * @notice Get certification level for an agent
     * @param agent Address of the agent
     * @return level Certification level (0=UNVERIFIED 1=CONDITIONAL 2=TRUSTED 3=FLAGGED)
     * @return expiresAt Expiration timestamp
     * @return active True if certification exists and is not expired
     */
    function getCertificationLevel(address agent)
        external
        view
        returns (uint8 level, uint256 expiresAt, bool active);

    /**
     * @notice Check if an agent is trusted
     * @param agent Address of the agent
     * @return True if agent has active TRUSTED certification
     */
    function isTrusted(address agent) external view returns (bool);

    /**
     * @notice Get TRUSTGATE's accuracy score
     * @return evalAccuracy Evaluation accuracy rate (percentage * 100)
     * @return certAccuracy Certification accuracy rate (percentage * 100)
     * @return totalEvals Total evaluations made
     * @return totalCerts Total certifications issued
     */
    function getAccuracyScore()
        external
        view
        returns (
            uint256 evalAccuracy,
            uint256 certAccuracy,
            uint256 totalEvals,
            uint256 totalCerts
        );
}
