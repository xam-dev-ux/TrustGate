import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import axios from "axios";
import * as fs from "fs";
import FormData from "form-data";

dotenv.config();

async function verifySourcify(
  contractAddress: string,
  contractName: string,
  chainId: number = 8453
) {
  console.log(`\nVerifying ${contractName} at ${contractAddress} on Sourcify...`);

  try {
    // Get the build info from hardhat artifacts
    const artifactsPath = `./artifacts/contracts/${contractName}.sol`;
    const contractPath = `./contracts/${contractName}.sol`;

    // Read the contract source
    const source = fs.readFileSync(contractPath, "utf8");

    // Read the artifact
    const artifact = JSON.parse(
      fs.readFileSync(`${artifactsPath}/${contractName}.json`, "utf8")
    );

    // Prepare metadata
    const metadata = JSON.stringify(artifact.metadata || {});

    // Create form data
    const form = new FormData();
    form.append("address", contractAddress);
    form.append("chain", chainId.toString());
    form.append("files", source, `${contractName}.sol`);
    if (metadata && metadata !== "{}") {
      form.append("files", metadata, "metadata.json");
    }

    // Submit to Sourcify
    const response = await axios.post(
      "https://sourcify.dev/server/verify",
      form,
      {
        headers: {
          ...form.getHeaders(),
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      }
    );

    console.log("✓ Sourcify Response:", response.data);

    if (response.data.result) {
      const status = response.data.result[0]?.status;
      if (status === "perfect" || status === "partial") {
        console.log(`✓ Verified successfully with ${status} match!`);
        console.log(
          `  View on Sourcify: https://repo.sourcify.dev/contracts/full_match/${chainId}/${contractAddress}/`
        );
        return true;
      }
    }

    return false;
  } catch (error: any) {
    console.error("✗ Sourcify verification error:", error.response?.data || error.message);
    return false;
  }
}

async function main() {
  const chainId = 8453; // Base mainnet

  console.log("=================================");
  console.log("Verifying Contracts on Sourcify");
  console.log("=================================\n");

  const contracts = [
    {
      address: process.env.CONTRACT_ADDRESS || "",
      name: "TrustGateRegistry",
    },
    {
      address: process.env.TRUSTSCORE_NFT_ADDRESS || "",
      name: "TrustScoreNFT",
    },
    {
      address: process.env.STAKING_POOL_ADDRESS || "",
      name: "TrustGateStakingPool",
    },
  ];

  let successCount = 0;

  for (const contract of contracts) {
    if (!contract.address) {
      console.log(`⚠ Skipping ${contract.name} - address not set`);
      continue;
    }

    const success = await verifySourcify(contract.address, contract.name, chainId);
    if (success) successCount++;

    // Wait between requests
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  console.log("\n=================================");
  console.log(`Verified ${successCount}/${contracts.length} contracts on Sourcify`);
  console.log("=================================");

  // Now try Basescan with hardhat-verify one more time
  console.log("\nAttempting Basescan verification with hardhat-verify...\n");

  for (const contract of contracts) {
    if (!contract.address) continue;

    try {
      console.log(`Verifying ${contract.name} on Basescan...`);
      const { run } = require("hardhat");

      let constructorArgs: any[] = [];

      if (contract.name === "TrustGateRegistry") {
        const operatorAddress = new ethers.Wallet(
          process.env.OPERATOR_PRIVATE_KEY || ""
        ).address;
        constructorArgs = [
          "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC
          operatorAddress,
          process.env.TREASURY_ADDRESS || "",
          ethers.parseUnits("0.10", 6),
        ];
      } else if (contract.name === "TrustScoreNFT") {
        constructorArgs = [
          ethers.ZeroAddress,
          process.env.CONTRACT_ADDRESS || "",
        ];
      } else if (contract.name === "TrustGateStakingPool") {
        const minConditional = parseFloat(process.env.STAKE_MIN_CONDITIONAL || "0.1") * 1e6;
        const minTrusted = parseFloat(process.env.STAKE_MIN_TRUSTED || "1") * 1e6;
        const minVerified = parseFloat(process.env.STAKE_MIN_VERIFIED || "10") * 1e6;
        const leverage = parseInt(process.env.STAKE_LEVERAGE_MULTIPLIER || "5");

        constructorArgs = [
          "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
          process.env.CONTRACT_ADDRESS || "",
          process.env.TRUSTSCORE_NFT_ADDRESS || "",
          process.env.TREASURY_ADDRESS || "",
          minConditional,
          minTrusted,
          minVerified,
          leverage,
        ];
      }

      await run("verify:verify", {
        address: contract.address,
        constructorArguments: constructorArgs,
      });

      console.log(`✓ ${contract.name} verified on Basescan!\n`);
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log(`✓ ${contract.name} already verified on Basescan!\n`);
      } else {
        console.log(`⚠ ${contract.name} Basescan verification:`, error.message.split('\n')[0], "\n");
      }
    }
  }

  console.log("\n=================================");
  console.log("VERIFICATION COMPLETE");
  console.log("=================================");
  console.log("\nCheck contracts:");
  console.log("Basescan:");
  contracts.forEach((c) => {
    if (c.address) {
      console.log(`  https://basescan.org/address/${c.address}#code`);
    }
  });
  console.log("\nSourcify:");
  contracts.forEach((c) => {
    if (c.address) {
      console.log(`  https://repo.sourcify.dev/contracts/full_match/8453/${c.address}/`);
    }
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
