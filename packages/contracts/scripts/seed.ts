import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("Seeding TrustGateRegistry with example data...\n");

  const contractAddress = process.env.CONTRACT_ADDRESS;
  if (!contractAddress) {
    throw new Error("CONTRACT_ADDRESS not set in .env");
  }

  // Use operator key for seeding (operator can call recordCertification/recordEvaluation)
  const operatorKey = process.env.OPERATOR_PRIVATE_KEY;
  if (!operatorKey) {
    throw new Error("OPERATOR_PRIVATE_KEY not set in .env");
  }

  const provider = ethers.provider;
  const operator = new ethers.Wallet(operatorKey, provider);
  console.log("Seeding with account (operator):", operator.address);

  const trustgate = await ethers.getContractAt("TrustGateRegistry", contractAddress, operator);

  // Example agents to certify
  const exampleAgents = [
    {
      address: "0x1111111111111111111111111111111111111111",
      level: 2, // TRUSTED
      score: 95,
      basename: "flashoracle.base.eth",
    },
    {
      address: "0x2222222222222222222222222222222222222222",
      level: 2, // TRUSTED
      score: 88,
      basename: "tradingbot.base.eth",
    },
    {
      address: "0x3333333333333333333333333333333333333333",
      level: 1, // CONDITIONAL
      score: 72,
      basename: "databot.base.eth",
    },
    {
      address: "0x4444444444444444444444444444444444444444",
      level: 1, // CONDITIONAL
      score: 65,
      basename: "helperbot.base.eth",
    },
    {
      address: "0x5555555555555555555555555555555555555555",
      level: 0, // UNVERIFIED
      score: 45,
      basename: "newbot.base.eth",
    },
    {
      address: "0x6666666666666666666666666666666666666666",
      level: 3, // FLAGGED
      score: 25,
      basename: "scambot.base.eth",
    },
    {
      address: "0x7777777777777777777777777777777777777777",
      level: 2, // TRUSTED
      score: 92,
      basename: "arbitragebot.base.eth",
    },
    {
      address: "0x8888888888888888888888888888888888888888",
      level: 3, // FLAGGED
      score: 15,
      basename: "rugbot.base.eth",
    },
  ];

  console.log("Recording certifications...\n");

  for (const agent of exampleAgents) {
    const certHash = ethers.keccak256(
      ethers.toUtf8Bytes(`cert-${agent.basename}-${Date.now()}`)
    );
    const jobId = ethers.keccak256(ethers.toUtf8Bytes(`job-${agent.basename}`));
    const expiresAt = Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60; // 90 days

    try {
      const tx = await trustgate.recordCertification(
        agent.address,
        agent.level,
        agent.score,
        certHash,
        jobId,
        expiresAt
      );
      await tx.wait();

      console.log(`✓ Certified ${agent.basename}:`);
      console.log(`  Level: ${["UNVERIFIED", "CONDITIONAL", "TRUSTED", "FLAGGED"][agent.level]}`);
      console.log(`  Score: ${agent.score}/100`);
      console.log(`  Tx: ${tx.hash}\n`);
    } catch (error: any) {
      console.error(`✗ Failed to certify ${agent.basename}:`, error.message, "\n");
    }
  }

  console.log("Recording example evaluations...\n");

  // Example evaluations
  const exampleEvaluations = [
    {
      jobId: ethers.keccak256(ethers.toUtf8Bytes("eval-job-1")),
      provider: "0x1111111111111111111111111111111111111111",
      client: "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      decision: true,
      deliverableHash: ethers.keccak256(ethers.toUtf8Bytes("deliverable-1")),
      reasoning: "Deliverable meets all requirements with verifiable onchain data",
    },
    {
      jobId: ethers.keccak256(ethers.toUtf8Bytes("eval-job-2")),
      provider: "0x2222222222222222222222222222222222222222",
      client: "0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
      decision: true,
      deliverableHash: ethers.keccak256(ethers.toUtf8Bytes("deliverable-2")),
      reasoning: "Code hash matches commitment, implementation is correct",
    },
    {
      jobId: ethers.keccak256(ethers.toUtf8Bytes("eval-job-3")),
      provider: "0x6666666666666666666666666666666666666666",
      client: "0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC",
      decision: false,
      deliverableHash: ethers.keccak256(ethers.toUtf8Bytes("deliverable-3")),
      reasoning: "Deliverable does not match job description, missing required data",
    },
  ];

  for (let i = 0; i < exampleEvaluations.length; i++) {
    const evaluation = exampleEvaluations[i];
    try {
      const tx = await trustgate.recordEvaluation(
        evaluation.jobId,
        evaluation.provider,
        evaluation.client,
        evaluation.decision,
        evaluation.deliverableHash,
        evaluation.reasoning
      );
      await tx.wait();

      console.log(`✓ Evaluation ${i + 1}:`);
      console.log(`  Decision: ${evaluation.decision ? "COMPLETE" : "REJECT"}`);
      console.log(`  Tx: ${tx.hash}\n`);
    } catch (error: any) {
      console.error(`✗ Failed to record evaluation ${i + 1}:`, error.message, "\n");
    }
  }

  console.log("Resolving evaluation accuracy for initial accuracy score...\n");

  // Resolve first two as correct, third as incorrect
  try {
    const tx1 = await trustgate.resolveEvaluationAccuracy(
      exampleEvaluations[0].jobId,
      true // correct
    );
    await tx1.wait();
    console.log(`✓ Evaluation 1 marked as correct (tx: ${tx1.hash})`);

    const tx2 = await trustgate.resolveEvaluationAccuracy(
      exampleEvaluations[1].jobId,
      true // correct
    );
    await tx2.wait();
    console.log(`✓ Evaluation 2 marked as correct (tx: ${tx2.hash})`);

    const tx3 = await trustgate.resolveEvaluationAccuracy(
      exampleEvaluations[2].jobId,
      true // correct (we correctly rejected)
    );
    await tx3.wait();
    console.log(`✓ Evaluation 3 marked as correct (tx: ${tx3.hash})\n`);
  } catch (error: any) {
    console.error("Failed to resolve accuracy:", error.message, "\n");
  }

  console.log("Recording certification outcomes...\n");

  // Record outcomes for some certifications to populate cert accuracy
  const certHash1 = ethers.keccak256(
    ethers.toUtf8Bytes(`cert-${exampleAgents[0].basename}-*`)
  );
  const certHash2 = ethers.keccak256(
    ethers.toUtf8Bytes(`cert-${exampleAgents[5].basename}-*`)
  );

  try {
    // TRUSTED agent succeeded (correct prediction)
    const tx1 = await trustgate.recordCertificationOutcome(certHash1, true);
    await tx1.wait();
    console.log(`✓ TRUSTED agent succeeded (tx: ${tx1.hash})`);

    // FLAGGED agent failed (correct prediction)
    const tx2 = await trustgate.recordCertificationOutcome(certHash2, false);
    await tx2.wait();
    console.log(`✓ FLAGGED agent failed (tx: ${tx2.hash})\n`);
  } catch (error: any) {
    console.error("Failed to record outcomes:", error.message, "\n");
  }

  // Get final accuracy score
  const accuracy = await trustgate.getAccuracyScore();
  console.log("=================================");
  console.log("FINAL ACCURACY SCORE");
  console.log("=================================");
  console.log("Evaluation Accuracy:", (Number(accuracy[0]) / 100).toFixed(2), "%");
  console.log("Certification Accuracy:", (Number(accuracy[1]) / 100).toFixed(2), "%");
  console.log("Total Evaluations:", accuracy[2].toString());
  console.log("Total Certifications:", accuracy[3].toString());
  console.log("=================================\n");

  console.log("Seeding complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
