import { ethers, run } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("=================================");
  console.log("Deploying TrustGate Staking System");
  console.log("=================================\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH\n");

  // Get addresses
  const usdcAddress = process.env.USDC_ADDRESS || "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // Base mainnet USDC
  const trustgateAddress = process.env.CONTRACT_ADDRESS;
  const treasuryAddress = process.env.TREASURY_ADDRESS || deployer.address;

  if (!trustgateAddress) {
    throw new Error("CONTRACT_ADDRESS not set");
  }

  // Get configurable staking parameters (in USDC, will be converted to 6 decimals)
  const minConditional = parseFloat(process.env.STAKE_MIN_CONDITIONAL || "0.1") * 1e6; // Default 0.1 USDC
  const minTrusted = parseFloat(process.env.STAKE_MIN_TRUSTED || "1") * 1e6; // Default 1 USDC
  const minVerified = parseFloat(process.env.STAKE_MIN_VERIFIED || "10") * 1e6; // Default 10 USDC
  const leverageMultiplier = parseInt(process.env.STAKE_LEVERAGE_MULTIPLIER || "5"); // Default 5x

  console.log("Configuration:");
  console.log("  USDC:", usdcAddress);
  console.log("  TrustGate:", trustgateAddress);
  console.log("  Treasury:", treasuryAddress);
  console.log("\nStaking Parameters:");
  console.log("  Min CONDITIONAL:", minConditional / 1e6, "USDC");
  console.log("  Min TRUSTED:", minTrusted / 1e6, "USDC");
  console.log("  Min VERIFIED:", minVerified / 1e6, "USDC");
  console.log("  Leverage:", leverageMultiplier + "x");
  console.log("");

  // 1. Deploy TrustScoreNFT
  console.log("1. Deploying TrustScoreNFT...");
  const TrustScoreNFT = await ethers.getContractFactory("TrustScoreNFT");
  const nft = await TrustScoreNFT.deploy(
    ethers.ZeroAddress, // stakingPool - will set after
    trustgateAddress
  );
  await nft.waitForDeployment();
  const nftAddress = await nft.getAddress();
  console.log("   TrustScoreNFT:", nftAddress);

  // 2. Deploy StakingPool
  console.log("\n2. Deploying TrustGateStakingPool...");
  const StakingPool = await ethers.getContractFactory("TrustGateStakingPool");
  const pool = await StakingPool.deploy(
    usdcAddress,
    trustgateAddress,
    nftAddress,
    treasuryAddress,
    minConditional,
    minTrusted,
    minVerified,
    leverageMultiplier
  );
  await pool.waitForDeployment();
  const poolAddress = await pool.getAddress();
  console.log("   StakingPool:", poolAddress);

  // 3. Update NFT with pool address
  console.log("\n3. Configuring TrustScoreNFT...");
  await nft.setStakingPool(poolAddress);
  console.log("   NFT configured");

  // Wait for confirmations
  console.log("\nWaiting for block confirmations...");
  await pool.deploymentTransaction()?.wait(5);

  // Verify
  if (process.env.BASESCAN_API_KEY) {
    console.log("\nVerifying contracts...");

    try {
      await run("verify:verify", {
        address: nftAddress,
        constructorArguments: [ethers.ZeroAddress, trustgateAddress],
      });
    } catch (e: any) {
      console.log("NFT verification:", e.message);
    }

    try {
      await run("verify:verify", {
        address: poolAddress,
        constructorArguments: [
          usdcAddress,
          trustgateAddress,
          nftAddress,
          treasuryAddress,
          minConditional,
          minTrusted,
          minVerified,
          leverageMultiplier,
        ],
      });
    } catch (e: any) {
      console.log("Pool verification:", e.message);
    }
  }

  console.log("\n=================================");
  console.log("DEPLOYMENT COMPLETE");
  console.log("=================================");
  console.log("TrustScoreNFT:", nftAddress);
  console.log("StakingPool:", poolAddress);
  console.log("=================================");
  console.log("\nAdd to .env:");
  console.log(`STAKING_POOL_ADDRESS=${poolAddress}`);
  console.log(`TRUSTSCORE_NFT_ADDRESS=${nftAddress}`);
  console.log("\nBasescan:");
  console.log(`https://basescan.org/address/${poolAddress}`);
  console.log(`https://basescan.org/address/${nftAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
