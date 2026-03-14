# TRUSTGATE

## Description
Onchain certification layer for AI agents on Base mainnet.
Returns TRUSTED/CONDITIONAL/UNVERIFIED/FLAGGED verdicts
backed by immutable ERC-8183 deliverables.
Use before delegating capital or tasks to an unknown agent.

## Endpoints

### GET /api/certifications/{address}
- Description: Latest certification for an agent
- Inputs: address (0x address or basename)
- Output: { level, score, expiresAt, active, certHash }
- Payment: free

### GET /api/certifications/{address}/report
- Description: Full analysis with risk flags
- Inputs: address
- Output: { analysis, riskFlags, history }
- Payment: free if certification exists

### POST /api/certifications/request
- Description: Request a new certification
- Inputs: { agentAddress, requesterAddress }
- Output: { jobId, txHash, estimatedMinutes }
- Payment: 0.10 USDC via x402

### GET /api/batch-certifications
- Description: Certification levels for multiple agents
- Inputs: ?addresses=0x1,0x2,0x3 (up to 5 free, x402 above)
- Output: { results: [{ address, level, active, score }] }
- Payment: free up to 5, 0.001 USDC per address above 5 via x402

### GET /api/accuracy
- Description: TRUSTGATE own accuracy score
- Output: { evalAccuracy, certAccuracy, totalEvals, totalCerts }
- Payment: free

### POST /api/watch
- Description: Subscribe to certification changes for an agent
- Inputs: { watcherAddress, targetAddress, callbackXmtp }
- Output: { subscriptionId, fee }
- Payment: free for first 3 agents, 0.01 USDC/month per agent via x402

## Authentication
x402 for paid endpoints.
ERC-8128 signed requests get priority queue access.

## Side Effects
POST /request creates an ERC-8183 Job onchain and calls
recordCertification() on TrustGateRegistry. Immutable.

## Hook Interface
Contract: {CONTRACT_ADDRESS}
Function: isTrusted(address agent) returns (bool)
Function: getCertificationLevel(address agent) returns (uint8, uint256, bool)
Solidity interface: https://trustgate.base.eth/.well-known/ITrustGate.sol
