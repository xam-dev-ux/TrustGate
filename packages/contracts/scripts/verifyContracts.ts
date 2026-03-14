import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import axios from "axios";
import * as fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";

dotenv.config();

const execAsync = promisify(exec);

async function flattenContract(contractPath: string): Promise<string> {
  const { stdout } = await execAsync(`npx hardhat flatten ${contractPath}`);
  // Remove duplicate SPDX license identifiers
  const lines = stdout.split("\n");
  const seenLicense = new Set<string>();
  const filtered = lines.filter((line) => {
    if (line.includes("SPDX-License-Identifier")) {
      if (seenLicense.has(line.trim())) {
        return false;
      }
      seenLicense.add(line.trim());
    }
    return true;
  });
  return filtered.join("\n");
}

async function verifyContract(
  contractAddress: string,
  contractName: string,
  contractPath: string,
  constructorArgs: any[]
) {
  console.log(`\nVerifying ${contractName} at ${contractAddress}...`);

  // Flatten the contract
  const sourceCode = await flattenContract(contractPath);

  // Encode constructor arguments
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  let encodedArgs = "";

  if (constructorArgs.length > 0) {
    // Get the contract factory to get constructor ABI
    const factory = await ethers.getContractFactory(contractName);
    const constructor = factory.interface.deploy;

    // Encode using the fragment
    const encoded = abiCoder.encode(
      constructor.inputs.map((input) => input.type),
      constructorArgs
    );
    encodedArgs = encoded.slice(2); // Remove 0x prefix
  }

  // Prepare verification request
  const params = new URLSearchParams({
    apikey: process.env.BASESCAN_API_KEY || "",
    module: "contract",
    action: "verifysourcecode",
    contractaddress: contractAddress,
    sourceCode: sourceCode,
    codeformat: "solidity-single-file",
    contractname: `contracts/${contractPath.split("/").pop()}:${contractName}`,
    compilerversion: "v0.8.24+commit.e11b9ed9",
    optimizationUsed: "1",
    runs: "200",
    constructorArguements: encodedArgs,
    evmversion: "cancun",
    licenseType: "3", // MIT
  });

  try {
    const response = await axios.post(
      "https://api.basescan.org/v2/api",
      params.toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    console.log("Response:", response.data);

    if (response.data.status === "1") {
      const guid = response.data.result;
      console.log(`✓ Verification submitted. GUID: ${guid}`);

      // Check status
      await checkVerificationStatus(guid);
    } else {
      console.log(`✗ Verification failed: ${response.data.result}`);
    }
  } catch (error: any) {
    console.error(`✗ Error:`, error.message);
  }
}

async function checkVerificationStatus(guid: string) {
  console.log("Checking verification status...");

  for (let i = 0; i < 10; i++) {
    await new Promise((resolve) => setTimeout(resolve, 3000));

    try {
      const response = await axios.get("https://api.basescan.org/v2/api", {
        params: {
          apikey: process.env.BASESCAN_API_KEY,
          module: "contract",
          action: "checkverifystatus",
          guid: guid,
        },
      });

      console.log(`  [${i + 1}/10] ${response.data.result}`);

      if (response.data.status === "1") {
        console.log("✓ Verification successful!");
        return;
      } else if (response.data.result.includes("Fail")) {
        console.log("✗ Verification failed:", response.data.result);
        return;
      }
    } catch (error: any) {
      console.error("  Error checking status:", error.message);
    }
  }

  console.log("Verification pending, check Basescan manually");
}

async function main() {
  const operatorAddress = new ethers.Wallet(
    process.env.OPERATOR_PRIVATE_KEY || ""
  ).address;
  const treasuryAddress = process.env.TREASURY_ADDRESS || "";
  const usdcAddress = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  const trustgateAddress = process.env.CONTRACT_ADDRESS || "";
  const nftAddress = process.env.TRUSTSCORE_NFT_ADDRESS || "";

  // 1. Verify TrustGateRegistry
  await verifyContract(
    trustgateAddress,
    "TrustGateRegistry",
    "contracts/TrustGateRegistry.sol",
    [
      usdcAddress,
      operatorAddress,
      treasuryAddress,
      ethers.parseUnits("0.10", 6), // 100000
    ]
  );

  // 2. Verify TrustScoreNFT
  await verifyContract(
    nftAddress,
    "TrustScoreNFT",
    "contracts/TrustScoreNFT.sol",
    [ethers.ZeroAddress, trustgateAddress]
  );

  // 3. Verify StakingPool
  const poolAddress = process.env.STAKING_POOL_ADDRESS || "";
  const minConditional = parseFloat(process.env.STAKE_MIN_CONDITIONAL || "0.1") * 1e6;
  const minTrusted = parseFloat(process.env.STAKE_MIN_TRUSTED || "1") * 1e6;
  const minVerified = parseFloat(process.env.STAKE_MIN_VERIFIED || "10") * 1e6;
  const leverage = parseInt(process.env.STAKE_LEVERAGE_MULTIPLIER || "5");

  await verifyContract(
    poolAddress,
    "TrustGateStakingPool",
    "contracts/TrustGateStakingPool.sol",
    [
      usdcAddress,
      trustgateAddress,
      nftAddress,
      treasuryAddress,
      minConditional,
      minTrusted,
      minVerified,
      leverage,
    ]
  );

  console.log("\n=================================");
  console.log("VERIFICATION COMPLETE");
  console.log("=================================");
  console.log("Check contracts on Basescan:");
  console.log(`https://basescan.org/address/${trustgateAddress}#code`);
  console.log(`https://basescan.org/address/${nftAddress}#code`);
  console.log(`https://basescan.org/address/${poolAddress}#code`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
