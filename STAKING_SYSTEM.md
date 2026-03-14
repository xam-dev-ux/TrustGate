# TRUSTGATE Staking & Insurance System

## 🎯 Overview

Sistema completo de staking con insurance para jobs ERC-8183, prediction engine con IA, y TrustScore NFTs dinámicos.

**Valor diferencial**: Convierte TRUSTGATE de un "certification service" a un "trust infrastructure protocol" con TVL real y skin in the game.

---

## 📐 Arquitectura

### Smart Contracts (Base Mainnet)

#### 1. TrustGateStakingPool.sol
**Función**: Staking pool con insurance para jobs

**Features**:
- Agents depositan stake USDC como collateral permanente
- Stake reutilizable para múltiples jobs
- Cuando acepta job → lockea porción del stake como insurance
- Job exitoso → unlockea stake
- Job fallido → client recupera compensation del stake (slashing)
- Leverage system: Configurable (1-20x, default 5x)
- Tiered staking: **Totalmente configurable** via env (puede ser tan bajo como 0.1 USDC)
  - Default: CONDITIONAL (0.1), TRUSTED (1), VERIFIED (10)
  - Producción: CONDITIONAL (500), TRUSTED (2000), VERIFIED (10000)

**Economic Model**:
```
Agent stakes: 2000 USDC
↓
Can accept jobs up to: 10,000 USDC (5x leverage)
↓
Job: 5000 USDC → Locks 2000 USDC (40% coverage)
↓
Success: Unlocks 2000 USDC + receives 5000 USDC payment
Failure: Client gets 2000 USDC compensation + 5000 USDC refund
```

**Fees**:
- Insurance fee: 0.5% del job value (charged on success)
- Pool management: 0.2% anual del TVL

**Functions**:
```solidity
function stake(uint256 amount) external
function unstake(uint256 amount) external
function lockStakeForJob(bytes32 jobId, address agent, ...) external returns (uint256 coverage)
function releaseStake(bytes32 jobId) external
function slashStake(bytes32 jobId, bool malicious) external
function getMaxJobValue(address agent) external view returns (uint256)
```

#### 2. TrustScoreNFT.sol
**Función**: NFT dinámico ERC-721 representando reputación

**Features**:
- **Soulbound** (non-transferable, tied to agent address)
- **SVG onchain**: Generado completamente onchain, no IPFS
- **Auto-updating**: Se actualiza automáticamente con performance
- **Visual tiers**: Colores cambian según stake/cert level
- **DeFi compatible**: Puede usarse como view-only collateral

**Metadata dinámica**:
- Stake amount
- Success rate %
- Jobs completed
- Total value delivered
- Certification level
- Visual gradient según tier

**SVG Structure**:
```
┌─────────────────────┐
│   TRUSTSCORE        │  ← Title
│   [TRUSTED]         │  ← Tier badge (animated gradient)
│                     │
│   STAKE: 2,500 USDC │  ← Live stats
│   SUCCESS: 94.2%    │
│   JOBS: 42          │
│   VALUE: 125K USDC  │
│                     │
│   TRUSTGATE         │  ← Footer
│   BASE MAINNET      │
└─────────────────────┘
```

**Tier Colors**:
- VERIFIED (10K+): Purple/Pink (#8b5cf6, #ec4899)
- TRUSTED (2K+): Green/Cyan (#10b981, #06b6d4)
- CONDITIONAL (500+): Amber/Red (#f59e0b, #ef4444)
- UNVERIFIED (<500): Gray (#6b7280, #9ca3af)

---

### Backend Engines

#### 1. StakingMonitor
**Función**: Monitorea eventos del staking pool

**Events monitored**:
- `Staked` - Agent deposita stake
- `Unstaked` - Agent retira stake
- `StakeLocked` - Stake locked para job
- `StakeReleased` - Job exitoso, stake liberado
- `StakeSlashed` - Job fallido, agent penalizado

**Actions**:
- Logs con formato
- TODO: Notificar via XMTP
- TODO: Actualizar cache/database

#### 2. PredictionEngine
**Función**: Calcula probabilidad de éxito de job usando ML

**Factors analyzed** (weighted):
1. **Historical Success** (35%): Jobs completed vs failed
2. **Certification Level** (20%): UNVERIFIED/CONDITIONAL/TRUSTED/VERIFIED
3. **Stake Ratio** (25%): ¿Tiene stake suficiente?
4. **Experience Level** (15%): Número total de jobs
5. **Recency** (5%): ¿Ha estado activo recientemente?

**Output**:
```json
{
  "prediction": 8750,  // 87.5%
  "confidence": 9200,  // 92% confidence
  "factors": {
    "historicalSuccess": 9000,
    "certificationLevel": 5000,
    "stakeRatio": 10000,
    "experienceLevel": 8000,
    "recency": 7500,
    "riskFlags": ["COMPLEX_JOB_INEXPERIENCE"]
  },
  "recommendation": "PROCEED"  // or "CAUTION" or "HIGH_RISK"
}
```

**Risk Flags**:
- `INEXPERIENCED` - < 3 jobs total
- `HIGH_FAILURE_RATE` - Failures > 50%
- `INSUFFICIENT_STAKE` - Stake < required
- `COMPLEX_JOB_INEXPERIENCE` - Job complexity 8+ pero < 10 jobs
- `NOT_CERTIFIED` - No active certification

---

### API Endpoints (nuevos)

```bash
# Staking info
GET /api/staking/:address
→ { stake, stakeFormatted, successRate, maxJobValue }

# Job prediction
POST /api/predict
Body: { agentAddress, jobValue, jobComplexity, requiredSkills }
→ { prediction, confidence, factors, recommendation }

# NFT metadata
GET /api/nft/:address
→ { tokenId, tokenURI, metadata }
```

---

### Frontend (Mobile-First UI)

#### Diseño Disruptivo

**Características**:
- 📱 **Mobile-first**: Diseñado para touch
- 🎨 **Glassmorphism**: Cards con backdrop-blur
- ✨ **Neon gradients**: Borders animados
- 📳 **Haptic feedback**: Vibration API
- 🎯 **Large tap targets**: Min 48px
- 🔄 **Pull to refresh**: Native-like
- 💫 **Micro-interactions**: Framer Motion
- 🌙 **Dark mode**: Default y único

**Color System**:
```css
TRUSTED: linear-gradient(90deg, #10b981, #06b6d4)
CONDITIONAL: linear-gradient(90deg, #f59e0b, #ef4444)
FLAGGED: linear-gradient(90deg, #ef4444, #dc2626)
VERIFIED: linear-gradient(90deg, #8b5cf6, #ec4899)
```

#### Páginas Nuevas

**1. /stake - StakePage**
- Hero card con stake actual y tier badge
- Stats grid (max job value, success rate)
- Benefits breakdown (500/2000/10000 tiers)
- "How it works" explainer
- Bottom sheet modal para stake/unstake
- Quick amount buttons (500/1000/2000/5000)
- Haptic feedback en todas las acciones

**2. /nft - NFTPage**
- NFT preview card 2:3 aspect ratio
- Animated glow effect
- Live stats display
- Share functionality (Web Share API + clipboard fallback)
- Download SVG button
- "About TrustScore NFT" explainer
- Use cases section

**3. /predict - PredictPage**
- Agent address input
- Job value input con USDC label
- Complexity slider (1-10)
- Prediction result card con animated percentage
- Progress bar animation
- Confidence meter
- Risk flags con warnings
- Factor breakdown con bars
- Recommendation badge (PROCEED/CAUTION/HIGH_RISK)

**4. MobileNav - Bottom Navigation**
- Fixed bottom con backdrop-blur
- 4 tabs: Home / Stake / Predict / NFT
- Active state con gradient underline
- Emoji icons
- Haptic feedback
- Safe area padding (iPhone notch)

---

## ⚙️ Configuración de Parámetros

### Staking Mínimos (Totalmente Configurables)

**Via .env en `packages/contracts/.env`:**

```env
# Testnet/Demo (bajos para facilitar testing)
STAKE_MIN_CONDITIONAL=0.1    # 0.1 USDC mínimo
STAKE_MIN_TRUSTED=1          # 1 USDC para TRUSTED
STAKE_MIN_VERIFIED=10        # 10 USDC para VERIFIED
STAKE_LEVERAGE_MULTIPLIER=10 # 10x leverage (más riesgo, más access)

# Producción (más conservador)
STAKE_MIN_CONDITIONAL=500    # 500 USDC mínimo
STAKE_MIN_TRUSTED=2000       # 2000 USDC para TRUSTED
STAKE_MIN_VERIFIED=10000     # 10000 USDC para VERIFIED
STAKE_LEVERAGE_MULTIPLIER=5  # 5x leverage (más seguro)
```

**Ejemplos de Configuraciones**:

| Escenario | CONDITIONAL | TRUSTED | VERIFIED | Leverage | Use Case |
|-----------|-------------|---------|----------|----------|----------|
| **Testing** | 0.1 | 1 | 10 | 10x | Development, demos |
| **Soft Launch** | 10 | 50 | 200 | 7x | Early adopters |
| **Production** | 500 | 2000 | 10000 | 5x | Full launch, conservative |
| **High TVL** | 1000 | 5000 | 25000 | 3x | Established protocol |

**Trade-offs**:
- **Mínimos bajos** → Más agents pueden participar → Más TVL inicial → Más riesgo
- **Mínimos altos** → Solo agents serios → Menos TVL inicial → Menos riesgo
- **Leverage alto** → Agents pueden aceptar jobs grandes → Más atractivo → Más riesgo de slashing
- **Leverage bajo** → Menos riesgo → Requiere más stake → Barrera de entrada más alta

**Recomendación**: Empieza con valores bajos (0.1/1/10 y 10x) para testing, luego aumenta gradualmente basado en:
- TVL actual del pool
- Tasa de jobs exitosos vs fallidos
- Feedback de la comunidad

---

## 🚀 Deployment

### 1. Deploy Contracts

**Antes de deployar, configura parámetros en `.env`:**

```bash
cd packages/contracts
nano .env

# Ajusta según tu estrategia:
STAKE_MIN_CONDITIONAL=0.1
STAKE_MIN_TRUSTED=1
STAKE_MIN_VERIFIED=10
STAKE_LEVERAGE_MULTIPLIER=5
```

**Deploy:**

```bash
npx hardhat run scripts/deployStaking.ts --network base

# Output mostrará la configuración:
# Staking Parameters:
#   Min CONDITIONAL: 0.1 USDC
#   Min TRUSTED: 1 USDC
#   Min VERIFIED: 10 USDC
#   Leverage: 5x
#
# TrustScoreNFT: 0x...
# StakingPool: 0x...
```

**Add to .env**:
```env
STAKING_POOL_ADDRESS=0x...
TRUSTSCORE_NFT_ADDRESS=0x...
```

### 2. Backend

**Update .env**:
```env
STAKING_POOL_ADDRESS=0x...
TRUSTSCORE_NFT_ADDRESS=0x...
```

**Deploy to Railway**:
```bash
cd packages/agent
railway up
```

**Verify engines start**:
- ✓ CertificationEngine
- ✓ EvaluatorEngine
- ✓ OutcomeTracker
- ✓ EvaluatorUpdater
- ✓ **StakingMonitor** (new)

### 3. Frontend

**Deploy to Vercel**:
```bash
cd packages/web
vercel --prod
```

**Verify routes**:
- / - HomePage
- /agent/:address - AgentPage
- /accuracy - AccuracyPage
- **/stake** - StakePage (new)
- **/nft** - NFTPage (new)
- **/predict** - PredictPage (new)

---

## 📊 Revenue Model

### Income Streams

1. **Certification fees**: 0.10 USDC per cert (existing)
2. **Insurance fees**: 0.5% of job value when job succeeds
3. **Pool management**: 0.2% anual del TVL staked
4. **Dispute resolution**: 1% of job value (future)

### Example: 1000 agents staking 1000 USDC each

```
TVL: 1,000,000 USDC

Jobs/month: 500 jobs × 2000 USDC avg = 1,000,000 USDC volume
Insurance fees: 1M × 0.5% = 5,000 USDC/month

Pool management: 1M × 0.2% / 12 = 166 USDC/month

Total monthly: ~5,166 USDC
Annual: ~62,000 USDC

+ Certification fees (existing)
+ Future: x402 payments, dispute fees, premium features
```

---

## 🎯 Flywheel Economics

```
Más agents staking
    ↓
Más TVL en pool
    ↓
Puede asegurar jobs más grandes
    ↓
Más clients confían → más jobs
    ↓
Más insurance fees → más revenue
    ↓
Mejor accuracy tracking → más confianza
    ↓
Más agents quieren stakear (back to top)
```

**Network effects**:
- Agents con stake alto tienen ventaja competitiva
- Clients prefieren agents con insurance
- TVL crece exponencialmente
- TRUSTGATE se vuelve requisito para ERC-8183 jobs

---

## 🔐 Security Considerations

**Smart Contracts**:
- ✅ ReentrancyGuard en todas las funciones críticas
- ✅ Access control: only owner puede lockear/slashear
- ✅ Immutable addresses (trustgate, usdc, nft)
- ✅ No approval needed (users approve via UI)

**Backend**:
- ✅ Solo lectura de contratos (no private keys expuestas)
- ✅ Prediction engine no puede manipular scores
- ✅ Eventos monitoreados, no polling

**Frontend**:
- ✅ Input validation en todos los forms
- ✅ Haptic feedback no crashea si no disponible
- ✅ Web Share API con fallback a clipboard
- ✅ Error boundaries (future)

---

## 📈 Next Steps

### Phase 1: MVP Live (Current)
- ✅ Staking pool deployed
- ✅ NFT contract deployed
- ✅ Prediction engine working
- ✅ Mobile UI complete

### Phase 2: Integration (1-2 weeks)
- [ ] Connect wallet (Wagmi + RainbowKit)
- [ ] Real contract interactions (stake/unstake)
- [ ] NFT minting on first stake
- [ ] XMTP notifications

### Phase 3: Advanced (2-4 weeks)
- [ ] Improve prediction ML model
- [ ] Historical data analytics
- [ ] Watch/webhook engine for proactive monitoring
- [ ] Dispute resolution flow

### Phase 4: Growth (ongoing)
- [ ] Partnerships con ERC-8183 platforms
- [ ] SDK for easy integration
- [ ] MCP server for Claude agents
- [ ] Marketing: TVL dashboard, leaderboards

---

## 💡 Killer Features Summary

1. **Stake Once, Use Forever**: Reutilizable stake vs one-time payment
2. **Predictive Insurance**: ML predicts success antes de aceptar job
3. **Soulbound NFT**: Reputation as a financial primitive
4. **5-10x Leverage**: Pequeño stake, grandes jobs
5. **Auto-Slashing**: Contract enforces penalties, no disputes
6. **Mobile-First**: Diseñado para agents on-the-go
7. **Haptic UX**: Native app feeling en web
8. **Onchain SVG**: NFT completamente descentralizado

---

## 🎨 UI Highlights

### Glassmorphism Cards
```tsx
className="backdrop-blur-xl bg-void/90 border border-border"
```

### Gradient Borders
```tsx
<div className="p-[2px] bg-gradient-to-r from-trusted to-trustedFg">
  <div className="bg-surface rounded-3xl">
    {/* Content */}
  </div>
</div>
```

### Haptic Feedback
```tsx
const haptic = () => {
  if (navigator.vibrate) {
    navigator.vibrate(10); // light
  }
};
```

### Bottom Sheet Modal
```tsx
<motion.div
  initial={{ y: "100%" }}
  animate={{ y: 0 }}
  transition={{ type: "spring", damping: 30 }}
  className="fixed inset-x-0 bottom-0 rounded-t-[2rem]"
>
  {/* Modal content */}
</motion.div>
```

---

**TRUSTGATE Staking System: Where reputation meets capital** 🚀
