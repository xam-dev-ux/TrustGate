# Manual Contract Verification on Basescan

Due to Basescan API V1 deprecation, aquí están las instrucciones para verificar los contratos manualmente.

## Contratos Desplegados

1. **TrustGateRegistry**: `0x076DE55BeEB794Ce92F406C05834b69Cc915B7e8`
2. **TrustScoreNFT**: `0xC2c20B3a529eA7F4ceEaB22C30875D89BaCD9539`
3. **TrustGateStakingPool**: `0xE275e2cFe9794252a4858d1859a065D1D9768b74`

## Archivos Flatten Generados

Los archivos flatten están en `packages/contracts/flatten/`:
- `TrustGateRegistry.sol` (32KB)
- `TrustScoreNFT.sol` (167KB)
- `TrustGateStakingPool.sol` (195KB)

---

## 1. TrustGateRegistry

### URL de Verificación
https://basescan.org/verifyContract?a=0x076DE55BeEB794Ce92F406C05834b69Cc915B7e8

### Parámetros de Verificación

**Contract Address**: `0x076DE55BeEB794Ce92F406C05834b69Cc915B7e8`

**Compiler Type**: Solidity (Single file)

**Compiler Version**: `v0.8.24+commit.e11b9ed9`

**Open Source License Type**: MIT License (3)

**Optimization**: Yes, with 200 runs

**EVM Version**: cancun

**Via IR**: Yes (enable via IR compilation)

**Source Code**: Copiar todo el contenido de `flatten/TrustGateRegistry.sol`

**Contract Name**: `TrustGateRegistry`

### Constructor Arguments (ABI-encoded)

```
0000000000000000000000000833589fcd6edb6e08f4c7c32d4f71b54bda02913000000000000000000000000c9770789196eb22747fbf4098ae61ce8c5038daf000000000000000000000000c9770789196eb22747fbf4098ae61ce8c5038daf00000000000000000000000000000000000000000000000000000000000186a0
```

**Desglose**:
- USDC Address: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- Operator Address: `0xc9770789196Eb22747Fbf4098AE61cE8C5038DaF`
- Treasury Address: `0xc9770789196Eb22747Fbf4098AE61cE8C5038DaF`
- Certification Fee: `100000` (0.10 USDC, 6 decimals)

---

## 2. TrustScoreNFT

### URL de Verificación
https://basescan.org/verifyContract?a=0xC2c20B3a529eA7F4ceEaB22C30875D89BaCD9539

### Parámetros de Verificación

**Contract Address**: `0xC2c20B3a529eA7F4ceEaB22C30875D89BaCD9539`

**Compiler Type**: Solidity (Single file)

**Compiler Version**: `v0.8.24+commit.e11b9ed9`

**Open Source License Type**: MIT License (3)

**Optimization**: Yes, with 200 runs

**EVM Version**: cancun

**Via IR**: Yes

**Source Code**: Copiar todo el contenido de `flatten/TrustScoreNFT.sol`

**Contract Name**: `TrustScoreNFT`

### Constructor Arguments (ABI-encoded)

```
0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000076de55beeb794ce92f406c05834b69cc915b7e8
```

**Desglose**:
- Staking Pool: `0x0000000000000000000000000000000000000000` (ZeroAddress, configured later)
- TrustGate: `0x076DE55BeEB794Ce92F406C05834b69Cc915B7e8`

---

## 3. TrustGateStakingPool

### URL de Verificación
https://basescan.org/verifyContract?a=0xE275e2cFe9794252a4858d1859a065D1D9768b74

### Parámetros de Verificación

**Contract Address**: `0xE275e2cFe9794252a4858d1859a065D1D9768b74`

**Compiler Type**: Solidity (Single file)

**Compiler Version**: `v0.8.24+commit.e11b9ed9`

**Open Source License Type**: MIT License (3)

**Optimization**: Yes, with 200 runs

**EVM Version**: cancun

**Via IR**: Yes

**Source Code**: Copiar todo el contenido de `flatten/TrustGateStakingPool.sol`

**Contract Name**: `TrustGateStakingPool`

### Constructor Arguments (ABI-encoded)

```
0000000000000000000000000833589fcd6edb6e08f4c7c32d4f71b54bda02913000000000000000000000000076de55beeb794ce92f406c05834b69cc915b7e8000000000000000000000000c2c20b3a529ea7f4ceeab22c30875d89bacd9539000000000000000000000000c9770789196eb22747fbf4098ae61ce8c5038daf00000000000000000000000000000000000000000000000000000000000186a0000000000000000000000000000000000000000000000000000000000f424000000000000000000000000000000000000000000000000000000000009896800000000000000000000000000000000000000000000000000000000000000005
```

**Desglose**:
- USDC: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- TrustGate: `0x076DE55BeEB794Ce92F406C05834b69Cc915B7e8`
- NFT: `0xC2c20B3a529eA7F4ceEaB22C30875D89BaCD9539`
- Treasury: `0xc9770789196Eb22747Fbf4098AE61cE8C5038DaF`
- Min CONDITIONAL: `100000` (0.1 USDC)
- Min TRUSTED: `1000000` (1 USDC)
- Min VERIFIED: `10000000` (10 USDC)
- Leverage: `5`

---

## Pasos para Verificar Cada Contrato

1. **Abrir URL de verificación** del contrato en tu navegador
2. **Pegar el Contract Address** correspondiente
3. **Seleccionar**:
   - Compiler Type: `Solidity (Single file)`
   - Compiler Version: `v0.8.24+commit.e11b9ed9`
   - License: `3) MIT License`
4. **Click "Continue"**
5. **En el formulario de verificación**:
   - Optimization: `Yes`
   - Runs: `200`
   - EVM Version: `cancun`
   - **IMPORTANTE**: Marcar "Enable experimental features" y seleccionar "Via IR"
6. **Pegar el código** completo del archivo flatten correspondiente en "Enter the Solidity Contract Code"
7. **Pegar Constructor Arguments** (ABI-encoded) del contrato correspondiente
8. **Click "Verify and Publish"**

## Verificación Exitosa

Una vez verificados, los contratos mostrarán:
- ✅ Checkmark verde en Basescan
- Tab "Contract" con código fuente
- Tab "Read Contract" para queries
- Tab "Write Contract" para transacciones

## Links Finales

Después de verificar, los contratos estarán disponibles en:

- https://basescan.org/address/0x076DE55BeEB794Ce92F406C05834b69Cc915B7e8#code
- https://basescan.org/address/0xC2c20B3a529eA7F4ceEaB22C30875D89BaCD9539#code
- https://basescan.org/address/0xE275e2cFe9794252a4858d1859a065D1D9768b74#code

---

## Notas

- Los archivos flatten ya tienen las licencias SPDX limpias (sin duplicados)
- Asegúrate de seleccionar **cancun** como EVM version
- Asegúrate de habilitar **Via IR** en experimental features
- Si falla la verificación, revisa que los Constructor Arguments sean exactos
- Basescan puede tardar 30-60 segundos en procesar la verificación
