/**
 * Register TRUSTGATE in ERC-8004 Registry
 * Simple registration with agentURI pointing to agent-registration.json
 */

import { ethers } from "ethers";
import * as dotenv from "dotenv";

dotenv.config();

// ERC-8004 Registry on Base mainnet
const ERC8004_REGISTRY = "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432";

// Minimal ERC-8004 Registry ABI (simple version)
const REGISTRY_ABI = [
  "function register(string agentURI) returns (uint256)",
  "event Registered(uint256 indexed agentId, string agentURI, address indexed owner)",
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

  console.log(`Wallet: ${signer.address}`);
  console.log(`Registry: ${ERC8004_REGISTRY}`);
  console.log(`Chain: Base Mainnet (8453)\n`);

  // Check balance
  const balance = await provider.getBalance(signer.address);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH`);

  if (balance === 0n) {
    throw new Error("Wallet has no ETH for gas");
  }

  // Agent URI
  const agentURI = process.env.AGENT_URI ||
    "https://trustgateagent-production.up.railway.app/.well-known/agent-registration.json";

  console.log(`\nRegistering with URI: ${agentURI}\n`);

  // Estimate gas
  console.log("Estimating gas...");
  try {
    const gasEstimate = await registry.register.estimateGas(agentURI);
    const feeData = await provider.getFeeData();
    const gasCost = gasEstimate * (feeData.gasPrice || 0n);
    const gasCostEth = Number(gasCost) / 1e18;

    console.log(`Gas estimate: ${gasEstimate.toString()}`);
    console.log(`Gas cost: ~${gasCostEth.toFixed(6)} ETH`);
    console.log();
  } catch (error: any) {
    console.error("Gas estimation failed:", error.message);
    console.log("Attempting registration anyway...\n");
  }

  // Register
  console.log("Registering agent...");
  const tx = await registry.register(agentURI);

  console.log(`Transaction sent: ${tx.hash}`);
  console.log(`Basescan: https://basescan.org/tx/${tx.hash}`);
  console.log("\nWaiting for confirmation...");

  const receipt = await tx.wait();

  console.log(`\n✓ Confirmed in block ${receipt.blockNumber}`);
  console.log(`Gas used: ${receipt.gasUsed.toString()}`);

  // Parse event to get agent ID
  let agentId = "?";
  for (const log of receipt.logs) {
    try {
      const parsed = registry.interface.parseLog({
        topics: log.topics as string[],
        data: log.data,
      });
      if (parsed?.name === "Registered") {
        agentId = parsed.args.agentId.toString();
      }
    } catch {}
  }

  console.log("\n=================================");
  console.log("✓ REGISTRATION SUCCESSFUL");
  console.log("=================================");
  console.log(`Agent ID: #${agentId}`);
  console.log(`Owner: ${signer.address}`);
  console.log(`URI: ${agentURI}`);
  console.log(`TX: https://basescan.org/tx/${receipt.hash}`);

  console.log("\nNext steps:");
  console.log("1. ✓ Registered in ERC-8004");
  console.log("2. → Verify JSON is accessible:");
  console.log(`   ${agentURI}`);
  console.log("3. → Verify SKILL.md is accessible:");
  console.log(`   https://trustgateagent-production.up.railway.app/.well-known/SKILL.md`);
  console.log("4. → Announce on Farcaster/X");
  console.log();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n✗ Error:", error.message);
    if (error.code) {
      console.error("Error code:", error.code);
    }
    process.exit(1);
  });
