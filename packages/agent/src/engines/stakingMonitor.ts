import { ethers } from "ethers";
import { config } from "../config";

/**
 * StakingMonitor Engine
 *
 * Monitors the TrustGateStakingPool for:
 * - New stakes/unstakes
 * - Job insurance locks
 * - Stake releases and slashes
 * - Updates NFT metadata
 */
export class StakingMonitor {
  private stakingPool: ethers.Contract;
  private isRunning: boolean = false;

  constructor() {
    const provider = new ethers.JsonRpcProvider(config.blockchain.rpcUrl);
    const stakingPoolAddress = process.env.STAKING_POOL_ADDRESS || "";

    if (!stakingPoolAddress) {
      console.warn("[StakingMonitor] STAKING_POOL_ADDRESS not set, monitor disabled");
    }

    // ABI minimal para eventos
    const abi = [
      "event Staked(address indexed agent, uint256 amount, uint256 newTotal)",
      "event Unstaked(address indexed agent, uint256 amount, uint256 newTotal)",
      "event StakeLocked(bytes32 indexed jobId, address indexed agent, address indexed client, uint256 amount, uint256 jobValue, uint256 predictedSuccess)",
      "event StakeReleased(bytes32 indexed jobId, address indexed agent, uint256 amount)",
      "event StakeSlashed(bytes32 indexed jobId, address indexed agent, address indexed client, uint256 amount, uint256 penalty)",
      "function agentStake(address) view returns (uint256)",
      "function getSuccessRate(address) view returns (uint256)",
      "function getMaxJobValue(address) view returns (uint256)",
    ];

    this.stakingPool = new ethers.Contract(stakingPoolAddress, abi, provider);
  }

  async start(): Promise<void> {
    if (!process.env.STAKING_POOL_ADDRESS) {
      console.log("[StakingMonitor] Disabled (no STAKING_POOL_ADDRESS)");
      return;
    }

    console.log("[StakingMonitor] Starting...");
    this.isRunning = true;

    // Listen to staking events
    this.stakingPool.on("Staked", async (agent, amount, newTotal, event) => {
      console.log(`[StakingMonitor] 📈 Agent staked: ${agent}`);
      console.log(`  Amount: ${ethers.formatUnits(amount, 6)} USDC`);
      console.log(`  New total: ${ethers.formatUnits(newTotal, 6)} USDC`);
      console.log(`  Tx: https://basescan.org/tx/${event.log.transactionHash}`);

      // TODO: Notify agent via XMTP
      // TODO: Update cache/database
    });

    this.stakingPool.on("Unstaked", async (agent, amount, newTotal, event) => {
      console.log(`[StakingMonitor] 📉 Agent unstaked: ${agent}`);
      console.log(`  Amount: ${ethers.formatUnits(amount, 6)} USDC`);
      console.log(`  Remaining: ${ethers.formatUnits(newTotal, 6)} USDC`);
    });

    this.stakingPool.on("StakeLocked", async (jobId, agent, client, amount, jobValue, prediction) => {
      console.log(`[StakingMonitor] 🔒 Stake locked for job: ${jobId}`);
      console.log(`  Agent: ${agent}`);
      console.log(`  Client: ${client}`);
      console.log(`  Coverage: ${ethers.formatUnits(amount, 6)} USDC`);
      console.log(`  Job value: ${ethers.formatUnits(jobValue, 6)} USDC`);
      console.log(`  Prediction: ${Number(prediction) / 100}%`);

      // TODO: Notify agent that stake is locked
      // TODO: Send job insurance details to client
    });

    this.stakingPool.on("StakeReleased", async (jobId, agent, amount) => {
      console.log(`[StakingMonitor] ✅ Stake released: ${jobId}`);
      console.log(`  Agent: ${agent}`);
      console.log(`  Amount unlocked: ${ethers.formatUnits(amount, 6)} USDC`);

      // TODO: Congratulate agent via XMTP
    });

    this.stakingPool.on("StakeSlashed", async (jobId, agent, client, amount, penalty) => {
      console.log(`[StakingMonitor] ⚠️ Stake slashed: ${jobId}`);
      console.log(`  Agent: ${agent}`);
      console.log(`  Penalty: ${ethers.formatUnits(penalty, 6)} USDC`);
      console.log(`  Client compensation: ${ethers.formatUnits(amount, 6)} USDC`);

      // TODO: Notify agent of slash
      // TODO: Notify client of compensation
    });

    console.log("[StakingMonitor] Monitoring staking pool events");
  }

  stop(): void {
    console.log("[StakingMonitor] Stopping...");
    this.isRunning = false;
    this.stakingPool.removeAllListeners();
  }

  /**
   * Get agent staking info (for API endpoints)
   */
  async getAgentStakingInfo(agent: string) {
    if (!process.env.STAKING_POOL_ADDRESS) {
      return null;
    }

    try {
      const [stake, successRate, maxJobValue] = await Promise.all([
        this.stakingPool.agentStake(agent),
        this.stakingPool.getSuccessRate(agent),
        this.stakingPool.getMaxJobValue(agent),
      ]);

      return {
        stake: Number(stake),
        stakeFormatted: ethers.formatUnits(stake, 6),
        successRate: Number(successRate) / 100, // Convert from basis points
        maxJobValue: Number(maxJobValue),
        maxJobValueFormatted: ethers.formatUnits(maxJobValue, 6),
      };
    } catch (error) {
      console.error("[StakingMonitor] Failed to get agent info:", error);
      return null;
    }
  }
}
