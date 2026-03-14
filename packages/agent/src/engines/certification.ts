import { ethers } from "ethers";
import type { AgentCertification } from "@trustgate/shared";
import { getTrustGateContract, calculateCertHash, calculateExpiryTimestamp, scoreToCertLevel } from "../utils/contract";
import { analyzeAgent } from "../utils/analysis";

export class CertificationEngine {
  private contract: ethers.Contract;
  private isRunning: boolean = false;

  constructor() {
    this.contract = getTrustGateContract();
  }

  async start(): Promise<void> {
    console.log("[CertificationEngine] Starting...");
    this.isRunning = true;

    // Listen for CertificationRequested events
    this.contract.on("CertificationRequested", async (agent, requester, jobId, fee, event) => {
      try {
        console.log(`[CertificationEngine] Received certification request for ${agent}`);
        await this.processRequest(agent, requester, jobId);
      } catch (error) {
        console.error(`[CertificationEngine] Error processing request:`, error);
      }
    });

    console.log("[CertificationEngine] Listening for CertificationRequested events");
  }

  stop(): void {
    console.log("[CertificationEngine] Stopping...");
    this.isRunning = false;
    this.contract.removeAllListeners("CertificationRequested");
  }

  private async processRequest(agentAddress: string, requester: string, jobId: string): Promise<void> {
    console.log(`[CertificationEngine] Analyzing agent ${agentAddress}...`);

    // TODO: Fetch real data from ERC-8004 registry, ERC-8183 events, etc.
    // For now, using mock data to demonstrate the flow
    const analysisInput = {
      agentAddress,
      agentBasename: "example.base.eth",
      jobsCompleted: 25,
      jobsFailed: 3,
      jobsExpired: 1,
      totalVolumeEscrowed: 5000,
      avgDeliveryTimeHours: 24,
      erc8004Registered: true,
      erc8128Active: true,
      siwaEnabled: true,
      daysInRegistry: 120,
      skillFileAvailable: true,
      skillEndpointCount: 5,
      x402Active: true,
      x402VolumeUsdc: 500,
      firstSeenBlock: 10000,
      lastActiveBlock: 20000,
      currentBlock: 20500,
    };

    const { analysis, score } = analyzeAgent(analysisInput);
    const level = scoreToCertLevel(score);

    // Generate certification report
    const certification: AgentCertification = {
      agentAddress,
      agentBasename: analysisInput.agentBasename,
      level: ["UNVERIFIED", "CONDITIONAL", "TRUSTED", "FLAGGED"][level] as any,
      score,
      issuedAt: Date.now(),
      expiresAt: Date.now() + 90 * 24 * 60 * 60 * 1000,
      certificationHash: "",
      jobId: jobId.toString(),
      analysis,
      status: "complete",
      txHash: "",
    };

    // Calculate hash of certification
    const certHash = calculateCertHash(certification);
    certification.certificationHash = certHash;

    // Record certification onchain
    const expiresAt = calculateExpiryTimestamp();

    console.log(`[CertificationEngine] Recording certification: ${["UNVERIFIED", "CONDITIONAL", "TRUSTED", "FLAGGED"][level]} (score: ${score})`);

    try {
      const tx = await this.contract.recordCertification(
        agentAddress,
        level,
        score,
        certHash,
        jobId,
        expiresAt
      );

      const receipt = await tx.wait();
      certification.txHash = receipt.hash;

      console.log(`[CertificationEngine] Certification recorded onchain: ${receipt.hash}`);
      console.log(`[CertificationEngine] View on Basescan: https://basescan.org/tx/${receipt.hash}`);

      // TODO: Deliver certification to requester via XMTP
      // TODO: Make available via REST API cache
    } catch (error) {
      console.error(`[CertificationEngine] Failed to record certification:`, error);
      throw error;
    }
  }
}
