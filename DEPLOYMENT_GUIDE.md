# TRUSTGATE - Guía Completa de Deployment

Guía paso a paso para deployar **TRUSTGATE completo** incluyendo:
- ✅ Sistema de certificación original
- ✅ Sistema de staking + insurance
- ✅ TrustScore NFT
- ✅ Prediction engine
- ✅ UI mobile-first

---

## 📋 Tabla de Contenidos

1. [Prerequisites](#1-prerequisites)
2. [Instalación Local](#2-instalación-local)
3. [Configuración de Variables de Entorno](#3-configuración-de-variables-de-entorno)
4. [Build y Test Local](#4-build-y-test-local)
5. [Deploy de Contratos](#5-deploy-de-contratos)
6. [Deploy del Backend](#6-deploy-del-backend)
7. [Deploy del Frontend](#7-deploy-del-frontend)
8. [Verificación End-to-End](#8-verificación-end-to-end)
9. [Testing del Sistema de Staking](#9-testing-del-sistema-de-staking)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Prerequisites

### Software Requerido

**Node.js y npm:**
```bash
node --version  # Debe ser >= 22.0.0
npm --version   # Debe ser >= 10.0.0
```

Si no tienes Node 22:
```bash
# Instalar Node 22 (usando nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 22
nvm use 22
```

**Git:**
```bash
git --version
```

### Cuentas y Credenciales Necesarias

#### 1. Wallet de Base Mainnet
- **ETH necesario**: ~0.05 ETH para gas
- **USDC recomendado**: 100 USDC para testing del staking
- **Guarda tu private key de forma segura**

#### 2. Basescan API Key
1. Ve a https://basescan.org/myapikey
2. Registra una cuenta
3. Crea un API key gratuito
4. Guarda el key

#### 3. Railway Account (Backend)
1. Ve a https://railway.app
2. Regístrate con GitHub
3. Conecta tu repositorio

#### 4. Vercel Account (Frontend)
1. Ve a https://vercel.com
2. Regístrate con GitHub
3. Conecta tu repositorio

#### 5. XMTP Credentials (Opcional)
```bash
# Generar encryption key
openssl rand -hex 32
```

#### 6. Neynar API Key (Opcional)
1. Ve a https://neynar.com
2. Registra y obtén API key

---

## 2. Instalación Local

### Paso 1: Clonar Repositorio

```bash
cd ~
git clone https://github.com/tu-usuario/TrustGate.git
cd TrustGate
```

### Paso 2: Instalar Dependencias

```bash
# Instalar todas las dependencias del monorepo
npm install

# Esto instala:
# - packages/shared
# - packages/contracts
# - packages/agent
# - packages/web
```

**Verificación:**
```bash
npm ls --workspaces --depth=0
```

Deberías ver:
```
TrustGate@1.0.0
├── @trustgate/agent@1.0.0
├── @trustgate/contracts@1.0.0
├── @trustgate/shared@1.0.0
└── @trustgate/web@1.0.0
```

---

## 3. Configuración de Variables de Entorno

### Paso 1: Shared Package (No requiere .env)

```bash
cd packages/shared
npm run build
```

Esto genera tipos TypeScript en `dist/`.

### Paso 2: Contracts Package

```bash
cd ../contracts
cp .env.example .env
nano .env
```

**Completa con tus valores:**

```env
# Blockchain
RPC_URL=https://mainnet.base.org
BASESCAN_API_KEY=tu_basescan_api_key_aqui

# Deployer (mismo wallet para todo)
DEPLOYER_PRIVATE_KEY=0xtu_private_key_aqui

# Treasury (puede ser la misma dirección del deployer)
TREASURY_ADDRESS=0xtu_wallet_address_aqui

# USDC en Base mainnet (NO cambiar)
USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913

# ERC-8004 Registry en Base (NO cambiar)
ERC8004_REGISTRY_ADDRESS=0x8004A169FB4a3325136EB29fA0ceB6D2e539a432

# ERC-8183 Factory (dejar vacío por ahora, no hay deployment oficial)
ERC8183_FACTORY_ADDRESS=

# Fees
CERTIFICATION_FEE_USDC=0.10
CERT_EXPIRY_DAYS=90

# Staking Pool Configuration (NUEVO - configuración flexible)
# Mínimos de stake para cada tier (en USDC, puede ser tan bajo como 0.1)
STAKE_MIN_CONDITIONAL=0.1    # CONDITIONAL tier - ultra bajo para onboarding
STAKE_MIN_TRUSTED=1          # TRUSTED tier - accesible
STAKE_MIN_VERIFIED=10        # VERIFIED tier - premium

# Leverage: cuánto puede valer un job vs el stake
STAKE_LEVERAGE_MULTIPLIER=5  # 5x = con 1 USDC puedes aceptar jobs de 5 USDC
```

**⚠️ IMPORTANTE**: Nunca comitees el archivo `.env` con tu private key.

**💡 TIP - Configuración de Staking**:
- **Para testnet/demo**: Usa mínimos bajos (0.1, 1, 10) y leverage alto (10x)
- **Para producción**: Usa mínimos más altos (500, 2000, 10000) y leverage moderado (5x)
- El leverage puede ser 1-20x, pero valores muy altos aumentan el riesgo

### Paso 3: Agent Package

```bash
cd ../agent
cp .env.example .env
nano .env
```

**Completa (los contracts se llenarán después del deploy):**

```env
# XMTP (opcional por ahora)
XMTP_WALLET_KEY=
XMTP_DB_ENCRYPTION_KEY=
XMTP_ENV=production

# Neynar (opcional)
NEYNAR_API_KEY=

# Contracts (SE LLENARÁN DESPUÉS DEL DEPLOY)
CONTRACT_ADDRESS=
STAKING_POOL_ADDRESS=
TRUSTSCORE_NFT_ADDRESS=

# ERC Standards
ERC8004_REGISTRY_ADDRESS=0x8004A169FB4a3325136EB29fA0ceB6D2e539a432
ERC8183_FACTORY_ADDRESS=

# Blockchain
RPC_URL=https://mainnet.base.org
BASESCAN_API_KEY=tu_basescan_api_key

# Operator (mismo que deployer de contracts)
OPERATOR_PRIVATE_KEY=0xtu_private_key_aqui

# Fees
CERTIFICATION_FEE_USDC=0.10
EVALUATION_FEE_USDC=0.05
CERT_EXPIRY_DAYS=90

# Treasury
TREASURY_ADDRESS=0xtu_wallet_address

# Server
PORT=3001

# Timeouts
SKILL_FETCH_TIMEOUT_MS=5000

# Evaluator JSON Updater
EVALUATOR_UPDATE_INTERVAL_MS=3600000
EVALUATOR_JSON_PATH=
```

### Paso 4: Web Package

```bash
cd ../web
cp .env.example .env
nano .env
```

**Completa (los contracts se llenarán después):**

```env
# API (local por ahora, se actualizará después de Railway deploy)
VITE_API_URL=http://localhost:3001

# Contracts (SE LLENARÁN DESPUÉS DEL DEPLOY)
VITE_CONTRACT_ADDRESS=
VITE_STAKING_POOL_ADDRESS=
VITE_TRUSTSCORE_NFT_ADDRESS=

# ERC Standards
VITE_ERC8004_REGISTRY_ADDRESS=0x8004A169FB4a3325136EB29fA0ceB6D2e539a432
VITE_ERC8183_FACTORY_ADDRESS=

# Base Mainnet
VITE_CHAIN_ID=8453
VITE_USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
VITE_BASESCAN_URL=https://basescan.org

# Agent Address (SE LLENARÁ DESPUÉS)
VITE_AGENT_ADDRESS=
```

---

## 4. Build y Test Local

### Paso 1: Build Shared

```bash
cd ~/TrustGate/packages/shared
npm run build
```

**Verificación:**
```bash
ls dist/
# Deberías ver: index.d.ts, index.js, types.d.ts
```

### Paso 2: Test Contracts

```bash
cd ../contracts
npm test
```

**Resultado esperado:**
```
  TrustGateRegistry
    Deployment
      ✓ Should deploy with correct initial values
      ✓ Should set owner correctly
    ... (34 tests total)

  34 passing
```

### Paso 3: Test Local Development

**Terminal 1 - Backend:**
```bash
cd ~/TrustGate/packages/agent
npm run dev
```

**Resultado esperado:**
```
[Config] Configuration validated
[CertificationEngine] Starting...
[EvaluatorEngine] Starting...
[OutcomeTracker] Starting...
[EvaluatorUpdater] Starting...
[StakingMonitor] Disabled (no STAKING_POOL_ADDRESS)
[API] Server listening on port 3001
```

**Terminal 2 - Frontend:**
```bash
cd ~/TrustGate/packages/web
npm run dev
```

**Resultado esperado:**
```
  VITE v5.0.0  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

Abre http://localhost:5173 en tu browser. Deberías ver la homepage (aunque sin datos reales todavía).

**Ctrl+C** en ambas terminales para detener.

---

## 5. Deploy de Contratos

### Paso 1: Deploy TrustGateRegistry

```bash
cd ~/TrustGate/packages/contracts

# Deploy contrato principal
npx hardhat run scripts/deploy.ts --network base
```

**Resultado esperado:**
```
Deploying TrustGateRegistry to Base mainnet...

Deploying with account: 0xTU_ADDRESS
Account balance: 0.05 ETH

Constructor arguments:
  Owner: 0xTU_ADDRESS
  Operator: 0xTU_ADDRESS
  ...

TrustGateRegistry deployed to: 0xCONTRACT_ADDRESS_AQUI
Transaction: 0xTX_HASH

Verifying contract on Basescan...
Contract verified successfully!
```

**Guarda el address del contrato:**
```
CONTRACT_ADDRESS=0x... (de la salida anterior)
```

### Paso 2: Seed Data Inicial

```bash
# Crear certificaciones y evaluaciones de ejemplo
npx hardhat run scripts/seed.ts --network base
```

**Resultado esperado:**
```
Seeding TrustGateRegistry with sample data...

Created 8 certifications:
  - 0xagent1: TRUSTED (score: 85)
  - 0xagent2: CONDITIONAL (score: 72)
  ...

Created 3 evaluations with outcomes
Accuracy scores populated

Seed complete!
```

### Paso 3: Deploy TrustGateHook (Opcional pero recomendado)

```bash
# Set minimum level (2 = TRUSTED)
export HOOK_MINIMUM_LEVEL=2

npx hardhat run scripts/deployHook.ts --network base
```

**Resultado esperado:**
```
Deploying TrustGateHook to Base mainnet...

Configuration:
  TrustGate Registry: 0xCONTRACT_ADDRESS
  Minimum Level: TRUSTED (2)

TrustGateHook deployed to: 0xHOOK_ADDRESS
```

**Guarda el address:**
```
HOOK_ADDRESS=0x... (de la salida)
```

### Paso 4: Deploy Staking Pool + NFT

```bash
npx hardhat run scripts/deployStaking.ts --network base
```

**Resultado esperado:**
```
=================================
Deploying TrustGate Staking System
=================================

Deploying with: 0xTU_ADDRESS
Balance: 0.048 ETH

Configuration:
  USDC: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
  TrustGate: 0xCONTRACT_ADDRESS
  Treasury: 0xTU_ADDRESS

1. Deploying TrustScoreNFT...
   TrustScoreNFT: 0xNFT_ADDRESS

2. Deploying TrustGateStakingPool...
   StakingPool: 0xPOOL_ADDRESS

3. Configuring TrustScoreNFT...
   NFT configured

Verifying contracts...
[verificación en Basescan]

=================================
DEPLOYMENT COMPLETE
=================================
TrustScoreNFT: 0xNFT_ADDRESS
StakingPool: 0xPOOL_ADDRESS
=================================
```

**Guarda los addresses:**
```
STAKING_POOL_ADDRESS=0x...
TRUSTSCORE_NFT_ADDRESS=0x...
```

### Paso 5: Actualizar Archivos con Addresses

**Agent .env:**
```bash
cd ~/TrustGate/packages/agent
nano .env
```

Actualiza:
```env
CONTRACT_ADDRESS=0xCONTRACT_ADDRESS_AQUI
STAKING_POOL_ADDRESS=0xPOOL_ADDRESS_AQUI
TRUSTSCORE_NFT_ADDRESS=0xNFT_ADDRESS_AQUI
```

**Web .env:**
```bash
cd ~/TrustGate/packages/web
nano .env
```

Actualiza:
```env
VITE_CONTRACT_ADDRESS=0xCONTRACT_ADDRESS_AQUI
VITE_STAKING_POOL_ADDRESS=0xPOOL_ADDRESS_AQUI
VITE_TRUSTSCORE_NFT_ADDRESS=0xNFT_ADDRESS_AQUI
```

**evaluator.json:**
```bash
cd ~/TrustGate/packages/web/public/.well-known
nano evaluator.json
```

Actualiza:
```json
{
  "contract": "0xCONTRACT_ADDRESS_AQUI",
  "hookContract": "0xHOOK_ADDRESS_AQUI"
}
```

---

## 6. Deploy del Backend

### Paso 1: Instalar Railway CLI

```bash
npm install -g @railway/cli
```

### Paso 2: Login a Railway

```bash
railway login
```

Se abrirá tu browser para autenticar.

### Paso 3: Crear Proyecto

```bash
cd ~/TrustGate/packages/agent
railway init
```

Sigue el prompt:
- **Create new project**: Yes
- **Project name**: trustgate-agent
- **Environment**: production

### Paso 4: Configurar Variables de Entorno

**Opción A - Via Web Dashboard (recomendado):**

1. Ve a https://railway.app
2. Abre tu proyecto `trustgate-agent`
3. Ve a **Variables** tab
4. Añade todas las variables del archivo `.env`:

```
CONTRACT_ADDRESS=0x...
STAKING_POOL_ADDRESS=0x...
TRUSTSCORE_NFT_ADDRESS=0x...
RPC_URL=https://mainnet.base.org
OPERATOR_PRIVATE_KEY=0x...
BASESCAN_API_KEY=...
TREASURY_ADDRESS=0x...
CERTIFICATION_FEE_USDC=0.10
EVALUATION_FEE_USDC=0.05
CERT_EXPIRY_DAYS=90
PORT=3001
ERC8004_REGISTRY_ADDRESS=0x8004A169FB4a3325136EB29fA0ceB6D2e539a432
EVALUATOR_UPDATE_INTERVAL_MS=3600000
```

**Opción B - Via CLI:**
```bash
railway variables set CONTRACT_ADDRESS=0x...
railway variables set STAKING_POOL_ADDRESS=0x...
# ... etc para todas las variables
```

### Paso 5: Deploy

```bash
cd ~/TrustGate
railway up
```

Railway detectará el Dockerfile y lo usará automáticamente.

**Resultado esperado:**
```
Uploading...
Build started
Building Docker image...
✓ Build successful
✓ Deployment successful

Service URL: https://trustgate-agent.up.railway.app
```

**Guarda la URL:**
```
RAILWAY_URL=https://trustgate-agent.up.railway.app
```

### Paso 6: Verificar Backend

```bash
curl https://trustgate-agent.up.railway.app/api/accuracy
```

Deberías ver:
```json
{
  "evaluationAccuracy": 95.5,
  "certificationAccuracy": 92.3,
  "totalEvaluations": 3,
  "totalCertifications": 8
}
```

---

## 7. Deploy del Frontend

### Paso 1: Actualizar Web .env con Railway URL

```bash
cd ~/TrustGate/packages/web
nano .env
```

Cambia:
```env
VITE_API_URL=https://trustgate-agent.up.railway.app
```

### Paso 2: Deploy a Vercel

```bash
# Login a Vercel
npx vercel login

# Deploy
npx vercel --prod
```

Sigue el prompt:
- **Set up and deploy?**: Yes
- **Which scope?**: Tu cuenta
- **Link to existing project?**: No
- **Project name**: trustgate
- **Directory**: packages/web
- **Override settings?**: No

**Resultado esperado:**
```
Deploying...
✓ Production: https://trustgate.vercel.app
```

### Paso 3: Verificar Frontend

Abre https://trustgate.vercel.app

Deberías ver:
- ✅ Homepage con accuracy score
- ✅ Bottom navigation (Home/Stake/Predict/NFT)
- ✅ Diseño mobile-first funcionando

---

## 8. Verificación End-to-End

### Test 1: Homepage Accuracy

```bash
# Abre en browser
https://trustgate.vercel.app
```

**Verifica:**
- ✅ Accuracy score visible (ej: 94.2%)
- ✅ Stats mostrándose
- ✅ Diseño mobile responsive

### Test 2: Agent Certification

```bash
# Visita un agent certificado del seed
https://trustgate.vercel.app/agent/0xAGENT_ADDRESS
```

**Verifica:**
- ✅ CertVerdictHero con color correcto
- ✅ Stats y análisis visible
- ✅ Basescan link funcionando

### Test 3: API Endpoints

```bash
# Accuracy
curl https://trustgate-agent.up.railway.app/api/accuracy

# Stats
curl https://trustgate-agent.up.railway.app/api/stats

# Certification
curl https://trustgate-agent.up.railway.app/api/certifications/0xAGENT_ADDRESS
```

### Test 4: Discovery Files

```bash
# SKILL.md
curl https://trustgate.vercel.app/.well-known/SKILL.md

# evaluator.json
curl https://trustgate.vercel.app/.well-known/evaluator.json

# ITrustGate.sol
curl https://trustgate.vercel.app/.well-known/ITrustGate.sol

# farcaster.json (Base Mini App)
curl https://trustgate.vercel.app/.well-known/farcaster.json
```

Todos deben retornar 200 OK.

### Test 5: Staking Pages

```bash
# Stake page
https://trustgate.vercel.app/stake

# NFT page
https://trustgate.vercel.app/nft

# Predict page
https://trustgate.vercel.app/predict
```

**Verifica:**
- ✅ UI carga sin errores
- ✅ Animaciones funcionan
- ✅ Haptic feedback (en mobile)
- ✅ Bottom navigation funciona

---

## 9. Testing del Sistema de Staking

### Paso 1: Verificar Contratos en Basescan

```bash
# TrustGateRegistry
https://basescan.org/address/0xCONTRACT_ADDRESS

# StakingPool
https://basescan.org/address/0xSTAKING_POOL_ADDRESS

# TrustScoreNFT
https://basescan.org/address/0xNFT_ADDRESS
```

**Verifica:**
- ✅ Contratos verificados (green checkmark)
- ✅ Contract tab muestra código fuente
- ✅ Read/Write contract tabs disponibles

### Paso 2: Interactuar con Staking (via Basescan)

**2.1 Approve USDC**

1. Ve a https://basescan.org/address/0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913#writeProxyContract
2. Conecta tu wallet (Write Contract → Connect to Web3)
3. Encuentra `approve`
4. Parámetros:
   - `spender`: 0xSTAKING_POOL_ADDRESS
   - `amount`: 1000000000 (1000 USDC con 6 decimals)
5. Click **Write**
6. Confirma transacción en wallet

**2.2 Stake USDC**

1. Ve a https://basescan.org/address/0xSTAKING_POOL_ADDRESS#writeContract
2. Encuentra `stake`
3. Parámetros:
   - `amount`: 1000000000 (1000 USDC)
4. Click **Write**
5. Confirma transacción

**2.3 Verificar Stake**

1. Ve a Read Contract tab
2. Encuentra `agentStake`
3. Parámetros:
   - `address`: 0xTU_ADDRESS
4. Deberías ver: 1000000000

**2.4 Verificar NFT Minted**

1. Ve a https://basescan.org/address/0xNFT_ADDRESS#readContract
2. Encuentra `agentToToken`
3. Parámetros:
   - `address`: 0xTU_ADDRESS
4. Deberías ver: 1 (tu token ID)

5. Encuentra `tokenURI`
6. Parámetros:
   - `tokenId`: 1
7. Copia el data URI y pégalo en browser
8. Deberías ver el JSON con metadata + SVG

### Paso 3: Test Prediction API

```bash
curl -X POST https://trustgate-agent.up.railway.app/api/predict \
  -H "Content-Type: application/json" \
  -d '{
    "agentAddress": "0xTU_ADDRESS",
    "jobValue": 2000,
    "jobComplexity": 5
  }'
```

**Resultado esperado:**
```json
{
  "prediction": 75.5,
  "confidence": 85.0,
  "factors": {
    "historicalSuccess": 0,
    "certificationLevel": 5000,
    "stakeRatio": 10000,
    "experienceLevel": 2000,
    "recency": 7500,
    "riskFlags": ["INEXPERIENCED"]
  },
  "recommendation": "CAUTION"
}
```

### Paso 4: Test UI de Staking (Mobile)

**En móvil o emulador:**

1. Abre https://trustgate.vercel.app/stake
2. Deberías ver tu stake (1000 USDC)
3. Tier badge debería decir "CONDITIONAL"
4. Max job value: ~5000 USDC
5. Toca el botón "INCREASE STAKE"
6. Bottom sheet debería aparecer con animación spring
7. Siente el haptic feedback al tocar

---

## 10. Troubleshooting

### Problema: Contracts no se despliegan

**Síntoma:**
```
Error: insufficient funds for gas
```

**Solución:**
```bash
# Verifica balance
npx hardhat run scripts/checkBalance.ts --network base

# Necesitas al menos 0.05 ETH
```

### Problema: Backend no arranca en Railway

**Síntoma:**
```
Error: Missing required environment variables
```

**Solución:**
1. Ve a Railway dashboard
2. Variables tab
3. Verifica que todas estén configuradas
4. Especialmente: CONTRACT_ADDRESS, OPERATOR_PRIVATE_KEY, RPC_URL

### Problema: Frontend no muestra datos

**Síntoma:**
Página carga pero sin accuracy score

**Solución:**
```bash
# Verifica que API_URL esté configurado
cd packages/web
cat .env | grep VITE_API_URL

# Debe apuntar a Railway URL
VITE_API_URL=https://trustgate-agent.up.railway.app

# Rebuild y redeploy
npm run build
vercel --prod
```

### Problema: Staking pool no aparece

**Síntoma:**
```
[StakingMonitor] Disabled (no STAKING_POOL_ADDRESS)
```

**Solución:**
```bash
# Agent .env debe tener STAKING_POOL_ADDRESS
nano packages/agent/.env

# Añade:
STAKING_POOL_ADDRESS=0x...

# Redeploy a Railway
railway up
```

### Problema: NFT no se mintea

**Síntoma:**
Transaction reverts con "Unauthorized"

**Solución:**
El StakingPool debe estar configurado como autorizado en NFT:

```bash
# Verifica en Basescan
# TrustScoreNFT → Read Contract → stakingPool
# Debe retornar: 0xSTAKING_POOL_ADDRESS

# Si es 0x000...000, configurar:
# TrustScoreNFT → Write Contract → setStakingPool
# Parámetro: 0xSTAKING_POOL_ADDRESS
```

### Problema: Prediction siempre retorna 0%

**Síntoma:**
```json
{ "prediction": 0 }
```

**Solución:**
Agent no tiene stake ni historial. Stakea primero:

```bash
# 1. Approve USDC
# 2. Stake USDC
# 3. Espera confirmación
# 4. Retry prediction
```

---

## ✅ Checklist Final

Antes de considerar deployment completo, verifica:

### Contratos
- [ ] TrustGateRegistry deployed & verified
- [ ] TrustGateStakingPool deployed & verified
- [ ] TrustScoreNFT deployed & verified
- [ ] TrustGateHook deployed (opcional)
- [ ] Seed data creado (8 certs, 3 evals)

### Backend
- [ ] Deployed a Railway
- [ ] Todas las env vars configuradas
- [ ] 5 engines corriendo (Cert, Eval, Outcome, EvalUpdater, StakingMonitor)
- [ ] API responde en /api/accuracy
- [ ] API responde en /api/predict

### Frontend
- [ ] Deployed a Vercel
- [ ] Homepage muestra accuracy score
- [ ] /stake página funciona
- [ ] /nft página funciona
- [ ] /predict página funciona
- [ ] Bottom navigation funciona
- [ ] Mobile responsive

### Discovery
- [ ] /.well-known/SKILL.md accesible
- [ ] /.well-known/evaluator.json con addresses correctos
- [ ] /.well-known/ITrustGate.sol accesible
- [ ] /.well-known/farcaster.json accesible

### Staking System
- [ ] Puedes stakear USDC
- [ ] NFT se mintea automáticamente
- [ ] tokenURI retorna SVG onchain
- [ ] Prediction API funciona
- [ ] Stake info visible en /stake

---

## 🎉 Deployment Completo!

Si todos los checks están ✅, tienes **TRUSTGATE completo** funcionando en producción:

- 🏦 **3 contratos** en Base mainnet
- 🤖 **5 engines** monitoreando 24/7
- 📱 **6 páginas** mobile-first
- 🎨 **NFT dinámico** con SVG onchain
- 🎯 **ML prediction** en tiempo real
- 💰 **Staking pool** con insurance

**URLs importantes:**
- Frontend: https://trustgate.vercel.app
- API: https://trustgate-agent.up.railway.app
- Contratos: https://basescan.org/address/0x...

**Next steps:**
- Conectar wallet real (Wagmi + RainbowKit)
- Marketing: compartir en X, Farcaster, etc.
- Monitorear TVL del staking pool
- Iterar basado en feedback

---

**¿Problemas?** Lee la sección [Troubleshooting](#10-troubleshooting) o abre un issue en GitHub.

**¡Felicidades! TRUSTGATE está live** 🚀
