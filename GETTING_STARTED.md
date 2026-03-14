# TRUSTGATE - Guía Completa de Puesta en Marcha

Esta guía te llevará desde cero hasta tener TRUSTGATE completamente operativo en producción.

---

## Tabla de Contenidos

1. [Prerrequisitos](#prerrequisitos)
2. [Instalación Local](#instalación-local)
3. [Configuración de Variables de Entorno](#configuración-de-variables-de-entorno)
4. [Build y Test Local](#build-y-test-local)
5. [Deploy de Contratos a Base Mainnet](#deploy-de-contratos-a-base-mainnet)
6. [Deploy del Backend a Railway](#deploy-del-backend-a-railway)
7. [Deploy del Frontend a Vercel](#deploy-del-frontend-a-vercel)
8. [Configuración de Base Mini App](#configuración-de-base-mini-app)
9. [Verificación End-to-End](#verificación-end-to-end)
10. [Testing de Agent Discovery](#testing-de-agent-discovery)
11. [Troubleshooting](#troubleshooting)

---

## Prerrequisitos

### Software Requerido

- **Node.js** >= 22.0.0
  ```bash
  node --version  # Debe mostrar v22.x.x o superior
  ```

- **npm** >= 10.0.0
  ```bash
  npm --version   # Debe mostrar 10.x.x o superior
  ```

- **Git**
  ```bash
  git --version
  ```

### Cuentas y Credenciales

1. **Wallet de Base Mainnet** con:
   - Al menos 0.05 ETH para gas de deployment
   - USDC para testing (opcional)
   - Guarda tu private key de forma segura

2. **Basescan API Key**
   - Regístrate en https://basescan.org/myapikey
   - Crea un API key gratuito

3. **Railway Account** (para backend)
   - Regístrate en https://railway.app
   - Conecta tu cuenta de GitHub

4. **Vercel Account** (para frontend)
   - Regístrate en https://vercel.com
   - Conecta tu cuenta de GitHub

5. **XMTP Credentials** (opcional pero recomendado)
   - Genera wallet key para XMTP
   - Genera encryption key: `openssl rand -hex 32`

6. **Neynar API Key** (opcional)
   - Regístrate en https://neynar.com
   - Para resolver basenames

---

## Instalación Local

### 1. Clonar el Repositorio

```bash
cd ~
git clone https://github.com/tu-usuario/TrustGate.git
cd TrustGate
```

### 2. Instalar Dependencias

```bash
# Instalar todas las dependencias del monorepo
npm install

# Esto puede tomar 2-3 minutos
```

**Verificación**:
```bash
# Debe mostrar los 4 workspaces
npm ls --workspaces --depth=0
```

Deberías ver:
- @trustgate/shared
- @trustgate/contracts
- @trustgate/agent
- @trustgate/web

### 3. Build del Package Shared

```bash
npm run build --workspace=packages/shared
```

**Verificación**:
```bash
ls packages/shared/dist/
# Debe mostrar: index.d.ts, index.js, types.d.ts, types.js
```

---

## Configuración de Variables de Entorno

### 1. Contracts Package

```bash
cd packages/contracts
cp .env.example .env
nano .env  # o usa tu editor preferido
```

Completa:
```env
BASE_RPC_URL=https://mainnet.base.org
DEPLOYER_PRIVATE_KEY=tu_private_key_aqui_sin_0x
BASESCAN_API_KEY=tu_basescan_api_key_aqui
OPERATOR_PRIVATE_KEY=tu_operator_private_key_aqui  # Puede ser la misma que deployer
TREASURY_ADDRESS=tu_address_de_treasury  # Donde se reciben fees
```

**⚠️ IMPORTANTE**: Nunca commitees el archivo `.env` a Git. Ya está en `.gitignore`.

### 2. Agent Package

```bash
cd ../agent
cp .env.example .env
nano .env
```

Completa (por ahora con valores placeholder):
```env
# XMTP (opcional por ahora)
XMTP_WALLET_KEY=
XMTP_DB_ENCRYPTION_KEY=
XMTP_ENV=production

# Neynar (opcional)
NEYNAR_API_KEY=

# Contracts (se llenará después del deploy)
CONTRACT_ADDRESS=
ERC8004_REGISTRY_ADDRESS=
ERC8183_FACTORY_ADDRESS=

# Blockchain
RPC_URL=https://mainnet.base.org
BASESCAN_API_KEY=tu_basescan_api_key

# Operator (mismo que contracts)
OPERATOR_PRIVATE_KEY=tu_operator_private_key_aqui

# Fees
CERTIFICATION_FEE_USDC=0.10
EVALUATION_FEE_USDC=0.05
CERT_EXPIRY_DAYS=90

# Treasury (mismo que contracts)
TREASURY_ADDRESS=tu_treasury_address

# Server
PORT=3001

# Timeouts
SKILL_FETCH_TIMEOUT_MS=5000

# Evaluator JSON Updater (auto-update accuracy in evaluator.json)
EVALUATOR_UPDATE_INTERVAL_MS=3600000  # 1 hour
EVALUATOR_JSON_PATH=  # Leave empty for default
```

### 3. Web Package

```bash
cd ../web
cp .env.example .env
nano .env
```

Completa (por ahora con valores placeholder):
```env
# API (se actualizará después del deploy a Railway)
VITE_API_URL=http://localhost:3001

# Contracts (se llenará después del deploy)
VITE_CONTRACT_ADDRESS=
VITE_ERC8004_REGISTRY_ADDRESS=
VITE_ERC8183_FACTORY_ADDRESS=

# Base Mainnet
VITE_CHAIN_ID=8453
VITE_USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
VITE_BASESCAN_URL=https://basescan.org

# TRUSTGATE Agent (se actualizará después)
VITE_AGENT_ADDRESS=
```

---

## Build y Test Local

### 1. Compilar Contratos

```bash
cd ~/TrustGate/packages/contracts
npx hardhat compile
```

**Verificación**:
```bash
ls artifacts/contracts/TrustGateRegistry.sol/
# Debe mostrar: TrustGateRegistry.json y TrustGateRegistry.dbg.json
```

### 2. Ejecutar Tests de Contratos

```bash
npx hardhat test
```

**Resultado esperado**:
```
  TrustGateRegistry
    Deployment
      ✔ Should set the right owner
      ✔ Should set the right operator
      ...

  34 passing (2s)
```

Si todos los tests pasan, los contratos están listos.

### 3. Build del Agent

```bash
cd ../agent
npm run build
```

**Verificación**:
```bash
ls dist/
# Debe mostrar archivos .js compilados
```

### 4. Build del Web

```bash
cd ../web
npm run build
```

**Verificación**:
```bash
ls dist/
# Debe mostrar: index.html, assets/, etc.
```

### 5. Test Local (Opcional)

**Terminal 1 - Backend**:
```bash
cd ~/TrustGate/packages/agent
npm run dev
```

Deberías ver:
```
[Config] Configuration validated
[CertificationEngine] Starting...
[EvaluatorEngine] Starting...
[OutcomeTracker] Starting...
[API] Server listening on port 3001
```

**Terminal 2 - Frontend**:
```bash
cd ~/TrustGate/packages/web
npm run dev
```

Deberías ver:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
```

Abre http://localhost:5173 en tu navegador. Deberías ver la homepage de TRUSTGATE.

**Ctrl+C** en ambos terminales para detener.

---

## Deploy de Contratos a Base Mainnet

### 1. Verificar Balance

```bash
cd ~/TrustGate/packages/contracts

# Crear un script rápido para verificar balance
node -e "
const ethers = require('ethers');
require('dotenv').config();
const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL);
const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
provider.getBalance(wallet.address).then(b =>
  console.log('Balance:', ethers.formatEther(b), 'ETH')
);
"
```

**Necesitas al menos 0.02 ETH para deployment.**

### 2. Deploy TrustGateRegistry

```bash
npx hardhat run scripts/deploy.ts --network base
```

**Resultado esperado**:
```
Deploying TrustGateRegistry to Base mainnet...

Deploying with account: 0xYourAddress
Account balance: 0.05 ETH

Configuration:
  USDC: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
  Operator: 0xYourOperatorAddress
  Treasury: 0xYourTreasuryAddress
  Certification Fee: 0.10 USDC

TrustGateRegistry deployed to: 0xCONTRACT_ADDRESS_AQUI
Transaction hash: 0xTX_HASH

Waiting for block confirmations...

Verifying contract on Basescan...
Contract verified successfully!

=================================
DEPLOYMENT SUMMARY
=================================
Contract Address: 0xCONTRACT_ADDRESS_AQUI
Basescan: https://basescan.org/address/0xCONTRACT_ADDRESS_AQUI
=================================

Add this to your .env files:
CONTRACT_ADDRESS=0xCONTRACT_ADDRESS_AQUI
VITE_CONTRACT_ADDRESS=0xCONTRACT_ADDRESS_AQUI
```

**⚠️ IMPORTANTE**: Guarda el `CONTRACT_ADDRESS` - lo necesitarás en múltiples lugares.

### 3. Actualizar .env Files con Contract Address

**Agent .env**:
```bash
cd ../agent
nano .env
# Actualiza CONTRACT_ADDRESS=0xCONTRACT_ADDRESS_AQUI
```

**Web .env**:
```bash
cd ../web
nano .env
# Actualiza VITE_CONTRACT_ADDRESS=0xCONTRACT_ADDRESS_AQUI
```

### 4. Seed del Contrato (Datos de Ejemplo)

```bash
cd ~/TrustGate/packages/contracts
npx hardhat run scripts/seed.ts --network base
```

Esto crea 8 certificaciones de ejemplo y 3 evaluaciones para que el accuracy score tenga datos iniciales.

**Resultado esperado**:
```
✓ Certified flashoracle.base.eth: TRUSTED (95/100)
✓ Certified tradingbot.base.eth: TRUSTED (88/100)
✓ Certified databot.base.eth: CONDITIONAL (72/100)
...

=================================
FINAL ACCURACY SCORE
=================================
Evaluation Accuracy: 100.00 %
Certification Accuracy: 100.00 %
Total Evaluations: 3
Total Certifications: 8
=================================
```

### 5. Deploy TrustGateHook (Opcional pero Recomendado)

```bash
export HOOK_MINIMUM_LEVEL=2  # 2 = TRUSTED only
npx hardhat run scripts/deployHook.ts --network base
```

**Resultado esperado**:
```
TrustGateHook deployed to: 0xHOOK_ADDRESS_AQUI
Basescan: https://basescan.org/address/0xHOOK_ADDRESS_AQUI
```

**Guarda el `HOOK_ADDRESS`**.

### 6. Actualizar Discovery Files con Addresses

**SKILL.md**:
```bash
cd ~/TrustGate/packages/web/public/.well-known
nano SKILL.md

# Actualiza la línea:
Contract: 0xCONTRACT_ADDRESS_AQUI
```

**evaluator.json**:
```bash
nano evaluator.json

# Actualiza:
"contract": "0xCONTRACT_ADDRESS_AQUI",
"hookContract": "0xHOOK_ADDRESS_AQUI"
```

---

## Deploy del Backend a Railway

### 1. Instalar Railway CLI

```bash
npm install -g @railway/cli
```

### 2. Login a Railway

```bash
railway login
```

Se abrirá tu navegador para autenticar.

### 3. Crear Proyecto

```bash
cd ~/TrustGate/packages/agent
railway init
```

Sigue el prompt:
- **Create new project**: Yes
- **Project name**: trustgate-agent
- **Environment**: production

### 4. Configurar Variables de Entorno en Railway

**Opción A - Via Web Dashboard** (recomendado):
1. Ve a https://railway.app
2. Abre tu proyecto `trustgate-agent`
3. Ve a Variables tab
4. Añade todas las variables del archivo `.env`:
   - `CONTRACT_ADDRESS`
   - `RPC_URL`
   - `OPERATOR_PRIVATE_KEY`
   - `BASESCAN_API_KEY`
   - `TREASURY_ADDRESS`
   - `CERTIFICATION_FEE_USDC`
   - `EVALUATION_FEE_USDC`
   - `CERT_EXPIRY_DAYS`
   - `PORT`
   - `EVALUATOR_UPDATE_INTERVAL_MS` (optional, default: 3600000)
   - `EVALUATOR_JSON_PATH` (optional, leave empty for default)
   - etc.

**Opción B - Via CLI**:
```bash
railway variables set CONTRACT_ADDRESS=0xCONTRACT_ADDRESS_AQUI
railway variables set RPC_URL=https://mainnet.base.org
railway variables set OPERATOR_PRIVATE_KEY=tu_key_aqui
# ... etc para todas las variables
```

### 5. Deploy a Railway

```bash
# Desde ~/TrustGate (root del proyecto)
cd ~/TrustGate
railway up

# Selecciona el servicio: trustgate-agent
```

Railway detectará el Dockerfile y lo usará automáticamente.

**Resultado esperado**:
```
Uploading...
Build started
Building Docker image...
✓ Build successful
Deploying...
✓ Deployment successful

Your service is live at:
https://trustgate-agent-production.up.railway.app
```

### 6. Verificar Deployment

```bash
# Reemplaza con tu URL de Railway
curl https://your-app.railway.app/api/accuracy
```

**Resultado esperado**:
```json
{
  "evaluationAccuracy": 100.00,
  "certificationAccuracy": 100.00,
  "totalEvaluations": 3,
  "totalCertifications": 8
}
```

Si recibes este JSON, el backend está funcionando correctamente.

### 7. Actualizar Web .env con Railway URL

```bash
cd ~/TrustGate/packages/web
nano .env

# Actualiza:
VITE_API_URL=https://your-app.railway.app
```

---

## Deploy del Frontend a Vercel

### 1. Instalar Vercel CLI

```bash
npm install -g vercel
```

### 2. Login a Vercel

```bash
vercel login
```

### 3. Deploy

```bash
cd ~/TrustGate/packages/web
vercel
```

Sigue el prompt:
- **Set up and deploy**: Yes
- **Which scope**: Tu cuenta personal
- **Link to existing project**: No
- **Project name**: trustgate
- **In which directory**: `./` (current directory)
- **Override settings**: No

**Resultado esperado**:
```
Deploying...
✓ Deployment complete

Production: https://trustgate.vercel.app
```

### 4. Configurar Variables de Entorno en Vercel

```bash
# Desde el mismo directorio packages/web
vercel env add VITE_API_URL production
# Pega: https://your-app.railway.app

vercel env add VITE_CONTRACT_ADDRESS production
# Pega: 0xCONTRACT_ADDRESS_AQUI

vercel env add VITE_CHAIN_ID production
# Pega: 8453

vercel env add VITE_USDC_ADDRESS production
# Pega: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913

vercel env add VITE_BASESCAN_URL production
# Pega: https://basescan.org

# ... añade todas las variables VITE_*
```

### 5. Redeploy con Variables

```bash
vercel --prod
```

### 6. Verificar Deployment

Abre https://trustgate.vercel.app en tu navegador.

Deberías ver:
- Homepage con "94.2% ACCURACY" (o el accuracy real del contrato)
- Stats mostrando certifications y evaluations
- Todo con el diseño austero negro y verde

---

## Configuración de Base Mini App

### 1. Verificar Discovery Files

```bash
# SKILL.md
curl https://trustgate.vercel.app/.well-known/SKILL.md

# ITrustGate.sol
curl https://trustgate.vercel.app/.well-known/ITrustGate.sol

# evaluator.json
curl https://trustgate.vercel.app/.well-known/evaluator.json

# farcaster.json
curl https://trustgate.vercel.app/.well-known/farcaster.json
```

Todos deben retornar 200 OK con contenido.

### 2. Generar Account Association

1. Ve a https://www.base.dev/preview?tab=account
2. Pega tu dominio Vercel: `trustgate.vercel.app`
3. Click **Submit**
4. Click **Verify**
5. Firma con tu wallet en MetaMask
6. Copia los 3 campos generados:
   - `header`
   - `payload`
   - `signature`

### 3. Actualizar farcaster.json

```bash
cd ~/TrustGate/packages/web/public/.well-known
nano farcaster.json
```

Pega los valores en `accountAssociation`:
```json
{
  "accountAssociation": {
    "header": "PEGA_AQUI",
    "payload": "PEGA_AQUI",
    "signature": "PEGA_AQUI"
  },
  "miniapp": {
    ...
  }
}
```

### 4. Actualizar URLs en farcaster.json

Reemplaza todas las instancias de `trustgate.vercel.app` con tu dominio real si es diferente.

### 5. Actualizar URLs en Discovery Files

**evaluator.json**:
```json
{
  ...
  "interfaces": {
    "rest": "https://your-app.railway.app",
    ...
  }
}
```

**SKILL.md**: Ya tiene placeholder {CONTRACT_ADDRESS}, reemplázalo con el address real.

### 6. Redeploy Frontend

```bash
vercel --prod
```

### 7. Verificar en Base App (Móvil)

1. Abre Base App en tu móvil
2. Busca "TRUSTGATE"
3. Debería aparecer tu Mini App con icon, hero, screenshots
4. Ábrelo - debería cargar tu frontend

---

## Verificación End-to-End

### 1. Contract Functions

```bash
# Desde packages/contracts con npx hardhat console --network base

const contract = await ethers.getContractAt("TrustGateRegistry", "0xCONTRACT_ADDRESS");

// Get accuracy
const accuracy = await contract.getAccuracyScore();
console.log("Accuracy:", accuracy);

// Get total certifications
const total = await contract.totalCertifications();
console.log("Total Certs:", total.toString());

// Check if an agent is trusted
const trusted = await contract.isTrusted("0x1111111111111111111111111111111111111111");
console.log("Is Trusted:", trusted);
```

### 2. Backend API Endpoints

```bash
# Accuracy
curl https://your-app.railway.app/api/accuracy

# Stats
curl https://your-app.railway.app/api/stats

# Certification
curl https://your-app.railway.app/api/certifications/0x1111111111111111111111111111111111111111

# Batch
curl "https://your-app.railway.app/api/batch-certifications?addresses=0x1111111111111111111111111111111111111111,0x2222222222222222222222222222222222222222"
```

Todos deberían retornar JSON con datos.

### 3. Frontend Pages

Abre en navegador y verifica:
- https://trustgate.vercel.app/ - Homepage con accuracy
- https://trustgate.vercel.app/agent/0x1111111111111111111111111111111111111111 - Agent page con TRUSTED verdict
- https://trustgate.vercel.app/accuracy - Accuracy audit page

### 4. Discovery Files

```bash
curl https://trustgate.vercel.app/.well-known/SKILL.md | grep "TRUSTGATE"
curl https://trustgate.vercel.app/.well-known/ITrustGate.sol | grep "interface ITrustGate"
curl https://trustgate.vercel.app/.well-known/evaluator.json | jq .name
```

---

## Testing de Agent Discovery

### Test 1: SKILL.md Discovery

Simula que eres un agente buscando TRUSTGATE:

```bash
# 1. Descubres basename
BASENAME="trustgate.base.eth"

# 2. Construyes URL de SKILL.md
SKILL_URL="https://$BASENAME/.well-known/SKILL.md"

# 3. Fetcheas SKILL.md (en producción usarías trustgate.vercel.app)
curl https://trustgate.vercel.app/.well-known/SKILL.md
```

Deberías ver todos los endpoints documentados.

### Test 2: Batch Certification Check

Simula que un agente quiere verificar múltiples agentes:

```bash
curl "https://your-app.railway.app/api/batch-certifications?addresses=0x1111111111111111111111111111111111111111,0x2222222222222222222222222222222222222222,0x3333333333333333333333333333333333333333"
```

Resultado esperado:
```json
{
  "results": [
    {
      "address": "0x1111...",
      "level": "TRUSTED",
      "levelCode": 2,
      "score": 95,
      "active": true,
      "expiresAt": 1234567890,
      "certHash": "0x..."
    },
    ...
  ],
  "count": 3,
  "free": 3,
  "paid": 0,
  "fee": 0
}
```

### Test 3: Hook Contract Query

```bash
# Via Hardhat console
const hook = await ethers.getContractAt("TrustGateHook", "0xHOOK_ADDRESS");

// Check requirements
const req = await hook.getRequirements();
console.log("Min Level:", req[2]); // "TRUSTED"

// Check if agent would be approved
const check = await hook.checkAgent("0x1111111111111111111111111111111111111111");
console.log("Approved:", check[0]); // true
console.log("Reason:", check[1]); // "Agent meets requirements"
```

### Test 4: ITrustGate.sol Import

Crea un contrato de prueba:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "https://trustgate.vercel.app/.well-known/ITrustGate.sol";

contract TestIntegration {
    ITrustGate public trustgate;

    constructor(address _trustgate) {
        trustgate = ITrustGate(_trustgate);
    }

    function checkAgent(address agent) public view returns (bool) {
        return trustgate.isTrusted(agent);
    }
}
```

Deploy y verifica que compila correctamente.

---

## Troubleshooting

### Problema: "Cannot find module" durante npm install

**Solución**:
```bash
rm -rf node_modules package-lock.json
rm -rf packages/*/node_modules
npm install
```

### Problema: Tests de contratos fallan

**Solución**:
```bash
cd packages/contracts
npx hardhat clean
npx hardhat compile
npx hardhat test
```

### Problema: Backend no arranca en Railway

**Verificar**:
1. Variables de entorno están configuradas
2. `CONTRACT_ADDRESS` es válido
3. `OPERATOR_PRIVATE_KEY` es correcto
4. Railway logs: `railway logs`

### Problema: Frontend muestra "Loading..." indefinidamente

**Verificar**:
1. `VITE_API_URL` apunta a Railway URL
2. Railway backend está running
3. CORS está habilitado en backend (ya está en código)
4. Browser console para ver errores de red

### Problema: SKILL.md retorna 404

**Verificar**:
1. Archivo existe en `packages/web/public/.well-known/SKILL.md`
2. Vercel deployment incluyó archivos `.well-known/`
3. Path es exactamente `/.well-known/SKILL.md` (case-sensitive)
4. Redeploy con `vercel --prod`

### Problema: Contract verification falla en Basescan

**Solución**:
```bash
# Re-verificar manualmente
npx hardhat verify --network base 0xCONTRACT_ADDRESS "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" "0xOPERATOR_ADDRESS" "0xTREASURY_ADDRESS" "100000"
```

(El último argumento es el fee: 0.10 USDC = 100000 con 6 decimals)

### Problema: Accuracy score muestra 0%

**Causa**: Contrato sin seed data.

**Solución**:
```bash
cd packages/contracts
npx hardhat run scripts/seed.ts --network base
```

### Problema: Railway deployment falla con "EBADENGINE"

**Causa**: Railway usa Node 20 pero XMTP requiere Node 22.

**Solución**: Railway debería usar el Dockerfile que especifica Node 22. Verifica:
1. `railway.toml` existe
2. Dockerfile tiene `FROM node:22-alpine`
3. Railway settings → Deployment → Builder = Dockerfile

---

## Checklist Final

Usa esto para verificar que todo está correcto:

**Contratos**:
- [ ] TrustGateRegistry deployado y verificado en Basescan
- [ ] TrustGateHook deployado y verificado en Basescan
- [ ] Seed data creado (8 certs, 3 evals)
- [ ] Accuracy score > 0% en el contrato

**Backend**:
- [ ] Deployado en Railway
- [ ] Health check `/api/accuracy` retorna JSON
- [ ] Batch endpoint funciona
- [ ] Logs no muestran errores

**Frontend**:
- [ ] Deployado en Vercel
- [ ] Homepage carga y muestra accuracy
- [ ] AgentPage muestra verdicts con colores correctos
- [ ] AccuracyPage muestra stats del contrato

**Discovery**:
- [ ] `/.well-known/SKILL.md` accesible
- [ ] `/.well-known/ITrustGate.sol` accesible
- [ ] `/.well-known/evaluator.json` accesible
- [ ] `/.well-known/farcaster.json` con accountAssociation

**Base Mini App**:
- [ ] Todas las imágenes PNG existen
- [ ] farcaster.json tiene accountAssociation firmado
- [ ] Búsqueda en Base App encuentra TRUSTGATE
- [ ] Mini App abre correctamente

**Integración**:
- [ ] Contract addresses correctos en todos los .env
- [ ] Railway URL correcta en web .env
- [ ] Hook address en evaluator.json
- [ ] Contract address en SKILL.md

---

## Siguientes Pasos

Una vez que todo está funcionando:

1. **Completa XMTP Integration**:
   - Genera XMTP credentials
   - Implementa handler XMTP con comandos
   - Prueba certificación via XMTP

2. **Completa ERC-8004/ERC-8183 Integration**:
   - Conecta con registries reales
   - Fetch datos reales de agentes
   - Monitor job events en tiempo real

3. **Crea SDK Package**:
   - Publica `@trustgate/sdk` en npm
   - Documenta con ejemplos
   - Comparte con comunidad de agentes

4. **Monitoreo**:
   - Configura alertas en Railway
   - Monitorea Basescan para transacciones
   - Trackea accuracy score onchain

5. **Marketing**:
   - Comparte en Farcaster
   - Post en Twitter/X
   - Demo en comunidad Base

---

## Recursos Adicionales

- **Documentación Base**: https://docs.base.org
- **Hardhat Docs**: https://hardhat.org/docs
- **Railway Docs**: https://docs.railway.app
- **Vercel Docs**: https://vercel.com/docs
- **XMTP Docs**: https://xmtp.org/docs
- **Agent App Framework**: https://github.com/base-org/agent-app-framework

---

## Soporte

Si encuentras problemas:

1. Revisa los logs:
   - Railway: `railway logs`
   - Vercel: Dashboard → Deployment → Logs
   - Hardhat: output en terminal

2. Verifica variables de entorno están correctas

3. Consulta `TROUBLESHOOTING` section arriba

4. Reporta issues en GitHub: https://github.com/tu-usuario/TrustGate/issues

---

**¡TRUSTGATE está listo para certificar agentes onchain!** 🚀

La infraestructura de confianza para el ecosistema de agentes IA en Base está operativa.
