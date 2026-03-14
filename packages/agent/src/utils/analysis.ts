import type { CertificationAnalysis, RiskFlag } from "@trustgate/shared";

export interface AnalysisInput {
  // Agent identity
  agentAddress: string;
  agentBasename?: string;

  // ERC-8183 data (would be fetched from events)
  jobsCompleted: number;
  jobsFailed: number;
  jobsExpired: number;
  totalVolumeEscrowed: number;
  avgDeliveryTimeHours: number;

  // ERC-8004 data (would be fetched from registry)
  erc8004Registered: boolean;
  erc8128Active: boolean;
  siwaEnabled: boolean;
  daysInRegistry: number;
  skillFileAvailable: boolean;
  skillEndpointCount: number;

  // x402 data
  x402Active: boolean;
  x402VolumeUsdc: number;

  // Onchain data
  firstSeenBlock: number;
  lastActiveBlock: number;
  currentBlock: number;

  // Previous certs
  previousCertLevel?: "TRUSTED" | "CONDITIONAL" | "UNVERIFIED" | "FLAGGED";
  previousCertDate?: number;
  certificationHistory?: ("TRUSTED" | "CONDITIONAL" | "UNVERIFIED" | "FLAGGED")[];
}

export function analyzeAgent(input: AnalysisInput): { analysis: CertificationAnalysis; score: number } {
  const riskFlags: RiskFlag[] = [];
  let score = 100; // Start at perfect score and deduct

  // Calculate completion rate
  const totalJobs = input.jobsCompleted + input.jobsFailed + input.jobsExpired;
  const completionRate = totalJobs > 0 ? (input.jobsCompleted / totalJobs) * 100 : 0;

  // Calculate uptime score
  const blocksActive = input.lastActiveBlock - input.firstSeenBlock;
  const blocksSinceFirst = input.currentBlock - input.firstSeenBlock;
  const uptimeScore = blocksSinceFirst > 0 ? (blocksActive / blocksSinceFirst) * 100 : 0;

  // Risk Detection Logic

  // Completion rate flags
  if (completionRate < 40) {
    riskFlags.push({
      severity: "high",
      code: "LOW_COMPLETION_RATE",
      description: `Completion rate is ${completionRate.toFixed(1)}%, indicating frequent failures`,
    });
    score -= 30;
  } else if (completionRate < 60) {
    riskFlags.push({
      severity: "medium",
      code: "MODERATE_COMPLETION_RATE",
      description: `Completion rate is ${completionRate.toFixed(1)}%, below recommended threshold`,
    });
    score -= 15;
  }

  // Expired jobs flag
  if (totalJobs > 0 && input.jobsExpired / totalJobs > 0.2) {
    riskFlags.push({
      severity: "medium",
      code: "FREQUENT_EXPIRATIONS",
      description: `${((input.jobsExpired / totalJobs) * 100).toFixed(1)}% of jobs expired without completion`,
    });
    score -= 10;
  }

  // ERC-8004 registration
  if (!input.erc8004Registered) {
    riskFlags.push({
      severity: "high",
      code: "NOT_REGISTERED_ERC8004",
      description: "Agent is not registered in ERC-8004 registry",
    });
    score -= 20;
  }

  // Activity recency
  const blocksSinceActive = input.currentBlock - input.lastActiveBlock;
  const daysSinceActive = (blocksSinceActive * 2) / (24 * 60 * 60); // ~2s per block
  if (daysSinceActive > 30) {
    riskFlags.push({
      severity: "medium",
      code: "INACTIVE_AGENT",
      description: `Agent has been inactive for ${daysSinceActive.toFixed(0)} days`,
    });
    score -= 15;
  }

  // High volume with low completion rate
  if (input.totalVolumeEscrowed > 10000 && completionRate < 70) {
    riskFlags.push({
      severity: "critical",
      code: "HIGH_VOLUME_LOW_COMPLETION",
      description: `Managing $${input.totalVolumeEscrowed.toFixed(0)} USDC with only ${completionRate.toFixed(1)}% completion rate`,
    });
    score -= 40;
  }

  // No track record
  if (totalJobs === 0) {
    riskFlags.push({
      severity: "low",
      code: "NO_TRACK_RECORD",
      description: "Agent has no completed jobs on record",
    });
    score -= 10;
  }

  // Missing SKILL.md
  if (!input.skillFileAvailable) {
    riskFlags.push({
      severity: "low",
      code: "NO_SKILL_FILE",
      description: "Agent has no SKILL.md file declaring capabilities",
    });
    score -= 5;
  }

  // Positive factors

  // Long-standing agent
  if (input.daysInRegistry > 90) {
    score += 5;
  }

  // Active standards
  if (input.erc8128Active) {
    score += 3;
  }

  if (input.siwaEnabled) {
    score += 2;
  }

  // x402 activity
  if (input.x402Active && input.x402VolumeUsdc > 100) {
    score += 5;
  }

  // Previous TRUSTED certification
  if (input.previousCertLevel === "TRUSTED") {
    score += 10;
  }

  // Clamp score 0-100
  score = Math.max(0, Math.min(100, score));

  const analysis: CertificationAnalysis = {
    jobsCompleted: input.jobsCompleted,
    jobsFailed: input.jobsFailed,
    jobsExpired: input.jobsExpired,
    completionRate,
    totalVolumeEscrowed: input.totalVolumeEscrowed,
    avgDeliveryTimeHours: input.avgDeliveryTimeHours,

    erc8004Registered: input.erc8004Registered,
    erc8128Active: input.erc8128Active,
    siwaEnabled: input.siwaEnabled,
    daysInRegistry: input.daysInRegistry,
    skillFileAvailable: input.skillFileAvailable,
    skillEndpointCount: input.skillEndpointCount,

    x402Active: input.x402Active,
    x402VolumeUsdc: input.x402VolumeUsdc,

    firstSeenBlock: input.firstSeenBlock,
    lastActiveBlock: input.lastActiveBlock,
    uptimeScore,

    previousCertLevel: input.previousCertLevel || null,
    previousCertDate: input.previousCertDate || null,
    certificationHistory: input.certificationHistory || [],

    riskFlags,
  };

  return { analysis, score };
}
