/**
 * Register TRUSTGATE agent in ERC-8004 Registry
 *
 * This makes TRUSTGATE discoverable by other agents
 */

import { ethers } from "ethers";
import * as dotenv from "dotenv";

dotenv.config();

// ERC-8004 Registry on Base mainnet
const ERC8004_REGISTRY = process.env.ERC8004_REGISTRY_ADDRESS || "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432";

// Minimal ERC-8004 Registry ABI
const REGISTRY_ABI = [
  "function registerAgent(string name, string[] skills, string endpoint, bytes metadata) external",
  "function getAgent(address agentAddress) external view returns (tuple(string name, string[] skills, string endpoint, bytes metadata, uint256 registeredAt, bool active))",
  "function isRegistered(address agentAddress) external view returns (bool)",
];

async function main() {
  console.log("=================================");
  console.log("TRUSTGATE ERC-8004 Registration");
  console.log("=================================\n");

  // Setup
  const rpcUrl = process.env.RPC_URL || "https://mainnet.base.org";
  const operatorKey = process.env.OPERATOR_PRIVATE_KEY;

  if (!operatorKey) {
    throw new Error("OPERATOR_PRIVATE_KEY not set");
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const signer = new ethers.Wallet(operatorKey, provider);
  const registry = new ethers.Contract(ERC8004_REGISTRY, REGISTRY_ABI, signer);

  console.log(`Registering agent: ${signer.address}`);
  console.log(`Registry: ${ERC8004_REGISTRY}`);
  console.log(`Chain: Base Mainnet (8453)\n`);

  // Check if already registered
  const isRegistered = await registry.isRegistered(signer.address);

  if (isRegistered) {
    console.log("⚠️  Agent already registered!");
    console.log("\nFetching existing registration...");

    const agent = await registry.getAgent(signer.address);
    console.log("\nCurrent Registration:");
    console.log("Name:", agent.name);
    console.log("Skills:", agent.skills);
    console.log("Endpoint:", agent.endpoint);
    console.log("Registered At:", new Date(Number(agent.registeredAt) * 1000).toISOString());
    console.log("Active:", agent.active);

    console.log("\n✓ Already registered. No action needed.");
    return;
  }

  // Registration data
  const agentName = "TRUSTGATE";
  const skills = [
    "certification",
    "evaluation",
    "risk-assessment",
    "reputation-tracking",
    "job-prediction",
    "batch-verification",
  ];
  const endpoint = process.env.API_ENDPOINT || "https://trustgateagent-production.up.railway.app";

  // Metadata (optional JSON)
  const metadata = {
    version: "1.0.0",
    description: "Onchain agent certification and evaluation service",
    website: "https://trustgate.vercel.app",
    contract: process.env.CONTRACT_ADDRESS,
    accuracy: {
      evaluations: 100,
      certifications: 0,
    },
    pricing: {
      certification: "0.10 USDC",
      evaluation: "0.05 USDC",
      batch: "0.001 USDC per agent (after 5)",
    },
  };

  const metadataBytes = ethers.toUtf8Bytes(JSON.stringify(metadata));

  console.log("Registration Details:");
  console.log("─────────────────────");
  console.log("Name:", agentName);
  console.log("Skills:", skills.join(", "));
  console.log("Endpoint:", endpoint);
  console.log("Metadata:", JSON.stringify(metadata, null, 2));
  console.log();

  // Estimate gas
  console.log("Estimating gas...");
  const gasEstimate = await registry.registerAgent.estimateGas(
    agentName,
    skills,
    endpoint,
    metadataBytes
  );

  const feeData = await provider.getFeeData();
  const gasCost = gasEstimate * (feeData.gasPrice || 0n);
  const gasCostEth = Number(gasCost) / 1e18;

  console.log(`Gas estimate: ${gasEstimate.toString()}`);
  console.log(`Gas cost: ~${gasCostEth.toFixed(6)} ETH (~$${(gasCostEth * 3500).toFixed(2)})`);
  console.log();

  // Register
  console.log("Registering agent...");
  const tx = await registry.registerAgent(agentName, skills, endpoint, metadataBytes);

  console.log(`Transaction sent: ${tx.hash}`);
  console.log(`Basescan: https://basescan.org/tx/${tx.hash}`);
  console.log("\nWaiting for confirmation...");

  const receipt = await tx.wait();

  console.log(`\n✓ Confirmed in block ${receipt.blockNumber}`);
  console.log(`Gas used: ${receipt.gasUsed.toString()}`);

  // Verify registration
  console.log("\nVerifying registration...");
  const agent = await registry.getAgent(signer.address);

  console.log("\n✓ Registration successful!");
  console.log("─────────────────────────────");
  console.log("Agent:", signer.address);
  console.log("Name:", agent.name);
  console.log("Skills:", agent.skills.join(", "));
  console.log("Endpoint:", agent.endpoint);
  console.log("Active:", agent.active);

  console.log("\n=================================");
  console.log("TRUSTGATE is now discoverable!");
  console.log("=================================");
  console.log("\nNext steps:");
  console.log("1. ✓ Registered in ERC-8004");
  console.log("2. → Verify SKILL.md is accessible:");
  console.log(`   ${endpoint}/.well-known/SKILL.md`);
  console.log("3. → Announce on Farcaster/X");
  console.log("4. → Create example hooks using TRUSTGATE");
  console.log();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n✗ Error:", error.message);
    process.exit(1);
  });
