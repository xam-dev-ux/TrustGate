// Certification Levels
export type CertificationLevel = 'TRUSTED' | 'CONDITIONAL' | 'UNVERIFIED' | 'FLAGGED'

// Certification Status
export type CertificationStatus = 'pending' | 'complete' | 'expired'

// Risk Flag Severity
export type RiskSeverity = 'low' | 'medium' | 'high' | 'critical'

// Risk Flag
export interface RiskFlag {
  severity: RiskSeverity
  code: string
  description: string
}

// Certification Analysis - components of the agent analysis
export interface CertificationAnalysis {
  // ERC-8183 Data
  jobsCompleted: number
  jobsFailed: number
  jobsExpired: number
  completionRate: number              // percentage
  totalVolumeEscrowed: number         // USDC total managed in escrow
  avgDeliveryTimeHours: number

  // ERC-8004 Data
  erc8004Registered: boolean
  erc8128Active: boolean
  siwaEnabled: boolean
  daysInRegistry: number
  skillFileAvailable: boolean
  skillEndpointCount: number

  // x402 Data
  x402Active: boolean
  x402VolumeUsdc: number

  // Onchain Base mainnet data
  firstSeenBlock: number
  lastActiveBlock: number
  uptimeScore: number

  // Previous TRUSTGATE evaluations
  previousCertLevel: CertificationLevel | null
  previousCertDate: number | null
  certificationHistory: CertificationLevel[]

  // Risk flags detected
  riskFlags: RiskFlag[]
}

// Agent Certification - complete certification with all data
export interface AgentCertification {
  // Agent Identity
  agentAddress: string
  agentBasename: string

  // Certification Result
  level: CertificationLevel
  score: number                       // 0-100 internal score
  issuedAt: number                    // timestamp
  expiresAt: number                   // 90 days default
  certificationHash: string           // bytes32 hash of full report onchain
  jobId: string                       // Job ERC-8183 that originated this cert

  // Analysis Components
  analysis: CertificationAnalysis

  // Onchain State
  status: CertificationStatus
  txHash: string                      // tx of recordCertification()
}

// Evaluator Record - decisions made by TRUSTGATE as evaluator
export interface EvaluatorRecord {
  // Job ERC-8183 evaluated
  jobId: string
  providerAddress: string
  clientAddress: string
  jobDescription: string
  paymentAmount: number

  // TRUSTGATE decision
  decision: 'complete' | 'reject'
  reasoning: string
  deliverableHash: string
  evaluatedAt: number

  // Outcome posterior
  disputed: boolean
  disputeResolved: boolean
  wasCorrect: boolean | null          // null until resolution
}

// Accuracy Score - TRUSTGATE's performance metrics
export interface AccuracyScore {
  // Score as evaluator
  totalEvaluations: number
  correctEvaluations: number
  disputedEvaluations: number
  accuracyRate: number                // percentage of verified correct evaluations

  // Score as certificador
  totalCertifications: number
  trustedThatSucceeded: number        // TRUSTED → success
  trustedThatFailed: number           // TRUSTED → failure
  flaggedThatFailed: number           // FLAGGED → failure (correct)
  flaggedThatSucceeded: number        // FLAGGED → success (error)
  certificationAccuracy: number       // % of correct certs verified

  lastUpdated: number
}

// Global Stats - aggregated system metrics
export interface GlobalStats {
  totalCertifications: number
  certsByLevel: Record<CertificationLevel, number>
  totalEvaluations: number
  accuracyScore: AccuracyScore
  activeCertifications: number        // not expired
  agentsMonitored: number
  lastBlock: number
}
