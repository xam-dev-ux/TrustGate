# TRUSTGATE Deployment Guide

## Prerequisites

- Node.js >= 22.0.0
- npm >= 10.0.0
- Base mainnet wallet with:
  - ETH for gas
  - USDC for testing certifications
- Basescan API key
- XMTP credentials (for agent)
- Neynar API key (for basename resolution)

## Step 1: Environment Setup

### Contracts Package

Create `packages/contracts/.env`:

```bash
BASE_RPC_URL=https://mainnet.base.org
DEPLOYER_PRIVATE_KEY=your_deployer_private_key
BASESCAN_API_KEY=your_basescan_api_key
OPERATOR_PRIVATE_KEY=your_operator_private_key
TREASURY_ADDRESS=your_treasury_address
```

### Agent Package

Create `packages/agent/.env`:

```bash
XMTP_WALLET_KEY=your_xmtp_wallet_key
XMTP_DB_ENCRYPTION_KEY=your_xmtp_db_encryption_key
XMTP_ENV=production
NEYNAR_API_KEY=your_neynar_api_key

CONTRACT_ADDRESS=deployed_trustgate_address
ERC8004_REGISTRY_ADDRESS=erc8004_registry_address
ERC8183_FACTORY_ADDRESS=erc8183_factory_address

RPC_URL=https://mainnet.base.org
BASESCAN_API_KEY=your_basescan_api_key

OPERATOR_PRIVATE_KEY=same_as_contracts_operator_key

CERTIFICATION_FEE_USDC=0.10
EVALUATION_FEE_USDC=0.05
CERT_EXPIRY_DAYS=90

TREASURY_ADDRESS=same_as_contracts_treasury

PORT=3001
SKILL_FETCH_TIMEOUT_MS=5000
```

### Web Package

Create `packages/web/.env`:

```bash
VITE_API_URL=https://your-agent.railway.app
VITE_CONTRACT_ADDRESS=deployed_trustgate_address
VITE_ERC8004_REGISTRY_ADDRESS=erc8004_registry_address
VITE_ERC8183_FACTORY_ADDRESS=erc8183_factory_address
VITE_CHAIN_ID=8453
VITE_USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
VITE_BASESCAN_URL=https://basescan.org
VITE_AGENT_ADDRESS=trustgate_agent_address
```

## Step 2: Deploy Smart Contract

```bash
cd packages/contracts

# Compile contract
npx hardhat compile

# Deploy to Base mainnet
npx hardhat run scripts/deploy.ts --network base

# Copy the deployed CONTRACT_ADDRESS from output
# Add it to all .env files

# Seed with example data (optional)
npx hardhat run scripts/seed.ts --network base
```

Expected output:
```
TrustGateRegistry deployed to: 0x...
Basescan: https://basescan.org/address/0x...
```

## Step 3: Deploy Agent to Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize project
railway init

# Set environment variables in Railway dashboard
# Or use railway variables set KEY=value

# Deploy
railway up

# Or use Dockerfile deployment via Railway dashboard
```

Agent will be available at: `https://your-app.railway.app`

Health check endpoint: `GET /api/accuracy`

## Step 4: Deploy Web to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy from root directory
vercel

# Set environment variables in Vercel dashboard
# Project Settings > Environment Variables
```

Web will be available at: `https://your-app.vercel.app`

## Step 5: Verify Deployment

### Contract Verification

1. Check Basescan: `https://basescan.org/address/{CONTRACT_ADDRESS}`
2. Verify "Code" tab shows verified contract
3. Test read functions: `getAccuracyScore()`, `getFee()`

### Agent Verification

1. Check Railway deployment: `https://your-app.railway.app/api/accuracy`
2. Verify response shows accuracy data
3. Check Railway logs for "TRUSTGATE Agent Running"

### Web Verification

1. Visit Vercel URL
2. Verify homepage loads with accuracy score
3. Check browser console for errors
4. Test navigation to /accuracy page

## Step 6: Integration Testing

### Test Certification Flow (requires USDC)

1. Visit web UI
2. Connect wallet (MetaMask on Base mainnet)
3. Navigate to /certify
4. Enter agent address to certify
5. Approve USDC spend (certification fee)
6. Call `requestCertification()`
7. Wait for backend to detect event
8. Backend analyzes agent and calls `recordCertification()`
9. Verify certification appears in web UI

### Test Hook Interface

Deploy a test contract on Base mainnet:

```solidity
pragma solidity ^0.8.24;

interface ITrustGate {
    function isTrusted(address agent) external view returns (bool);
}

contract TestHook {
    ITrustGate public trustgate;

    constructor(address _trustgate) {
        trustgate = ITrustGate(_trustgate);
    }

    function canAgentWork(address agent) public view returns (bool) {
        // This works WITHOUT any TRUSTGATE backend involvement
        return trustgate.isTrusted(agent);
    }
}
```

This demonstrates TRUSTGATE as infrastructure.

## Monitoring

### Agent Logs

Railway dashboard > Deployments > View Logs

Watch for:
- `[CertificationEngine] Received certification request`
- `[CertificationEngine] Certification recorded onchain`
- `[API] Server listening on port 3001`

### Contract Events

Basescan > Contract > Events

Watch for:
- `CertificationRequested`
- `CertificationIssued`
- `EvaluationRecorded`
- `AccuracyUpdated`

### Web Analytics

Vercel dashboard > Analytics

Monitor:
- Page views
- API calls to Railway backend
- Build status

## Troubleshooting

### Agent not detecting events

- Check RPC_URL is correct Base mainnet endpoint
- Verify OPERATOR_PRIVATE_KEY matches contract operator
- Check Railway logs for connection errors

### Contract transactions failing

- Ensure deployer/operator has enough ETH for gas
- Verify contract is not paused
- Check operator address matches in contract and .env

### Web not loading data

- Verify VITE_API_URL points to Railway deployment
- Check CORS is enabled in agent API
- Inspect browser console for fetch errors

## Security Notes

- NEVER commit .env files to git
- Store private keys in Railway/Vercel secrets
- Use different addresses for deployer and operator
- Enable 2FA on all deployment platforms
- Regularly rotate API keys

## Next Steps

1. **Complete XMTP Integration**: Implement full XMTP handler with natural language commands
2. **Complete ERC-8004 Integration**: Fetch real agent data from registry
3. **Complete ERC-8183 Integration**: Monitor actual job events and deliverables
4. **Expand Web UI**: Add remaining pages (Leaderboard, Evaluations, Docs, etc.)
5. **Add Real Data Fetching**: Replace mock data in certification engine with real onchain queries
6. **Implement x402 Payments**: Add payment flows for XMTP commands
7. **Add SKILL.md Fetching**: Fetch and parse agent capabilities from .well-known/SKILL.md

## Support

For issues or questions:
- Check logs in Railway/Vercel dashboards
- Verify all environment variables are set correctly
- Ensure contract addresses match across all .env files
- Test individual components in isolation
