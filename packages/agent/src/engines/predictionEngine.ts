import { ethers } from "ethers";
import { config } from "../config";

/**
 * PredictionEngine
 *
 * Calculates job success prediction scores based on:
 * - Agent historical performance
 * - Job complexity
 * - Market pricing
 * - Agent specialty match
 * - Stake amount
 */
export class PredictionEngine {
  private stakingPool: ethers.Contract;
  private trustgate: ethers.Contract;

  constructor() {
    const provider = new ethers.JsonRpcProvider(config.blockchain.rpcUrl);

    const stakingPoolAbi = [
      "function agentStats(address) view returns (uint256 jobsCompleted, uint256 jobsFailed, uint256 totalValueDelivered, uint256 totalStakeSlashed, uint256 averagePredictionScore, uint256 lastJobTimestamp)",
      "function agentStake(address) view returns (uint256)",
    ];

    const trustgateAbi = [
      "function getCertificationLevel(address) view returns (uint8 level, uint256 expiresAt, bool active)",
    ];

    this.stakingPool = new ethers.Contract(
      process.env.STAKING_POOL_ADDRESS || ethers.ZeroAddress,
      stakingPoolAbi,
      provider
    );

    this.trustgate = new ethers.Contract(
      config.contracts.trustgate,
      trustgateAbi,
      provider
    );
  }

  /**
   * Calculate job success prediction score
   * @returns Prediction score 0-10000 (0-100.00%)
   */
  async predictJobSuccess(params: {
    agentAddress: string;
    jobValue: number; // in USDC (6 decimals)
    jobComplexity?: number; // 1-10
    requiredSkills?: string[];
  }): Promise<{
    prediction: number; // 0-10000
    confidence: number; // 0-10000
    factors: PredictionFactors;
  }> {
    const { agentAddress, jobValue, jobComplexity = 5, requiredSkills = [] } = params;

    // Fetch agent data
    const [stats, stake, cert] = await Promise.all([
      this.stakingPool.agentStats(agentAddress),
      this.stakingPool.agentStake(agentAddress),
      this.trustgate.getCertificationLevel(agentAddress),
    ]);

    // Calculate factors
    const factors = this.calculateFactors(
      {
        jobsCompleted: Number(stats[0]),
        jobsFailed: Number(stats[1]),
        totalValueDelivered: Number(stats[2]),
        stake: Number(stake),
        certLevel: cert[0],
        certActive: cert[2],
      },
      jobValue,
      jobComplexity
    );

    // Weighted scoring
    const weights = {
      historicalSuccess: 0.35,
      certificationLevel: 0.20,
      stakeRatio: 0.25,
      experienceLevel: 0.15,
      recency: 0.05,
    };

    const prediction =
      factors.historicalSuccess * weights.historicalSuccess +
      factors.certificationLevel * weights.certificationLevel +
      factors.stakeRatio * weights.stakeRatio +
      factors.experienceLevel * weights.experienceLevel +
      factors.recency * weights.recency;

    // Confidence based on data availability
    const confidence = this.calculateConfidence(factors);

    return {
      prediction: Math.round(prediction),
      confidence: Math.round(confidence),
      factors,
    };
  }

  private calculateFactors(
    agent: {
      jobsCompleted: number;
      jobsFailed: number;
      totalValueDelivered: number;
      stake: number;
      certLevel: number;
      certActive: boolean;
    },
    jobValue: number,
    jobComplexity: number
  ): PredictionFactors {
    const totalJobs = agent.jobsCompleted + agent.jobsFailed;

    // 1. Historical success rate (0-10000)
    let historicalSuccess = 0;
    if (totalJobs > 0) {
      const successRate = (agent.jobsCompleted * 10000) / totalJobs;
      historicalSuccess = successRate;
    } else {
      historicalSuccess = 5000; // 50% for new agents
    }

    // 2. Certification level score (0-10000)
    const certificationLevel = agent.certActive ? agent.certLevel * 2500 : 0;
    // UNVERIFIED=0, CONDITIONAL=2500, TRUSTED=5000, VERIFIED=7500

    // 3. Stake ratio (is agent's stake sufficient?)
    const requiredStake = jobValue / 5; // 5x leverage
    const stakeRatio = agent.stake >= requiredStake
      ? 10000
      : (agent.stake * 10000) / requiredStake;

    // 4. Experience level (based on total jobs)
    let experienceLevel = 0;
    if (totalJobs >= 50) {
      experienceLevel = 10000;
    } else if (totalJobs >= 20) {
      experienceLevel = 8000;
    } else if (totalJobs >= 10) {
      experienceLevel = 6000;
    } else if (totalJobs >= 5) {
      experienceLevel = 4000;
    } else {
      experienceLevel = 2000;
    }

    // 5. Recency (has agent been active recently?)
    // TODO: Implement based on lastJobTimestamp
    const recency = 7500; // Assume active for now

    // Risk adjustments
    const riskFlags: string[] = [];

    if (totalJobs < 3) {
      riskFlags.push("INEXPERIENCED");
    }

    if (agent.jobsFailed > agent.jobsCompleted / 2) {
      riskFlags.push("HIGH_FAILURE_RATE");
    }

    if (agent.stake < requiredStake) {
      riskFlags.push("INSUFFICIENT_STAKE");
    }

    if (jobComplexity >= 8 && totalJobs < 10) {
      riskFlags.push("COMPLEX_JOB_INEXPERIENCE");
    }

    if (!agent.certActive) {
      riskFlags.push("NOT_CERTIFIED");
    }

    return {
      historicalSuccess,
      certificationLevel,
      stakeRatio,
      experienceLevel,
      recency,
      riskFlags,
    };
  }

  private calculateConfidence(factors: PredictionFactors): number {
    let confidence = 10000;

    // Reduce confidence for risk flags
    confidence -= factors.riskFlags.length * 1000;

    // Reduce confidence if low experience
    if (factors.experienceLevel < 4000) {
      confidence -= 1500;
    }

    // Reduce confidence if not certified
    if (factors.certificationLevel === 0) {
      confidence -= 2000;
    }

    return Math.max(0, confidence);
  }
}

export interface PredictionFactors {
  historicalSuccess: number;
  certificationLevel: number;
  stakeRatio: number;
  experienceLevel: number;
  recency: number;
  riskFlags: string[];
}
