import { config, validateConfig } from "./config";
import { CertificationEngine } from "./engines/certification";
import { EvaluatorEngine } from "./engines/evaluator";
import { OutcomeTracker } from "./engines/outcome";
import { EvaluatorUpdater } from "./engines/evaluatorUpdater";
import { StakingMonitor } from "./engines/stakingMonitor";
import { XMTPHandler } from "./xmtp/handler";
import { startServer } from "./api/server";

async function main() {
  console.log("=================================");
  console.log("TRUSTGATE Agent Starting...");
  console.log("=================================\n");

  // Validate configuration
  try {
    validateConfig();
    console.log("[Config] Configuration validated\n");
  } catch (error: any) {
    console.error("[Config] Configuration error:", error.message);
    process.exit(1);
  }

  // Initialize engines and XMTP handler
  const certificationEngine = new CertificationEngine();
  const evaluatorEngine = new EvaluatorEngine();
  const outcomeTracker = new OutcomeTracker();
  const evaluatorUpdater = new EvaluatorUpdater();
  const stakingMonitor = new StakingMonitor();
  const xmtpHandler = new XMTPHandler();

  // Start all engines and XMTP handler in parallel
  try {
    await Promise.all([
      certificationEngine.start(),
      evaluatorEngine.start(),
      outcomeTracker.start(),
      evaluatorUpdater.start(),
      stakingMonitor.start(),
      xmtpHandler.start(),
    ]);

    console.log("\n[Engines] All engines and XMTP handler started successfully\n");
  } catch (error: any) {
    console.error("[Engines] Failed to start engines:", error.message);
    process.exit(1);
  }

  // Start REST API server
  try {
    startServer();
    console.log("\n[API] REST API started\n");
  } catch (error: any) {
    console.error("[API] Failed to start server:", error.message);
    process.exit(1);
  }

  console.log("=================================");
  console.log("TRUSTGATE Agent Running");
  console.log("=================================");
  console.log(`Contract: ${config.contracts.trustgate}`);
  console.log(`Chain: Base Mainnet (${config.blockchain.chainId})`);
  console.log(`API: http://localhost:${config.server.port}`);
  console.log("=================================\n");

  // Graceful shutdown
  process.on("SIGINT", async () => {
    console.log("\n[Shutdown] Gracefully shutting down...");
    certificationEngine.stop();
    evaluatorEngine.stop();
    outcomeTracker.stop();
    evaluatorUpdater.stop();
    stakingMonitor.stop();
    xmtpHandler.stop();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
