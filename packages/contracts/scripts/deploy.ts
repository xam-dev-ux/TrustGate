import { ethers, run } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("Deploying TrustGateRegistry to Base mainnet...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH\n");

  // Base mainnet USDC
  const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

  // Get operator and treasury from env
  const operatorAddress = process.env.OPERATOR_PRIVATE_KEY
    ? new ethers.Wallet(process.env.OPERATOR_PRIVATE_KEY).address
    : deployer.address;

  const treasuryAddress = process.env.TREASURY_ADDRESS || deployer.address;

  // Certification fee: 0.10 USDC (6 decimals)
  const certificationFee = ethers.parseUnits("0.10", 6);

  console.log("Configuration:");
  console.log("  USDC:", USDC_ADDRESS);
  console.log("  Operator:", operatorAddress);
  console.log("  Treasury:", treasuryAddress);
  console.log("  Certification Fee:", "0.10 USDC\n");

  // Deploy contract
  const TrustGateRegistry = await ethers.getContractFactory("TrustGateRegistry");
  const trustgate = await TrustGateRegistry.deploy(
    USDC_ADDRESS,
    operatorAddress,
    treasuryAddress,
    certificationFee
  );

  await trustgate.waitForDeployment();
  const contractAddress = await trustgate.getAddress();

  console.log("TrustGateRegistry deployed to:", contractAddress);
  console.log("Transaction hash:", trustgate.deploymentTransaction()?.hash, "\n");

  // Wait for a few block confirmations
  console.log("Waiting for block confirmations...");
  await trustgate.deploymentTransaction()?.wait(5);

  // Verify on Basescan
  if (process.env.BASESCAN_API_KEY) {
    console.log("\nVerifying contract on Basescan...");
    try {
      await run("verify:verify", {
        address: contractAddress,
        constructorArguments: [
          USDC_ADDRESS,
          operatorAddress,
          treasuryAddress,
          certificationFee,
        ],
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

  // Save deployment info
  console.log("\n=================================");
  console.log("DEPLOYMENT SUMMARY");
  console.log("=================================");
  console.log("Contract Address:", contractAddress);
  console.log("Operator:", operatorAddress);
  console.log("Treasury:", treasuryAddress);
  console.log("Certification Fee:", "0.10 USDC");
  console.log("Basescan:", `https://basescan.org/address/${contractAddress}`);
  console.log("=================================\n");

  console.log("Add this to your .env files:");
  console.log(`CONTRACT_ADDRESS=${contractAddress}`);
  console.log(`VITE_CONTRACT_ADDRESS=${contractAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
