# 0xLeaked

**Plataforma modular de seguridad digital Web3 sobre Monad.**

0xLeaked conecta detección de filtraciones de datos, auditoría de contratos inteligentes y acciones de remediación desde la wallet del usuario. La evidencia queda registrada on-chain con prueba criptográfica (EIP-712), sin exponer datos sensibles en claro.

**Red:** Monad Testnet · Chain ID `10143` · [MonadExplorer](https://testnet.monadexplorer.com)

---

## Smart Contracts

> Punto de entrada para revisión técnica. Código fuente, ABI y direcciones desplegadas.

| Contrato | Función | Código fuente | Explorer |
|---|---|---|---|
| **BreachRegistry** | Registro inmutable de brechas (hash + metadata) | [BreachRegistry.sol](https://github.com/Mariana-Codebase/0xLeakedMonad/blob/main/contracts/contracts/BreachRegistry.sol) | `https://testnet.monadexplorer.com/address/{BREACH_REGISTRY}` |
| **AlertOracle** | Scores de riesgo de contratos (0–100), consultables por la comunidad | [AlertOracle.sol](https://github.com/Mariana-Codebase/0xLeakedMonad/blob/main/contracts/contracts/AlertOracle.sol) | `https://testnet.monadexplorer.com/address/{ALERT_ORACLE}` |
| **RemediationVault** | Bóveda personal sin custodia para MON y ERC-20 en emergencias | [RemediationVault.sol](https://github.com/Mariana-Codebase/0xLeakedMonad/blob/main/contracts/contracts/RemediationVault.sol) | `https://testnet.monadexplorer.com/address/{REMEDIATION_VAULT}` |

**Recursos adicionales**

- [ABI exportados](packages/abi/) — interfaces usadas por frontend y servicios
- [Tests](contracts/test/BreachRegistry.test.ts) — suite Hardhat del registro de brechas
- [Script de deploy](contracts/scripts/deploy.ts) — `pnpm --filter @0xleaked/contracts deploy:monad`

Las direcciones desplegadas las imprime el script de deploy; sustitúyelas en la columna Explorer o configúralas en `.env`.

### Diseño on-chain

Los contratos `BreachRegistry` y `AlertOracle` usan **EIP-712**: el backend firma la evidencia off-chain y cualquier usuario puede enviar la transacción on-chain. Esto garantiza que solo un verifier autorizado puede registrar datos, mientras el usuario mantiene control de su wallet.

`RemediationVault` separa balances por usuario. El owner solo puede pausar el contrato; **no puede mover fondos ajenos**.

---

## Por qué existe

Cada año se filtran miles de millones de registros personales. En Web3, además, los usuarios interactúan con contratos que pueden ser honeypots, rugs o proxies maliciosos. Hoy la mayoría de herramientas de seguridad son centralizadas, opacas o no dejan prueba verificable.

**0xLeaked resuelve tres problemas concretos:**

1. **Sin prueba verificable** — Si tu email fue filtrado, no tienes evidencia auditable para reclamos o auditorías.
2. **Riesgo invisible** — Interactuar con un contrato peligroso no deja registro compartido para otros usuarios.
3. **Parálisis ante incidentes** — Tras detectar riesgo, no hay un flujo claro para proteger fondos mientras mitigas approvals.

---

## Impacto

| Área | Qué aporta |
|---|---|
| **Privacidad** | El dato sensible se hashea (`keccak256`) antes de cualquier registro on-chain. HIBP usa k-anonimato para contraseñas. |
| **Prueba criptográfica** | Cada brecha y score de riesgo queda ligado a una firma EIP-712 de un verifier autorizado. |
| **Transparencia comunitaria** | `AlertOracle` expone scores de contratos sospechosos para que otros usuarios consulten antes de firmar. |
| **Soberanía del usuario** | Sin signup, sin custodia. Acciones críticas se firman desde la wallet del usuario. |

---

## Escalabilidad

La arquitectura está pensada para crecer sin reescribir el núcleo:

- **Monorepo modular** — Frontend, gateway, servicios y contratos evolucionan de forma independiente (`pnpm` workspaces).
- **Microservicios stateless** — `breach`, `analyzer` y `alert` escalan horizontalmente; no dependen de una base de datos central.
- **On-chain como fuente de verdad** — El estado persistente vive en Monad + IPFS, no en PostgreSQL. Menos cuellos de botella operativos.
- **IPFS para metadata** — Los detalles de brechas y análisis se almacenan off-chain (Pinata); on-chain solo el hash y el CID.
- **Monad como capa de ejecución** — EVM compatible, finalidad rápida y alto throughput para registros frecuentes de evidencia.
- **Verifiers extensibles** — Nuevos indexadores pueden autorizarse on-chain sin redeploy del contrato.

---

## Flujo de la aplicación

```
Usuario (browser)
    │
    ├─ Breach Scanner ──▶ API Gateway ──▶ breach-service ──▶ HIBP
    │                                              │
    │                                              ├─ IPFS (metadata)
    │                                              └─ BreachRegistry (Monad)
    │
    ├─ Contract Auditor ──▶ API Gateway ──▶ analyzer-service ──▶ bytecode RPC
    │                                              │
    │                                              └─ AlertOracle (Monad)
    │
    ├─ Remediation Hub ──▶ wallet ──▶ RemediationVault (Monad)
    │
    └─ Alertas ◀── WebSocket ◀── API Gateway ◀── Alchemy Webhooks
```

**Breach Scanner:** el usuario ingresa email, teléfono o wallet → el servicio consulta fuentes de brechas → sube metadata a IPFS → firma EIP-712 → registra hash on-chain.

**Contract Auditor:** el usuario pega una dirección → análisis heurístico de bytecode (opcodes peligrosos, proxies, blacklist) → score 0–100 → si el riesgo es alto, se publica en `AlertOracle`.

**Remediation Hub:** tras una alerta, el usuario deposita MON/ERC-20 en su bóveda personal, revoca approvals y retira cuando mitiga el riesgo.

---

## Stack tecnológico

Solo tecnologías presentes y activas en el código:

| Capa | Tecnología |
|---|---|
| **Blockchain** | [Monad Testnet](https://docs.monad.xyz), Solidity 0.8.24, [OpenZeppelin 5](https://openzeppelin.com/contracts/) |
| **Contratos** | Hardhat, EIP-712, viem (interacción server-side) |
| **Frontend** | Next.js 14, React 18, TypeScript, Tailwind CSS, Recharts |
| **Wallet** | [Reown AppKit](https://reown.com) + wagmi + viem (WalletConnect e injected wallets) |
| **Backend** | Express 5, TypeScript, WebSocket (`ws`) |
| **Datos off-chain** | [Have I Been Pwned API](https://haveibeenpwned.com), IPFS via [Pinata](https://pinata.cloud) |
| **Infra Web3** | [Alchemy](https://alchemy.com) (RPC Monad + webhooks on-chain) |
| **Monorepo** | pnpm workspaces, Node.js 20+ |

---

## Inicio rápido

```powershell
git clone https://github.com/Mariana-Codebase/0xLeakedMonad.git
cd 0xLeakedMonad
corepack enable
pnpm install
```

Configura `.env` en la raíz (RPC de Alchemy, claves HIBP/Pinata opcionales, private key de deploy).

```powershell
# Todos los servicios en paralelo
pnpm dev

# O por separado
pnpm dev:web        # http://localhost:3000
pnpm dev:api        # http://localhost:4000
pnpm dev:breach     # :4101
pnpm dev:analyzer   # :4102
pnpm dev:alert      # :4103
```

### Deploy de contratos

```powershell
pnpm --filter @0xleaked/contracts deploy:monad
```

El script imprime las direcciones para `.env` (`BREACH_REGISTRY_ADDRESS`, `ALERT_ORACLE_ADDRESS`, `REMEDIATION_VAULT_ADDRESS`).

---

## Estructura del repositorio

```
0xLeaked/
├── apps/web/              # Frontend Next.js
├── apps/api-gateway/      # Gateway + webhooks Alchemy + WebSocket
├── services/
│   ├── breach/            # Detección HIBP + registro on-chain
│   ├── analyzer/          # Auditoría de bytecode + AlertOracle
│   └── alert/             # Notificaciones internas
├── contracts/             # Solidity + Hardhat
└── packages/
    ├── abi/               # ABIs compartidos
    ├── chain/             # Cliente Monad + firmas EIP-712
    └── ipfs/              # Cliente Pinata/IPFS
```

---

## Estado del proyecto

| Módulo | Estado |
|---|---|
| Breach Scanner (HIBP + hash + IPFS) | ✅ |
| Breach Scanner (registro on-chain) | ✅ |
| Contract Auditor (bytecode + score) | ✅ |
| Contract Auditor (publicación en AlertOracle) | ✅ |
| Remediation Hub (vault deposit/withdraw) | ✅ |
| Alertas WebSocket + webhooks Alchemy | ✅ |

---

## Licencia

MIT
