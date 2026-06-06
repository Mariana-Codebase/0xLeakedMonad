# 0xLeaked

**Plataforma modular de seguridad digital Web3.**

0xLeaked detecta si tus datos han sido filtrados, audita contratos inteligentes sospechosos y te permite actuar directamente desde tu wallet. Todo con una prueba criptográfica e inmutable en la blockchain de Monad.

---

## ¿Qué hace exactamente?

### Módulo 1 — Breach Scanner
El usuario escribe su email, teléfono o dirección de wallet. La plataforma consulta HaveIBeenPwned (HIBP) y detecta si ese dato aparece en alguna filtración conocida. **El dato nunca sale del navegador en claro**: se hashea con keccak256 antes de registrarse en Monad. El resultado queda guardado para siempre en el contrato `BreachRegistry.sol`.

### Módulo 2 — Contract Auditor
El usuario pega la dirección de cualquier contrato en Monad. El analyzer-service analiza patrones de riesgo (honeypots, rug pulls, permisos excesivos) y devuelve un score del 0 al 100. El score puede registrarse en `AlertOracle.sol` para que toda la comunidad lo vea.

### Módulo 3 — Remediation Hub *(planificado)*
Una vez que el usuario conoce su situación de riesgo, puede revocar approvals de contratos comprometidos, mover fondos a `RemediationVault.sol` y recibir una guía paso a paso.

---

## Arquitectura del proyecto

Este es un **monorepo** (un solo repositorio que contiene todo el proyecto). Esto significa que el frontend, los servicios de backend y los contratos viven juntos, pero cada uno es independiente.

```
0xLeaked/
│
├── apps/
│   ├── web/              # Frontend — Next.js 14 + TypeScript + Tailwind
│   └── api-gateway/      # Puerta de entrada del backend (puerto 4000)
│
├── services/
│   ├── breach/           # Modulo 1: consulta HIBP, detecta filtraciones (puerto 4101)
│   ├── analyzer/         # Modulo 2: analiza contratos, da score de riesgo (puerto 4102)
│   └── alert/            # Sistema de alertas internas (puerto 4103)
│
├── contracts/            # Contratos Solidity + scripts Hardhat para Monad
│   └── contracts/
│       ├── BreachRegistry.sol    # Guarda hashes de filtraciones on-chain
│       ├── AlertOracle.sol       # Scores de riesgo de contratos, publicos
│       └── RemediationVault.sol  # Boveda segura para acciones de remediacion
│
├── packages/
│   └── abi/              # ABIs exportados para que el frontend sepa hablar con los contratos
│
├── docker-compose.yml    # Levanta PostgreSQL y Redis localmente
├── .env.example          # Plantilla de variables de entorno
└── pnpm-workspace.yaml   # Define los workspaces del monorepo
```

---

## ¿Cómo funciona el flujo de datos?

```
Navegador (usuario)
    │
    ▼
apps/web (Next.js, puerto 3000)
    │  llama a
    ▼
apps/api-gateway (Express, puerto 4000)   ←── Alchemy Webhooks (eventos on-chain)
    │  reenvía a
    ├──▶ services/breach   (puerto 4101)  →  HIBP API
    ├──▶ services/analyzer (puerto 4102)  →  Alchemy Simulate (próximamente)
    └──▶ services/alert    (puerto 4103)  →  guarda alertas

Para transacciones on-chain:
Navegador → MetaMask → Monad testnet → BreachRegistry.sol
```

---

## APIs y servicios externos necesarios

| API / Servicio | Para qué sirve | Dónde obtenerla |
|---|---|---|
| **Alchemy** | RPC de Monad + webhooks on-chain | [alchemy.com](https://www.alchemy.com) → crear app en Monad Testnet |
| **HIBP** | Detectar filtraciones de email | [haveibeenpwned.com/API/Key](https://haveibeenpwned.com/API/Key) (pago, ~$3.50/mes) |
| **MetaMask** | Wallet del usuario para firmar txs | Extensión de navegador, no requiere API key |
| **ngrok** | Exponer el webhook local a Alchemy | [ngrok.com](https://ngrok.com) (plan gratuito funciona) |

> **Sin HIBP API Key:** el scan de emails usará una heurística local (solo para demo). Las demás funciones siguen funcionando.

---

## Requisitos previos

- **Node.js 20+** — [nodejs.org](https://nodejs.org)
- **pnpm 9+** — `npm install -g pnpm`
- **Docker Desktop** — para PostgreSQL y Redis locales
- **MetaMask** — instalado en tu navegador
- MON testnet en tu wallet (faucets oficiales: [faucet.monad.xyz](https://faucet.monad.xyz) o [monad.faucetme.pro](https://monad.faucetme.pro))

---

## Inicio rápido (Windows PowerShell)

### 1. Clonar e instalar dependencias
```powershell
git clone <url-del-repo>
cd 0xLeaked
corepack enable
pnpm install
```

### 2. Configurar variables de entorno
```powershell
Copy-Item .env.example .env
```
Abre `.env` y completa al menos estas variables:
```
ALCHEMY_API_KEY=tu_key_de_alchemy
MONAD_RPC_URL=https://monad-testnet.g.alchemy.com/v2/tu_key_de_alchemy
NEXT_PUBLIC_MONAD_RPC_URL=https://monad-testnet.g.alchemy.com/v2/tu_key_de_alchemy
HIBP_API_KEY=tu_key_de_hibp          # opcional pero recomendado
```

### 3. Levantar base de datos y Redis con Docker
```powershell
docker compose up -d
```

### 4. Iniciar todos los servicios (cada uno en una terminal separada)
```powershell
pnpm dev:web       # Frontend  → http://localhost:3000
pnpm dev:api       # Gateway   → http://localhost:4000
pnpm dev:breach    # Breach    → http://localhost:4101
pnpm dev:analyzer  # Analyzer  → http://localhost:4102
pnpm dev:alert     # Alertas   → http://localhost:4103
```

### 5. Verificar que todo funciona
Abre en el navegador:
- Frontend: http://localhost:3000
- Health del gateway: http://localhost:4000/health
- Módulos disponibles: http://localhost:4000/api/modules

---

## Deploy de contratos en Monad testnet

Necesitas MON testnet en tu wallet antes de este paso.

### 1. Obtener la private key de deploy
En MetaMask → menú de cuenta → Detalles de cuenta → Mostrar clave privada.  
Usa una wallet dedicada para deploy, **nunca tu wallet personal con fondos reales**.

### 2. Configurar en .env
```
DEPLOYER_PRIVATE_KEY=0x_tu_private_key_aqui
```

### 3. Desplegar
```powershell
pnpm --filter @0xleaked/contracts deploy:monad
```

### 4. Copiar las direcciones al .env
El script imprime las direcciones. Cópialas:
```
BREACH_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_BREACH_REGISTRY_ADDRESS=0x...
ALERT_ORACLE_ADDRESS=0x...
REMEDIATION_VAULT_ADDRESS=0x...
```

---

## Configurar webhooks de Alchemy (alertas on-chain)

Los webhooks permiten que Alchemy avise a 0xLeaked cuando detecta actividad sospechosa en la blockchain.

### 1. Exponer el servidor local con ngrok
```powershell
ngrok http 4000
```
Copia la URL que genera ngrok (ej: `https://abc123.ngrok-free.app`).

### 2. Crear webhook en Alchemy
1. Dashboard de Alchemy → Webhooks → Create Webhook
2. Tipo: **Address Activity**
3. URL: `https://abc123.ngrok-free.app/api/webhooks/alchemy`
4. Copia el **Signing Key** y ponlo en `.env` como `ALCHEMY_WEBHOOK_SIGNING_KEY`

### 3. Verificar eventos recibidos
```
GET http://localhost:4000/api/webhooks/alchemy/events
```

---

## Variables de entorno — referencia rápida

| Variable | Descripción |
|---|---|
| `ALCHEMY_API_KEY` | Clave de Alchemy para RPC y webhooks |
| `MONAD_RPC_URL` | URL completa del RPC de Monad (incluye la key) |
| `HIBP_API_KEY` | Clave de HaveIBeenPwned para detección de brechas |
| `DEPLOYER_PRIVATE_KEY` | Private key para deploy de contratos (solo local/CI) |
| `ALCHEMY_WEBHOOK_SIGNING_KEY` | Verifica que los webhooks vienen de Alchemy |
| `BREACH_REGISTRY_ADDRESS` | Dirección del contrato desplegado en Monad |
| `NEXT_PUBLIC_BREACH_REGISTRY_ADDRESS` | Lo mismo, expuesto al navegador |
| `NEXT_PUBLIC_API_GATEWAY_URL` | URL del gateway que llama el frontend |
| `DATABASE_URL` | PostgreSQL local (Docker lo levanta automáticamente) |

---

## División de trabajo por módulo

| Módulo | Archivos principales |
|---|---|
| **Frontend / UX** | `apps/web/app/`, `apps/web/components/`, `apps/web/app/globals.css` |
| **Conexión Web3 / MetaMask** | `apps/web/lib/useWallet.ts`, `apps/web/lib/web3.ts`, `apps/web/lib/monadChain.ts` |
| **API Gateway** | `apps/api-gateway/src/index.ts`, `apps/api-gateway/src/config.ts` |
| **Breach Scanner** | `services/breach/src/index.ts` |
| **Contract Auditor** | `services/analyzer/src/index.ts` |
| **Alertas** | `services/alert/src/index.ts` |
| **Contratos Solidity** | `contracts/contracts/`, `contracts/scripts/deploy.ts` |

---

## Convenciones de ramas

| Rama | Para qué |
|---|---|
| `main` | Código estable, listo para demo |
| `develop` | Integración de features antes de pasar a main |
| `feature/nombre` | Nueva funcionalidad (ej: `feature/remediation-hub`) |
| `fix/nombre` | Corrección de bug (ej: `fix/metamask-reconnect`) |
| `contracts/nombre` | Cambios en Solidity (ej: `contracts/breach-registry-v2`) |

---

## Estado del proyecto

| Módulo | Estado |
|---|---|
| Breach Scanner (scan + HIBP) | ✅ Funcional |
| Breach Scanner (registro on-chain) | ⏳ Pendiente deploy del contrato |
| Contract Auditor (análisis básico) | ✅ Funcional |
| Contract Auditor (Alchemy Simulate) | 🔜 Planificado Sprint 3 |
| Remediation Hub | 🔜 Planificado Sprint 4 |
| Alertas en tiempo real (WebSocket) | 🔜 Planificado Sprint 3 |
| Webhooks de Alchemy | ✅ Funcional |

---

## Scripts disponibles en la raíz

```powershell
pnpm dev:web        # Inicia el frontend (Next.js)
pnpm dev:api        # Inicia el API Gateway
pnpm dev:breach     # Inicia el Breach Service
pnpm dev:analyzer   # Inicia el Analyzer Service
pnpm dev:alert      # Inicia el Alert Service
pnpm build          # Compila todos los workspaces
```

---

> **¿Dudas?** Revisa `CONTRIBUTING.md` para las convenciones del equipo o abre un issue.
