import { ethers } from "ethers";
import { config } from "../config";

// USDC on Base mainnet
export const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

// Create provider
export function getProvider(): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(config.blockchain.rpcUrl);
}

// Create signer for operator
export function getOperatorSigner(): ethers.Wallet {
  const provider = getProvider();
  return new ethers.Wallet(config.operator.privateKey, provider);
}

// TrustGateRegistry ABI (minimal for agent operations)
export const TRUSTGATE_ABI = [
  "event CertificationRequested(address indexed agent, address indexed requester, bytes32 indexed jobId, uint256 fee)",
  "event CertificationIssued(address indexed agent, uint8 level, uint256 score, bytes32 certHash, uint256 expiresAt)",
  "event EvaluationRecorded(bytes32 indexed jobId, address indexed provider, bool decision, uint256 timestamp)",
  "event AccuracyUpdated(bytes32 indexed jobId, bool wasCorrect, uint256 newEvalAccuracyRate, uint256 newCertAccuracyRate)",
  "function recordCertification(address agent, uint8 level, uint256 score, bytes32 certHash, bytes32 jobId, uint256 expiresAt) external",
  "function recordEvaluation(bytes32 jobId, address provider, address client, bool decision, bytes32 deliverableHash, string calldata reasoning) external",
  "function resolveEvaluationAccuracy(bytes32 jobId, bool wasCorrect) external",
  "function recordCertificationOutcome(bytes32 certHash, bool agentSucceeded) external",
  "function getCertificationLevel(address agent) external view returns (uint8 level, uint256 expiresAt, bool active)",
  "function isTrusted(address agent) external view returns (bool)",
  "function getLatestCertification(address agent) external view returns (tuple(address agentAddress, uint8 level, uint256 scoreUint, uint256 issuedAt, uint256 expiresAt, bytes32 certHash, bytes32 jobId, bool active, address requestedBy))",
  "function getCertificationHistory(address agent) external view returns (tuple(address agentAddress, uint8 level, uint256 scoreUint, uint256 issuedAt, uint256 expiresAt, bytes32 certHash, bytes32 jobId, bool active, address requestedBy)[])",
  "function getEvaluation(bytes32 jobId) external view returns (tuple(bytes32 jobId, address provider, address client, bool decision, bytes32 deliverableHash, uint256 evaluatedAt, bool disputed, int8 wasCorrect))",
  "function getAccuracyScore() external view returns (uint256 evalAccuracy, uint256 certAccuracy, uint256 totalEvals, uint256 totalCerts)",
  "function getFee() external view returns (uint256)",
  "function totalCertifications() external view returns (uint256)",
  "function totalEvaluations() external view returns (uint256)",
];

// Get TrustGateRegistry contract instance
export function getTrustGateContract(): ethers.Contract {
  const signer = getOperatorSigner();
  return new ethers.Contract(config.contracts.trustgate, TRUSTGATE_ABI, signer);
}

// Helper to calculate certification hash
export function calculateCertHash(data: object): string {
  const json = JSON.stringify(data);
  return ethers.keccak256(ethers.toUtf8Bytes(json));
}

// Helper to calculate expiry timestamp
export function calculateExpiryTimestamp(days: number = config.cert.expiryDays): number {
  return Math.floor(Date.now() / 1000) + days * 24 * 60 * 60;
}

// Map score to certification level
export function scoreToCertLevel(score: number): number {
  if (score >= 80) return 2; // TRUSTED
  if (score >= 60) return 1; // CONDITIONAL
  if (score >= 40) return 0; // UNVERIFIED
  return 3; // FLAGGED
}

// Map cert level number to string
export function certLevelToString(level: number): string {
  const levels = ["UNVERIFIED", "CONDITIONAL", "TRUSTED", "FLAGGED"];
  return levels[level] || "UNKNOWN";
}
