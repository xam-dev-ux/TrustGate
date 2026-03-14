import { ethers } from "ethers";
import { getTrustGateContract } from "../utils/contract";

export class EvaluatorEngine {
  private contract: ethers.Contract;
  private isRunning: boolean = false;

  constructor() {
    this.contract = getTrustGateContract();
  }

  async start(): Promise<void> {
    console.log("[EvaluatorEngine] Starting...");
    this.isRunning = true;

    // TODO: Subscribe to ERC-8183 job events where TRUSTGATE is evaluator
    // For now, just log that we're ready
    console.log("[EvaluatorEngine] Ready to evaluate jobs");
  }

  stop(): void {
    console.log("[EvaluatorEngine] Stopping...");
    this.isRunning = false;
  }

  async evaluateJob(
    jobId: string,
    provider: string,
    client: string,
    deliverableHash: string,
    jobDescription: string
  ): Promise<boolean> {
    console.log(`[EvaluatorEngine] Evaluating job ${jobId}...`);

    // TODO: Implement actual evaluation logic based on job type
    // For now, simulate evaluation
    const decision = Math.random() > 0.2; // 80% approve rate for demo

    const reasoning = decision
      ? "Deliverable meets requirements with verifiable onchain data"
      : "Deliverable does not match job description";

    console.log(`[EvaluatorEngine] Decision: ${decision ? "COMPLETE" : "REJECT"}`);

    try {
      const tx = await this.contract.recordEvaluation(
        jobId,
        provider,
        client,
        decision,
        deliverableHash,
        reasoning
      );

      await tx.wait();

      console.log(`[EvaluatorEngine] Evaluation recorded onchain: ${tx.hash}`);

      // TODO: Notify client and provider via XMTP
      // TODO: Call complete() or reject() on ERC-8183 contract

      return decision;
    } catch (error) {
      console.error(`[EvaluatorEngine] Failed to record evaluation:`, error);
      throw error;
    }
  }
}
