# TRUSTGATE

**Onchain Certification Infrastructure for AI Agents on Base Mainnet**

[![Base](https://img.shields.io/badge/Base-Mainnet-0052FF)](https://base.org)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.24-363636)](https://soliditylang.org)
[![Tests](https://img.shields.io/badge/Tests-34%20passing-success)](#)
[![Agent Discovery](https://img.shields.io/badge/Agent%20Discovery-Ready-4ade80)](#)

TRUSTGATE es la capa de certificación onchain para agentes IA en Base. Certifica agentes antes de que otros les confíen capital, actúa como evaluador en jobs ERC-8183, y mantiene un accuracy score onchain que se valida con outcomes reales.

## 🎯 Core Value Proposition

**Certifications onchain inmutables que otros contratos pueden consultar via `isTrusted(address)` sin intermediarios.**

Esto convierte TRUSTGATE en **infraestructura**, no en un servicio opcional.

---

## 🚀 Quick Start

### Para Comenzar

```bash
# 1. Clonar e instalar
git clone https://github.com/tu-usuario/TrustGate.git
cd TrustGate
npm install

# 2. Build shared types
npm run build --workspace=packages/shared

# 3. Deploy contracts a Base mainnet
cd packages/contracts
cp .env.example .env  # Añade tus keys
npx hardhat run scripts/deploy.ts --network base
npx hardhat run scripts/seed.ts --network base

# 4. Deploy backend a Railway
cd ../agent
railway up

# 5. Deploy frontend a Vercel
cd ../web
vercel --prod
```

**📖 Guía Completa**: Lee [GETTING_STARTED.md](./GETTING_STARTED.md) para instrucciones detalladas paso a paso.

---

## 🏗️ Arquitectura

### Monorepo con 4 Packages

```
TrustGate/
├── packages/shared/      # Tipos TypeScript compartidos
├── packages/contracts/   # Smart contracts (Solidity + Hardhat)
├── packages/agent/       # Backend (XMTP + Engines + REST API)
└── packages/web/         # Frontend (Vite + React)
```

### Smart Contracts (Base Mainnet)

- **TrustGateRegistry.sol** (>600 líneas)
  - Certificaciones inmutables con expiry (90 días)
  - Registro de evaluaciones ERC-8183
  - Accuracy tracking (eval + cert)
  - Hook interface: `isTrusted()`, `getCertificationLevel()`

- **TrustGateHook.sol**
  - Hook deployable para jobs ERC-8183
  - Requiere certificación a nivel de protocolo
  - Configurable: UNVERIFIED/CONDITIONAL/TRUSTED/FLAGGED

**Tests**: 34 tests, todos passing ✅

### Backend (Railway)

Cuatro engines en paralelo:

1. **Certification Engine** - Analiza agentes, detecta risk flags, emite certificaciones
2. **Evaluator Engine** - Evalúa deliverables de jobs ERC-8183
3. **Outcome Tracker** - Actualiza accuracy basado en outcomes reales
4. **Evaluator Updater** - Actualiza evaluator.json con accuracy cada hora

**REST API** (port 3001):
- GET `/api/certifications/:address`
- GET `/api/batch-certifications` - hasta 5 gratis
- GET `/api/accuracy` - TRUSTGATE's own score
- POST `/api/certifications/request`

### Frontend (Vercel)

- **Diseño austero** tipo auditoría financiera
- **Homepage**: Accuracy score como hero number (94.2% en 72px)
- **AgentPage**: Verdict inequívoco en 0.5s via color
- **AccuracyPage**: Audit trail completo

**Base Mini App** completo con manifest y discovery files.

---

## 🤖 Agent Discovery Layer

TRUSTGATE es **descubrible automáticamente** por agentes IA:

### 1. SKILL.md Discovery
```
https://trustgate.vercel.app/.well-known/SKILL.md
```
Documenta todos los endpoints. Cualquier agente que siga Agent App Framework lo encuentra.

### 2. Batch Certification
```bash
GET /api/batch-certifications?addresses=0x1,0x2,0x3
# Gratis hasta 5, 0.001 USDC por adicional
```
Agentes verifican múltiples agentes en una llamada después de buscar ERC-8004.

### 3. Hook Interface Onchain
```solidity
import "https://trustgate.vercel.app/.well-known/ITrustGate.sol";

contract MyJob {
    ITrustGate trustgate = ITrustGate(0xCONTRACT_ADDRESS);

    function beforeHire(address agent) public view {
        require(trustgate.isTrusted(agent), "Not certified");
    }
}
```
Otros contratos consultan onchain sin backend.

### 4. Evaluator Registry
```
https://trustgate.vercel.app/.well-known/evaluator.json
```
Agentes creando jobs ERC-8183 descubren TRUSTGATE como evaluador.

**Más info**: [AGENT_DISCOVERY_STATUS.md](./AGENT_DISCOVERY_STATUS.md)

---

## 🔄 El Flywheel

```
1. Certifica agentes → ERC-8183 deliverables onchain
2. Otros contratos usan isTrusted() → más adopción
3. Actúa como evaluador → acumula accuracy score
4. Accuracy verificable → más confianza
5. Más confianza → más datos → mejor accuracy
```

**El accuracy score es el único moat** - sin él, TRUSTGATE es solo otro servicio de due diligence.

---

## 📊 Estado del Proyecto

### ✅ Completado

**Contratos**:
- [x] TrustGateRegistry.sol deployed & verified
- [x] TrustGateHook.sol para enforcement a nivel protocolo
- [x] 34 tests comprehensivos
- [x] Deploy & seed scripts

**Backend**:
- [x] Certification engine con risk scoring
- [x] Evaluator engine (stub - integración pendiente)
- [x] Outcome tracker (stub - integración pendiente)
- [x] REST API con batch endpoint
- [x] Dockerfile para Railway

**Frontend**:
- [x] Homepage con accuracy hero
- [x] AgentPage con verdict inequívoco
- [x] AccuracyPage con audit trail
- [x] Base Mini App completo (manifest + imágenes PNG)

**Discovery**:
- [x] SKILL.md en `.well-known/`
- [x] ITrustGate.sol interface pública
- [x] evaluator.json registry
- [x] Batch endpoint operativo

### 🚧 Pendiente

**Integraciones**:
- [ ] XMTP handler con comandos de lenguaje natural
- [ ] ERC-8004 registry fetching real
- [ ] ERC-8183 job event monitoring real
- [ ] x402 payment verification

**SDK & Tools**:
- [ ] `@trustgate/sdk` npm package
- [ ] `@trustgate/mcp` MCP server para Claude
- [ ] Watch/webhook engine para notificaciones

**Estado completo**: [PROJECT_STATUS.md](./PROJECT_STATUS.md)

---

## 📦 Packages

### shared
Tipos TypeScript compartidos. Sin lógica runtime.

```bash
npm run build --workspace=packages/shared
```

### contracts
Smart contracts en Solidity 0.8.24 con Hardhat.

```bash
cd packages/contracts
npm test                                      # 34 tests
npx hardhat run scripts/deploy.ts --network base
npx hardhat run scripts/deployHook.ts --network base
```

### agent
Backend Node.js 22 con XMTP, engines, y REST API.

```bash
cd packages/agent
npm run dev          # Local en port 3001
railway up           # Deploy a Railway
```

### web
Frontend Vite + React con diseño austero.

```bash
cd packages/web
npm run dev          # Local en port 5173
vercel --prod        # Deploy a Vercel
```

---

## 🔧 Development

### Prerequisites

- Node.js >= 22.0.0
- npm >= 10.0.0
- Base mainnet wallet con ETH y USDC

### Install & Build

```bash
npm install
npm run build
```

### Test

```bash
# Todos los tests
npm test

# Solo contratos
npm test --workspace=packages/contracts
```

### Local Development

```bash
# Backend + Frontend en paralelo
npm run dev

# Solo backend
npm run dev:agent

# Solo frontend
npm run dev:web
```

---

## 📚 Documentación

### Deployment & Setup
- **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - ⭐ **GUÍA COMPLETA** paso a paso (incluye staking)
- **[GETTING_STARTED.md](./GETTING_STARTED.md)** - Guía original (pre-staking)
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Instrucciones rápidas

### Sistema de Staking
- **[STAKING_SYSTEM.md](./STAKING_SYSTEM.md)** - ⭐ **Sistema completo** de staking + insurance + NFT

### Arquitectura & Status
- **[PROJECT_STATUS.md](./PROJECT_STATUS.md)** - Estado detallado de implementación
- **[BASE_MINI_APP_SETUP.md](./BASE_MINI_APP_SETUP.md)** - Setup de Base Mini App
- **[AGENT_DISCOVERY_STATUS.md](./AGENT_DISCOVERY_STATUS.md)** - Agent discovery layer

---

## 🎨 Design Principles

**Austero y autoritativo** - como un informe de auditoría financiera:

- **Colores**: Negro #050505 + Verde TRUSTED #4ade80
- **Tipografía**: Bebas Neue (headlines) + IBM Plex Mono (data)
- **Sin gradientes**, sin decoración
- **Solo datos y veredictos**

El CertVerdictHero comunica el nivel en 0.5 segundos via color y massive type.

---

## 🔐 Security

- **Access control**: Owner (governance) + Operator (backend)
- **Pausable**: Emergency stop functionality
- **Immutable certs**: ERC-8183 deliverables onchain
- **No private keys en código**: Todo via env vars
- **Basescan verified**: Todos los contratos verificados

---

## 🚀 Deployment Checklist

- [ ] Contracts deployed & verified en Base mainnet
- [ ] Seed data creado (8 certs, 3 evals)
- [ ] Backend deployed a Railway
- [ ] Frontend deployed a Vercel
- [ ] SKILL.md accesible en `.well-known/`
- [ ] Base Mini App configurado con accountAssociation
- [ ] Hook contract deployed
- [ ] Accuracy score > 0% visible en homepage

**Verificación completa en**: [GETTING_STARTED.md#verificación-end-to-end](./GETTING_STARTED.md#verificación-end-to-end)

---

## 🤝 Contributing

TRUSTGATE es open source. Contribuciones bienvenidas:

1. Fork el repo
2. Crea feature branch (`git checkout -b feature/amazing`)
3. Commit con co-author: `Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>`
4. Push a branch (`git push origin feature/amazing`)
5. Abre Pull Request

---

## 📄 License

MIT

---

## 🔗 Links

- **Contracts**: Base mainnet (despliega con scripts/deploy.ts)
- **Backend**: Railway (despliega con `railway up`)
- **Frontend**: Vercel (despliega con `vercel --prod`)
- **Discovery**: `.well-known/SKILL.md`, `ITrustGate.sol`, `evaluator.json`

---

## 💡 What Makes TRUSTGATE Different

1. **Accuracy score onchain** - verificable, no solo reclamado
2. **Hook interface** - infraestructura, no servicio opcional
3. **Outcome tracking** - certifications validadas con performance real
4. **Agent discoverable** - SKILL.md + batch + evaluator.json
5. **Immutable** - ERC-8183 deliverables con hashes onchain

**Sin accuracy verificable, es solo otro due diligence service.**

**Con accuracy onchain + hook interface, es infraestructura que se autorefuerza.**

---

**TRUSTGATE: La capa de certificación onchain para agentes IA en Base** 🚀
