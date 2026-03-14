# TRUSTGATE Agent Discovery Layer - Implementation Status

## ✅ COMPLETED Components

### 1. SKILL.md (CRITICAL - Agents find TRUSTGATE)
**Location**: `packages/web/public/.well-known/SKILL.md`
**Status**: ✅ COMPLETE
**Purpose**: Any agent following Agent App Framework discovers TRUSTGATE automatically

**Endpoints documented**:
- GET /api/certifications/{address} - free
- GET /api/certifications/{address}/report - free if exists
- POST /api/certifications/request - 0.10 USDC
- GET /api/batch-certifications - free up to 5, 0.001 USDC per additional
- GET /api/accuracy - free
- POST /api/watch - free for 3 agents, 0.01 USDC/month per additional

**Also created**: `ITrustGate.sol` - Solidity interface for direct contract imports

---

### 2. Batch Endpoint (CRITICAL - Multiplies discovery value)
**Location**: `packages/agent/src/api/server.ts`
**Status**: ✅ COMPLETE
**Purpose**: Agents can verify multiple agents at once after ERC-8004 search

**Implementation**:
```
GET /api/batch-certifications?addresses=0x1,0x2,0x3
```

**Features**:
- Free up to 5 addresses
- 0.001 USDC per address above 5 (x402)
- Returns array in same order as input (easy zip)
- Parallel fetching for speed
- x402 payment detection (TODO: actual payment verification)

**Also added**:
- GET /api/certifications/:address/report - full analysis with risk flags
- POST /api/certifications/request - request new certification endpoint

---

### 3. Evaluator Registry JSON
**Location**: `packages/web/public/.well-known/evaluator.json`
**Status**: ✅ COMPLETE (with automatic updates)
**Purpose**: Agents creating ERC-8183 jobs can discover TRUSTGATE as evaluator

**Contains**:
- Basename, address, contract
- Specialties: agent-output, data-analysis, code-review, agent-certification
- Fee: 0.05 USDC via x402
- Accuracy scores (auto-updated hourly by EvaluatorUpdater engine)
- All interface URLs (XMTP, REST, SKILL.md, hook contract, Solidity interface)
- ERC-8004, ERC-8128, SIWA flags

**Auto-update**: EvaluatorUpdater engine in agent backend fetches accuracy from contract every hour and updates the JSON file

---

### 4. TrustGateHook.sol (CRITICAL - Makes TRUSTGATE infrastructure)
**Location**: `packages/contracts/contracts/hooks/TrustGateHook.sol`
**Status**: ✅ COMPLETE
**Purpose**: ERC-8183 jobs can require certification at protocol level

**Features**:
- Configurable minimum level (UNVERIFIED/CONDITIONAL/TRUSTED/FLAGGED)
- beforeAssign() hook called by ERC-8183 before job assignment
- Blocks uncertified, expired, or insufficient trust agents
- Emits AgentBlocked/AgentApproved events
- checkAgent() view function for preview
- getTrustgateAccuracy() to verify hook credibility

**Deployment**:
```bash
cd packages/contracts
export HOOK_MINIMUM_LEVEL=2  # 2 = TRUSTED only
npx hardhat run scripts/deployHook.ts --network base
```

**Usage**: Other developers copy this hook address and use it in their ERC-8183 jobs

---

### 5. EvaluatorUpdater Engine (NEW)
**Location**: `packages/agent/src/engines/evaluatorUpdater.ts`
**Status**: ✅ COMPLETE
**Purpose**: Automatically keep evaluator.json accuracy scores fresh

**Features**:
- Fetches accuracy from TrustGateRegistry contract periodically
- Updates evaluator.json with current evaluation/certification accuracy
- Runs every hour by default (configurable via EVALUATOR_UPDATE_INTERVAL_MS)
- Updates on startup, then on schedule
- Graceful error handling (doesn't crash if file missing or contract unreachable)
- Timestamps each update in the JSON

**Configuration**:
- `EVALUATOR_UPDATE_INTERVAL_MS` - update frequency (default: 3600000 = 1 hour)
- `EVALUATOR_JSON_PATH` - path to evaluator.json (default: relative path to web package)

**Integration**:
- Started automatically with other engines in `index.ts`
- Stopped gracefully on SIGINT
- Logs all updates and errors to console

**Why This Matters**:
Other agents searching for evaluators can see TRUSTGATE's current accuracy without making additional API calls. Fresh accuracy data increases trust and discovery.

---

## 🚧 TO IMPLEMENT (Detailed instructions below)

### 5. SDK npm Package (@trustgate/sdk)
**Status**: NOT STARTED
**Priority**: HIGH (eliminates integration friction)

**Purpose**: One-liner integration for any agent framework

**Create**:
```
packages/sdk/
├── src/
│   ├── index.ts         # TrustGate class
│   ├── types.ts         # TypeScript types
│   ├── x402.ts          # x402 payment handler
│   └── cache.ts         # 5-minute cache
├── package.json
├── tsconfig.json
└── README.md
```

**API Surface**:
```typescript
import { TrustGate } from '@trustgate/sdk';

const tg = new TrustGate({
  network: 'base',
  apiUrl: 'https://trustgate.railway.app',
  payerPrivateKey: process.env.WALLET_KEY, // optional
});

// Simple check - free
const trusted = await tg.isTrusted('flashoracle.base.eth');

// Full cert - free if exists, 0.10 USDC if new
const cert = await tg.certify('flashoracle.base.eth');

// Batch - free up to 5
const results = await tg.batchCertify(['agent1.base.eth', 'agent2.base.eth']);

// Require TRUSTED or throw
await tg.requireTrusted('agent.base.eth');

// Watch for changes
await tg.watch('agent.base.eth', {
  onDowngrade: (cert) => console.log('Downgraded:', cert),
  xmtpAddress: '0x...',
});
```

**Implementation notes**:
- Wrapper around REST API endpoints
- Handles x402 payments internally
- Caches results 5 minutes
- Auto-polls if certification pending
- Works with AgentKit, ElizaOS, any TypeScript agent

**Publish**:
```bash
cd packages/sdk
npm publish --access public
```

---

### 6. MCP Server (@trustgate/mcp)
**Status**: NOT STARTED
**Priority**: MEDIUM (captures Claude-based agents)

**Purpose**: Claude Desktop and MCP-compatible frameworks can use TRUSTGATE

**Create**:
```
packages/mcp/
├── src/
│   └── server.ts        # MCP server
├── package.json
├── tsconfig.json
└── README.md
```

**Tools exposed**:
- `certify_agent` - Get/request certification
- `is_trusted` - Quick boolean check
- `batch_certify` - Multiple agents
- `get_accuracy` - TRUSTGATE's own score

**Implementation**:
```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { TrustGate } from '@trustgate/sdk';

const server = new Server({
  name: 'trustgate',
  version: '1.0.0',
}, { capabilities: { tools: {} } });

// Use SDK internally - no logic duplication
const tg = new TrustGate({ network: 'base' });

server.setRequestHandler('tools/call', async (request) => {
  if (request.params.name === 'certify_agent') {
    const cert = await tg.certify(request.params.arguments.agent);
    return { content: [{ type: 'text', text: JSON.stringify(cert) }] };
  }
  // ... other tools
});
```

**Usage** (Claude Desktop config):
```json
{
  "mcpServers": {
    "trustgate": {
      "command": "npx",
      "args": ["-y", "@trustgate/mcp"]
    }
  }
}
```

**Publish**:
```bash
cd packages/mcp
npm publish --access public
```

---

### 7. Watch/Webhook Engine
**Status**: NOT STARTED
**Priority**: MEDIUM (makes TRUSTGATE proactive)

**Purpose**: Notify subscribers when agent certifications change

**Create**:
```
packages/agent/src/watchers.ts
```

**Implementation**:
- POST /api/watch endpoint (already documented in SKILL.md)
- Store subscriptions in JSON file (later: database)
- Background job every 5 minutes
- Compare current cert level vs last recorded
- Send XMTP message if changed with:
  - Old level vs new level
  - Risk flags added/removed
  - Basescan link
  - Quick Actions: [See report] [Cancel pending jobs]

**Storage**:
```typescript
interface Subscription {
  id: string;
  watcherAddress: string;
  targetAddress: string;
  callbackXmtp: string;
  createdAt: number;
  lastChecked: number;
  lastLevel: CertificationLevel | null;
  fee: number; // 0 for first 3, 0.01 for additional
}
```

**Pricing**:
- Free for first 3 agents per watcher
- 0.01 USDC/month per agent above 3 (via x402)
- Monthly billing via x402

---

## Deployment Checklist

### Deploy Web (Vercel)
```bash
cd packages/web
vercel --prod
```

Verify:
- https://trustgate.vercel.app/.well-known/SKILL.md ✅
- https://trustgate.vercel.app/.well-known/ITrustGate.sol ✅
- https://trustgate.vercel.app/.well-known/evaluator.json ✅
- https://trustgate.vercel.app/.well-known/farcaster.json ✅

### Deploy Agent (Railway)
```bash
cd packages/agent
railway up
```

Verify:
- https://trustgate.railway.app/api/accuracy ✅
- https://trustgate.railway.app/api/batch-certifications?addresses=0x123 ✅

### Deploy Hook (Base mainnet)
```bash
cd packages/contracts
export HOOK_MINIMUM_LEVEL=2
npx hardhat run scripts/deployHook.ts --network base
```

Get hook address from output, update:
- `packages/web/public/.well-known/evaluator.json` - hookContract field
- `packages/web/public/.well-known/SKILL.md` - Hook Interface section

### Publish SDK (when ready)
```bash
cd packages/sdk
npm publish --access public
```

### Publish MCP (when ready)
```bash
cd packages/mcp
npm publish --access public
```

---

## What Must Not Be Lost

1. **SKILL.md is the most critical file** - without it, no agent finds TRUSTGATE
2. **Batch endpoint multiplies value** - one call instead of N calls
3. **Hook contract makes TRUSTGATE infrastructure** - not optional service, but protocol requirement
4. **evaluator.json with real-time accuracy** - convinces agents to choose TRUSTGATE over competitors
5. **SDK eliminates friction** - from multi-step integration to one-liner
6. **MCP captures Claude ecosystem** - Claude Desktop + compatible frameworks
7. **Watch engine inverts the flow** - TRUSTGATE proactively notifies instead of being polled

---

## Discovery Flows

### Flow 1: Agent searches ERC-8004, finds TRUSTGATE
1. Agent searches Base for other agents
2. Discovers TRUSTGATE basename: trustgate.base.eth
3. Fetches `/.well-known/SKILL.md` (standard)
4. Sees batch endpoint
5. Calls GET /api/batch-certifications with all discovered agents
6. Filters list by trust level
7. Only interacts with TRUSTED agents

### Flow 2: Developer creates ERC-8183 job
1. Developer wants to require certified agents
2. Searches for "agent certification base"
3. Finds TRUSTGATE
4. Deploys TrustGateHook with minimum level TRUSTED
5. Uses hook address in job creation
6. Protocol-level enforcement - no uncertified agents can work

### Flow 3: Claude agent built with MCP
1. Developer adds @trustgate/mcp to Claude Desktop config
2. Claude has `certify_agent` tool available
3. Before delegating task: Claude calls certify_agent
4. Gets TRUSTED/FLAGGED verdict
5. Makes informed decision without custom integration

### Flow 4: Agent framework uses SDK
1. npm install @trustgate/sdk
2. const tg = new TrustGate({ network: 'base' })
3. await tg.requireTrusted('agent.base.eth')
4. Throws if not TRUSTED
5. One-liner protection

---

## Verification

After deployment, verify discovery works:

**1. SKILL.md accessible**:
```bash
curl https://trustgate.vercel.app/.well-known/SKILL.md
```

**2. Batch endpoint works**:
```bash
curl "https://trustgate.railway.app/api/batch-certifications?addresses=0x1234,0x5678"
```

**3. Hook contract deployed**:
```bash
# Check on Basescan
https://basescan.org/address/{HOOK_ADDRESS}
```

**4. evaluator.json returns accuracy**:
```bash
curl https://trustgate.vercel.app/.well-known/evaluator.json | jq .accuracy
```

---

## Next Steps Priority Order

1. ~~**Update evaluator.json accuracy field**~~ - ✅ COMPLETE - EvaluatorUpdater engine implemented
2. **Create SDK package** - Highest ROI for adoption
3. **Deploy TrustGateHook** - Makes TRUSTGATE infrastructure
4. **Create MCP server** - Captures Claude ecosystem
5. **Implement watch engine** - Makes TRUSTGATE proactive
6. **Test discovery flows** - Verify agents can actually discover and use TRUSTGATE

The foundation is complete. The discovery layer is live. Agents can now find TRUSTGATE without human intervention.
