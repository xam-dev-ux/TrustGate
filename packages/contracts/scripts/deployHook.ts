import { ethers, run } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("Deploying TrustGateHook to Base mainnet...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH\n");

  // Get TrustGateRegistry address from env
  const trustgateAddress = process.env.CONTRACT_ADDRESS;
  if (!trustgateAddress) {
    throw new Error("CONTRACT_ADDRESS not set in .env");
  }

  // Minimum level: 2 = TRUSTED (most common use case)
  // Can be 0=UNVERIFIED, 1=CONDITIONAL, 2=TRUSTED, 3=FLAGGED
  const minimumLevel = process.env.HOOK_MINIMUM_LEVEL || "2";

  const levelNames = ["UNVERIFIED", "CONDITIONAL", "TRUSTED", "FLAGGED"];
  console.log("Configuration:");
  console.log("  TrustGate Registry:", trustgateAddress);
  console.log("  Minimum Level:", levelNames[parseInt(minimumLevel)], `(${minimumLevel})`);
  console.log("");

  // Deploy hook
  const TrustGateHook = await ethers.getContractFactory("TrustGateHook");
  const hook = await TrustGateHook.deploy(trustgateAddress, parseInt(minimumLevel));

  await hook.waitForDeployment();
  const hookAddress = await hook.getAddress();

  console.log("TrustGateHook deployed to:", hookAddress);
  console.log("Transaction hash:", hook.deploymentTransaction()?.hash, "\n");

  // Wait for confirmations
  console.log("Waiting for block confirmations...");
  await hook.deploymentTransaction()?.wait(5);

  // Verify on Basescan
  if (process.env.BASESCAN_API_KEY) {
    console.log("\nVerifying contract on Basescan...");
    try {
      await run("verify:verify", {
        address: hookAddress,
        constructorArguments: [trustgateAddress, parseInt(minimumLevel)],
      });
      console.log("Contract verified successfully!");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("Contract already verified");
      } else {
        console.error("Verification failed:", error.message);
      }
    }
  }

  // Test hook
  console.log("\nTesting hook...");
  try {
    const requirements = await hook.getRequirements();
    console.log("Hook requirements:");
    console.log("  TrustGate:", requirements[0]);
    console.log("  Minimum Level:", requirements[2]);

    const accuracy = await hook.getTrustgateAccuracy();
    console.log("\nTrustGate Accuracy:");
    console.log("  Evaluation:", (Number(accuracy[0]) / 100).toFixed(2), "%");
    console.log("  Certification:", (Number(accuracy[1]) / 100).toFixed(2), "%");
  } catch (error: any) {
    console.error("Hook test failed:", error.message);
  }

  // Save deployment info
  console.log("\n=================================");
  console.log("DEPLOYMENT SUMMARY");
  console.log("=================================");
  console.log("Hook Address:", hookAddress);
  console.log("TrustGate Registry:", trustgateAddress);
  console.log("Minimum Level:", levelNames[parseInt(minimumLevel)]);
  console.log("Basescan:", `https://basescan.org/address/${hookAddress}`);
  console.log("=================================\n");

  console.log("To use this hook in an ERC-8183 job:");
  console.log(`  hookAddress: "${hookAddress}"`);
  console.log("\nAdd to evaluator.json:");
  console.log(`  "hookContract": "${hookAddress}"`);
  console.log("\nUpdate SKILL.md with hook address");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
