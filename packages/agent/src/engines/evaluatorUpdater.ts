import fs from "fs";
import path from "path";
import { getTrustGateContract } from "../utils/contract";
import { config } from "../config";

/**
 * EvaluatorUpdater Engine
 *
 * Periodically updates evaluator.json with current accuracy scores
 * from the TrustGate contract. This keeps the agent discovery registry
 * fresh for other agents searching for evaluators.
 *
 * Runs every hour by default.
 */
export class EvaluatorUpdater {
  private interval: NodeJS.Timeout | null = null;
  private updateIntervalMs: number;
  private evaluatorJsonPath: string;
  private contract: ReturnType<typeof getTrustGateContract>;

  constructor() {
    this.updateIntervalMs = config.evaluator.updateIntervalMs;
    this.contract = getTrustGateContract();

    // Path to evaluator.json in web package
    // In production, this should be configured via env var
    this.evaluatorJsonPath = config.evaluator.jsonPath ||
      path.resolve(__dirname, "../../../../web/public/.well-known/evaluator.json");
  }

  async start(): Promise<void> {
    console.log("[EvaluatorUpdater] Starting...");
    console.log(`[EvaluatorUpdater] Update interval: ${this.updateIntervalMs / 1000 / 60} minutes`);
    console.log(`[EvaluatorUpdater] JSON path: ${this.evaluatorJsonPath}`);

    // Update immediately on start
    await this.update();

    // Then schedule periodic updates
    this.interval = setInterval(() => {
      this.update().catch((error) => {
        console.error("[EvaluatorUpdater] Error during scheduled update:", error);
      });
    }, this.updateIntervalMs);

    console.log("[EvaluatorUpdater] Started");
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      console.log("[EvaluatorUpdater] Stopped");
    }
  }

  private async update(): Promise<void> {
    try {
      console.log("[EvaluatorUpdater] Fetching accuracy from contract...");

      // Fetch accuracy from contract
      const accuracy = await this.contract.getAccuracyScore();

      const accuracyData = {
        evaluationAccuracy: Number(accuracy[0]) / 100,
        certificationAccuracy: Number(accuracy[1]) / 100,
        totalEvaluations: Number(accuracy[2]),
        totalCertifications: Number(accuracy[3]),
      };

      console.log("[EvaluatorUpdater] Accuracy fetched:", accuracyData);

      // Read existing evaluator.json
      if (!fs.existsSync(this.evaluatorJsonPath)) {
        console.warn(`[EvaluatorUpdater] evaluator.json not found at ${this.evaluatorJsonPath}`);
        console.warn("[EvaluatorUpdater] Skipping update. File will be created on deployment.");
        return;
      }

      const jsonContent = fs.readFileSync(this.evaluatorJsonPath, "utf-8");
      const evaluatorData = JSON.parse(jsonContent);

      // Update accuracy section
      evaluatorData.accuracy = {
        evaluationAccuracy: accuracyData.evaluationAccuracy,
        certificationAccuracy: accuracyData.certificationAccuracy,
        totalEvaluations: accuracyData.totalEvaluations,
        totalCertifications: accuracyData.totalCertifications,
        source: "/api/accuracy",
        refreshed: new Date().toISOString(),
      };

      // Write back to file
      fs.writeFileSync(
        this.evaluatorJsonPath,
        JSON.stringify(evaluatorData, null, 2),
        "utf-8"
      );

      console.log("[EvaluatorUpdater] evaluator.json updated successfully");
      console.log(`[EvaluatorUpdater] Evaluation accuracy: ${accuracyData.evaluationAccuracy}%`);
      console.log(`[EvaluatorUpdater] Certification accuracy: ${accuracyData.certificationAccuracy}%`);
    } catch (error: any) {
      console.error("[EvaluatorUpdater] Update failed:", error.message);

      // Don't throw - we want the engine to continue even if one update fails
      // (e.g., if file doesn't exist in development, or contract is unreachable)
    }
  }

  /**
   * Trigger an immediate update (useful for testing or manual refresh)
   */
  async updateNow(): Promise<void> {
    await this.update();
  }
}
