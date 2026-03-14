// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IERC8004Registry
 * @notice Interface for ERC-8004 Agent Registry
 * @dev External interface that TRUSTGATE reads to verify agent registration
 */
interface IERC8004Registry {
    /**
     * @notice Check if an agent is registered
     * @param agent Address of the agent
     * @return True if registered
     */
    function isRegistered(address agent) external view returns (bool);

    /**
     * @notice Get agent details
     * @param agent Address of the agent
     * @return name Agent name/basename
     * @return endpoint Agent endpoint URL
     * @return publicKey Agent public key
     * @return registeredAt Registration timestamp
     */
    function getAgent(address agent)
        external
        view
        returns (
            string memory name,
            string memory endpoint,
            bytes memory publicKey,
            uint256 registeredAt
        );
}
