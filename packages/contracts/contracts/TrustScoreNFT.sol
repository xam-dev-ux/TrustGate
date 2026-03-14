// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title TrustScoreNFT
 * @notice Dynamic NFT representing agent reputation and stake
 * @dev Soulbound NFT (non-transferable) that updates based on agent performance
 *
 * Features:
 * - One NFT per agent (mapped to address)
 * - SVG generated onchain with live stats
 * - Non-transferable (soulbound)
 * - Can be used as collateral in DeFi (view-only, not transferable)
 * - Visual changes based on tier: CONDITIONAL/TRUSTED/VERIFIED
 */
contract TrustScoreNFT is ERC721, Ownable {
    using Strings for uint256;

    // ============ State Variables ============

    /// @notice Staking pool contract (authorized to update)
    address public stakingPool;

    /// @notice TrustGate registry
    address public trustgateRegistry;

    /// @notice Counter for token IDs
    uint256 private _nextTokenId;

    /// @notice Agent address to token ID mapping
    mapping(address => uint256) public agentToToken;

    /// @notice Token ID to agent address mapping
    mapping(uint256 => address) public tokenToAgent;

    /// @notice Metadata for each NFT
    mapping(uint256 => NFTMetadata) public metadata;

    // ============ Structs ============

    struct NFTMetadata {
        uint256 stakeAmount;
        uint256 jobsCompleted;
        uint256 successRate; // basis points
        uint256 totalValueDelivered;
        uint8 certificationLevel; // 0-3
        uint256 lastUpdated;
    }

    // ============ Events ============

    event NFTMinted(address indexed agent, uint256 indexed tokenId);
    event NFTUpdated(uint256 indexed tokenId, NFTMetadata metadata);

    // ============ Errors ============

    error Unauthorized();
    error AlreadyMinted();
    error NotMinted();
    error Soulbound();

    // ============ Constructor ============

    constructor(
        address _stakingPool,
        address _trustgateRegistry
    ) ERC721("TrustScore", "TRUST") Ownable(msg.sender) {
        stakingPool = _stakingPool;
        trustgateRegistry = _trustgateRegistry;
        _nextTokenId = 1; // Start from 1
    }

    // ============ Soulbound Functions ============

    /**
     * @notice Override transfer to make NFT non-transferable (soulbound)
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal virtual override returns (address) {
        address from = _ownerOf(tokenId);

        // Allow minting (from == address(0))
        // Block transfers (from != address(0) && to != address(0))
        if (from != address(0) && to != address(0)) {
            revert Soulbound();
        }

        return super._update(to, tokenId, auth);
    }

    // ============ Minting & Updating ============

    /**
     * @notice Mint or update NFT for an agent
     * @param agent Agent address
     */
    function updateOrMint(address agent) external {
        if (msg.sender != stakingPool && msg.sender != owner()) {
            revert Unauthorized();
        }

        uint256 tokenId = agentToToken[agent];

        if (tokenId == 0) {
            // Mint new NFT
            tokenId = _nextTokenId++;
            _safeMint(agent, tokenId);

            agentToToken[agent] = tokenId;
            tokenToAgent[tokenId] = agent;

            emit NFTMinted(agent, tokenId);
        }

        // Update metadata
        _updateMetadata(tokenId, agent);
    }

    /**
     * @notice Internal function to update NFT metadata
     */
    function _updateMetadata(uint256 tokenId, address agent) internal {
        // Fetch data from staking pool
        (bool success, bytes memory data) = stakingPool.call(
            abi.encodeWithSignature("agentStake(address)", agent)
        );
        uint256 stake = success ? abi.decode(data, (uint256)) : 0;

        (success, data) = stakingPool.call(
            abi.encodeWithSignature("agentStats(address)", agent)
        );

        uint256 jobsCompleted;
        uint256 jobsFailed;
        uint256 totalValueDelivered;

        if (success) {
            (jobsCompleted, jobsFailed, totalValueDelivered, , , ) = abi.decode(
                data,
                (uint256, uint256, uint256, uint256, uint256, uint256)
            );
        }

        // Calculate success rate
        uint256 successRate = 0;
        uint256 totalJobs = jobsCompleted + jobsFailed;
        if (totalJobs > 0) {
            successRate = (jobsCompleted * 10000) / totalJobs;
        }

        // Get certification level from TrustGate registry
        uint8 certLevel = 0;
        (success, data) = trustgateRegistry.call(
            abi.encodeWithSignature("getCertificationLevel(address)", agent)
        );
        if (success) {
            (certLevel, , ) = abi.decode(data, (uint8, uint256, bool));
        }

        // Update metadata
        metadata[tokenId] = NFTMetadata({
            stakeAmount: stake,
            jobsCompleted: jobsCompleted,
            successRate: successRate,
            totalValueDelivered: totalValueDelivered,
            certificationLevel: certLevel,
            lastUpdated: block.timestamp
        });

        emit NFTUpdated(tokenId, metadata[tokenId]);
    }

    // ============ View Functions ============

    /**
     * @notice Get token URI with onchain SVG
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);

        NFTMetadata memory meta = metadata[tokenId];
        address agent = tokenToAgent[tokenId];

        string memory svg = _generateSVG(tokenId, agent, meta);
        string memory json = _generateJSON(tokenId, agent, meta, svg);

        return string(abi.encodePacked("data:application/json;base64,", Base64.encode(bytes(json))));
    }

    /**
     * @notice Generate SVG for NFT
     */
    function _generateSVG(
        uint256 tokenId,
        address agent,
        NFTMetadata memory meta
    ) internal pure returns (string memory) {
        // Determine tier and colors
        (string memory tier, string memory primaryColor, string memory accentColor) = _getTierColors(
            meta.certificationLevel,
            meta.stakeAmount
        );

        // Format numbers
        string memory stakeFormatted = _formatUSDC(meta.stakeAmount);
        string memory valueFormatted = _formatUSDC(meta.totalValueDelivered);
        string memory successRateFormatted = string(
            abi.encodePacked((meta.successRate / 100).toString(), ".", (meta.successRate % 100).toString(), "%")
        );

        return
            string(
                abi.encodePacked(
                    '<svg width="400" height="600" viewBox="0 0 400 600" xmlns="http://www.w3.org/2000/svg">',
                    '<defs>',
                    '<linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">',
                    '<stop offset="0%" style="stop-color:#050505"/>',
                    '<stop offset="100%" style="stop-color:#0f0f0f"/>',
                    '</linearGradient>',
                    '<linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">',
                    '<stop offset="0%" style="stop-color:',
                    primaryColor,
                    '"/>',
                    '<stop offset="100%" style="stop-color:',
                    accentColor,
                    '"/>',
                    '</linearGradient>',
                    '</defs>',
                    _generateSVGBody(tier, stakeFormatted, successRateFormatted, valueFormatted, meta.jobsCompleted),
                    "</svg>"
                )
            );
    }

    function _generateSVGBody(
        string memory tier,
        string memory stake,
        string memory successRate,
        string memory totalValue,
        uint256 jobs
    ) internal pure returns (string memory) {
        return
            string(
                abi.encodePacked(
                    '<rect width="400" height="600" fill="url(#bg)"/>',
                    '<rect x="2" y="2" width="396" height="596" fill="none" stroke="url(#accent)" stroke-width="4" rx="20"/>',
                    // Title
                    '<text x="200" y="60" font-family="monospace" font-size="32" font-weight="bold" fill="url(#accent)" text-anchor="middle">TRUSTSCORE</text>',
                    // Tier badge
                    '<rect x="120" y="80" width="160" height="50" fill="url(#accent)" rx="10"/>',
                    '<text x="200" y="113" font-family="monospace" font-size="24" font-weight="bold" fill="#050505" text-anchor="middle">',
                    tier,
                    "</text>",
                    // Stats
                    '<text x="50" y="180" font-family="monospace" font-size="16" fill="#6b7280">STAKE</text>',
                    '<text x="50" y="210" font-family="monospace" font-size="28" font-weight="bold" fill="#fafafa">',
                    stake,
                    "</text>",
                    '<text x="50" y="270" font-family="monospace" font-size="16" fill="#6b7280">SUCCESS RATE</text>',
                    '<text x="50" y="300" font-family="monospace" font-size="28" font-weight="bold" fill="url(#accent)">',
                    successRate,
                    "</text>",
                    '<text x="50" y="360" font-family="monospace" font-size="16" fill="#6b7280">JOBS COMPLETED</text>',
                    '<text x="50" y="390" font-family="monospace" font-size="28" font-weight="bold" fill="#fafafa">',
                    jobs.toString(),
                    "</text>",
                    '<text x="50" y="450" font-family="monospace" font-size="16" fill="#6b7280">TOTAL VALUE</text>',
                    '<text x="50" y="480" font-family="monospace" font-size="28" font-weight="bold" fill="#fafafa">',
                    totalValue,
                    "</text>",
                    // Footer
                    '<text x="200" y="560" font-family="monospace" font-size="12" fill="#6b7280" text-anchor="middle">TRUSTGATE PROTOCOL</text>',
                    '<text x="200" y="580" font-family="monospace" font-size="10" fill="#6b7280" text-anchor="middle">BASE MAINNET</text>'
                )
            );
    }

    function _getTierColors(
        uint8 certLevel,
        uint256 stake
    ) internal pure returns (string memory tier, string memory primary, string memory accent) {
        if (stake >= 10000 * 1e6) {
            return ("VERIFIED", "#8b5cf6", "#ec4899"); // Purple/Pink
        } else if (certLevel >= 2) {
            return ("TRUSTED", "#10b981", "#06b6d4"); // Green/Cyan
        } else if (certLevel >= 1) {
            return ("CONDITIONAL", "#f59e0b", "#ef4444"); // Amber/Red
        } else {
            return ("UNVERIFIED", "#6b7280", "#9ca3af"); // Gray
        }
    }

    function _formatUSDC(uint256 amount) internal pure returns (string memory) {
        if (amount == 0) return "0 USDC";

        uint256 dollars = amount / 1e6;
        if (dollars >= 1000000) {
            return string(abi.encodePacked((dollars / 1000000).toString(), "M USDC"));
        } else if (dollars >= 1000) {
            return string(abi.encodePacked((dollars / 1000).toString(), "K USDC"));
        } else {
            return string(abi.encodePacked(dollars.toString(), " USDC"));
        }
    }

    function _generateJSON(
        uint256 tokenId,
        address agent,
        NFTMetadata memory meta,
        string memory svg
    ) internal pure returns (string memory) {
        return
            string(
                abi.encodePacked(
                    '{"name":"TrustScore #',
                    tokenId.toString(),
                    '","description":"Dynamic reputation NFT for AI agent ',
                    _addressToString(agent),
                    '","image":"data:image/svg+xml;base64,',
                    Base64.encode(bytes(svg)),
                    '","attributes":[',
                    '{"trait_type":"Stake","value":"',
                    _formatUSDC(meta.stakeAmount),
                    '"},',
                    '{"trait_type":"Success Rate","value":"',
                    (meta.successRate / 100).toString(),
                    '.',
                    (meta.successRate % 100).toString(),
                    '%"},',
                    '{"trait_type":"Jobs Completed","value":',
                    meta.jobsCompleted.toString(),
                    '},',
                    '{"trait_type":"Total Value Delivered","value":"',
                    _formatUSDC(meta.totalValueDelivered),
                    '"},',
                    '{"trait_type":"Certification Level","value":',
                    uint256(meta.certificationLevel).toString(),
                    "}]}"
                )
            );
    }

    function _addressToString(address _addr) internal pure returns (string memory) {
        bytes memory alphabet = "0123456789abcdef";
        bytes20 value = bytes20(_addr);
        bytes memory str = new bytes(42);
        str[0] = "0";
        str[1] = "x";
        for (uint256 i = 0; i < 20; i++) {
            str[2 + i * 2] = alphabet[uint8(value[i] >> 4)];
            str[3 + i * 2] = alphabet[uint8(value[i] & 0x0f)];
        }
        return string(str);
    }

    // ============ Admin Functions ============

    function setStakingPool(address _stakingPool) external onlyOwner {
        stakingPool = _stakingPool;
    }

    function setTrustgateRegistry(address _registry) external onlyOwner {
        trustgateRegistry = _registry;
    }
}
