import { getTrustGateContract } from "../utils/contract";

export class OutcomeTracker {
  private contract: any;
  private isRunning: boolean = false;

  constructor() {
    this.contract = getTrustGateContract();
  }

  async start(): Promise<void> {
    console.log("[OutcomeTracker] Starting...");
    this.isRunning = true;

    // TODO: Monitor certified agents in background
    // TODO: Track job outcomes for certified agents
    // TODO: Track evaluation dispute resolutions

    console.log("[OutcomeTracker] Monitoring agent outcomes");
  }

  stop(): void {
    console.log("[OutcomeTracker] Stopping...");
    this.isRunning = false;
  }

  async recordCertificationOutcome(certHash: string, agentSucceeded: boolean): Promise<void> {
    console.log(`[OutcomeTracker] Recording cert outcome: ${certHash} -> ${agentSucceeded}`);

    try {
      const tx = await this.contract.recordCertificationOutcome(certHash, agentSucceeded);
      await tx.wait();

      console.log(`[OutcomeTracker] Outcome recorded: ${tx.hash}`);
    } catch (error) {
      console.error(`[OutcomeTracker] Failed to record outcome:`, error);
      throw error;
    }
  }

  async resolveEvaluationAccuracy(jobId: string, wasCorrect: boolean): Promise<void> {
    console.log(`[OutcomeTracker] Resolving evaluation accuracy: ${jobId} -> ${wasCorrect}`);

    try {
      const tx = await this.contract.resolveEvaluationAccuracy(jobId, wasCorrect);
      await tx.wait();

      console.log(`[OutcomeTracker] Accuracy resolved: ${tx.hash}`);
    } catch (error) {
      console.error(`[OutcomeTracker] Failed to resolve accuracy:`, error);
      throw error;
    }
  }
}
