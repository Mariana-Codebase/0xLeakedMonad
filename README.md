# 0xLeaked

**Infraestructura de ciberinteligencia Web3 para detección, alerta y remediación de identidades expuestas en la dark web — con registro criptográfico inmutable sobre Monad.**

> **Definición:** 0xLeaked es un sistema modular de seguridad digital que monitoriza bases de filtraciones, mercados clandestinos y señales de la deep web para identificar cuándo tu email, wallet o credenciales han sido comprometidos. Cuando hay match, registra evidencia verificable con firmas EIP-712 y te permite actuar desde tu wallet: auditar contratos sospechosos (agente **Claude Sonnet 4**), publicar scores de riesgo comunitarios y — en desarrollo — aislar fondos en una bóveda sin custodia y recibir alertas en tiempo real.

Tus datos ya pueden estar circulando en foros, paste sites y dumps de la dark web sin que lo sepas. 0xLeaked cierra esa ventana ciega: **detecta → alerta → prueba on-chain → remedia** — en segundos, no en meses.

**Red:** Monad Testnet · Chain ID `10143` · [MonadExplorer](https://testnet.monadexplorer.com)

<p align="left">
  <img src="https://img.shields.io/badge/Network-Monad_Testnet-8B5CF6?style=for-the-badge"/>
  <img src="https://img.shields.io/badge/Solidity-0.8.24-363636?style=for-the-badge&logo=solidity&logoColor=white"/>
  <img src="https://img.shields.io/badge/EIP--712-Signed_Evidence-10B981?style=for-the-badge"/>
  <img src="https://img.shields.io/badge/Dark_Web-Intel-DC2626?style=for-the-badge"/>
  <img src="https://img.shields.io/badge/Alerts-Real--Time-3A6FFF?style=for-the-badge"/>
</p>

---

## Smart Contracts

> Punto de entrada para revisión técnica. Código fuente, ABI y direcciones desplegadas.

| Contrato | Función | Código fuente | Dirección |
|---|---|---|---|
| **BreachRegistry** | Registro inmutable de brechas (hash + metadata) | [BreachRegistry.sol](https://github.com/Mariana-Codebase/0xLeakedMonad/blob/main/contracts/contracts/BreachRegistry.sol) | [`0xC51DD0aD6593559F3E696b2281E9F6fa5D2af09E`](https://testnet.monadexplorer.com/address/0xC51DD0aD6593559F3E696b2281E9F6fa5D2af09E) |
| **AlertOracle** | Scores de riesgo de contratos (0–100), consultables por la comunidad | [AlertOracle.sol](https://github.com/Mariana-Codebase/0xLeakedMonad/blob/main/contracts/contracts/AlertOracle.sol) | [`0x4B9214a1349825373854fb9cBdFDdb585FB45587`](https://testnet.monadexplorer.com/address/0x4B9214a1349825373854fb9cBdFDdb585FB45587) |
| **RemediationVault** | Bóveda personal sin custodia para MON y ERC-20 en emergencias | [RemediationVault.sol](https://github.com/Mariana-Codebase/0xLeakedMonad/blob/main/contracts/contracts/RemediationVault.sol) | [`0x68B31918a3827818097936b503bFf3378a932838`](https://testnet.monadexplorer.com/address/0x68B31918a3827818097936b503bFf3378a932838) |

**Recursos adicionales**

- [ABI exportados](packages/abi/) — interfaces usadas por frontend y servicios
- [Tests](contracts/test/BreachRegistry.test.ts) — suite Hardhat del registro de brechas
- [Script de deploy](contracts/scripts/deploy.ts) — `pnpm --filter @0xleaked/contracts deploy:monad`

### Diseño on-chain

Los contratos `BreachRegistry` y `AlertOracle` usan **EIP-712**: el backend firma la evidencia off-chain y cualquier usuario puede enviar la transacción on-chain. Esto garantiza que solo un verifier autorizado puede registrar datos, mientras el usuario mantiene control de su wallet.

`RemediationVault` separa balances por usuario. El owner solo puede pausar el contrato; **no puede mover fondos ajenos**.

---

## Por qué existe

Cada año se filtran miles de millones de registros. Gran parte termina en la **dark web** — foros, mercados clandestinos y dumps públicos donde tus credenciales se venden o reutilizan antes de que te enteres. En Web3, además, firmas transacciones contra contratos honeypot sin saberlo. Las herramientas actuales son lentas, centralizadas y no dejan prueba auditable.

1. **Exposición invisible** — Tus datos pueden estar en la deep web y nadie te avisa a tiempo.
2. **Sin prueba verificable** — Si fuiste filtrado, no tienes evidencia on-chain para reclamos o auditorías.
3. **Riesgo on-chain oculto** — Contratos maliciosos no dejan registro compartido para la comunidad.
4. **Parálisis ante incidentes** — Tras la alerta, no hay un flujo claro para proteger fondos mientras revocas approvals.

---

## Impacto

| Área | Qué aporta |
|---|---|
| **Detección dark web** | Cruza HIBP (+700M cuentas), leak databases y señales de exposición en la deep web. El dato sensible nunca se registra en claro: se hashea con `keccak256`. |
| **Alerta instantánea** | WebSocket + webhooks de Alchemy para notificar brechas y actividad sospechosa *(módulo en desarrollo — aún no funcional)*. |
| **Prueba criptográfica** | Cada hallazgo queda ligado a una firma EIP-712 de un verifier autorizado, registrada en Monad. |
| **Transparencia comunitaria** | `AlertOracle` publica scores de contratos peligrosos para que otros usuarios consulten antes de firmar. |
| **Auditoría con agente** | El Contract Auditor orquesta un agente de IA (**Claude Sonnet 4**) que verifica smart contracts (bytecode + código fuente en el explorer), explica vulnerabilidades detectadas y sugiere acciones concretas desde la wallet. |
| **Soberanía del usuario** | Sin signup, sin custodia. Acciones críticas se firman desde tu wallet. |

---

## Escalabilidad

La arquitectura está pensada para crecer sin reescribir el núcleo:

- **Monorepo modular** — Frontend, gateway, servicios y contratos evolucionan de forma independiente (`pnpm` workspaces).
- **Microservicios stateless** — `breach`, `analyzer` y `alert` escalan horizontalmente; no dependen de una base de datos central.
- **On-chain como fuente de verdad** — El estado persistente vive en Monad + IPFS. Sin base de datos central que frene el escalado.
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
    │                                              ├─ Agente IA · Claude Sonnet 4
    │                                              └─ AlertOracle (Monad)
    │
    ├─ Remediation Hub ──▶ wallet ──▶ RemediationVault (Monad)   [en proceso]
    │
    └─ Alertas ◀── WebSocket ◀── API Gateway ◀── Alchemy Webhooks   [pendiente]
```

**Breach Scanner:** el usuario ingresa email, teléfono o wallet → el servicio consulta fuentes de brechas → sube metadata a IPFS → firma EIP-712 → registra hash on-chain.

**Contract Auditor:** el usuario pega una dirección → análisis heurístico de bytecode (opcodes peligrosos, proxies, blacklist) → verificación del contrato en el explorer → un **agente de IA (Claude Sonnet 4)** orquesta el análisis completo, explica riesgos en lenguaje claro y sugiere acciones → score 0–100 → si el riesgo es alto, se publica en `AlertOracle`.

**Remediation Hub:** *(en proceso)* — depositar MON/ERC-20 en bóveda personal, revocar approvals y retirar fondos tras una alerta. Contrato desplegado; flujo de UI aún en desarrollo.

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
| **Agente IA** | [Claude Sonnet 4](https://www.anthropic.com/claude/sonnet) (Anthropic SDK) — orquestación del Contract Auditor |
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
│   ├── analyzer/          # Auditoría de bytecode + agente IA (Sonnet 4) + AlertOracle
│   └── alert/             # Notificaciones internas (pendiente)
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
| Contract Auditor (agente IA · Claude Sonnet 4) | ✅ |
| Contract Auditor (publicación en AlertOracle) | ✅ |
| Remediation Hub (vault deposit/withdraw) | 🚧 En proceso |
| Alertas WebSocket + webhooks Alchemy | ❌ No funcional |

---

## Equipo

<p align="center">
  <table>
    <tr>
      <td align="center" width="220">
        <img src="docs/team/jorge.png" width="120" height="120" alt="Jorge Martínez" style="border-radius:50%; object-fit:cover; border:3px solid #8B5CF6;"/><br/><br/>
        <b>🟣 Jorge Martínez</b><br/>
        <sub>Backend</sub><br/><br/>
        <a href="https://www.instagram.com/jorge_martinez_78/"><img src="https://img.shields.io/badge/Instagram-@jorge__martinez__78-E4405F?style=for-the-badge&logo=instagram&logoColor=white"/></a><br/>
        <a href="https://www.linkedin.com/in/jorge-andres-martinez-santos-a59b45387/"><img src="https://img.shields.io/badge/LinkedIn-Jorge_Martínez-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white"/></a>
      </td>
      <td align="center" width="220">
        <img src="docs/team/mariana.png" width="120" height="120" alt="Mariana Sinisterra" style="border-radius:50%; object-fit:cover; border:3px solid #3A6FFF;"/><br/><br/>
        <b>🔵 Mariana Sinisterra</b><br/>
        <sub>Blockchain</sub><br/><br/>
        <a href="https://www.instagram.com/mariana_snstrr/"><img src="https://img.shields.io/badge/Instagram-@mariana__snstrr-C13584?style=for-the-badge&logo=instagram&logoColor=white"/></a><br/>
        <a href="https://www.linkedin.com/in/marianasinisterra/?locale=es"><img src="https://img.shields.io/badge/LinkedIn-Mariana_Sinisterra-0077B5?style=for-the-badge&logo=linkedin&logoColor=white"/></a>
      </td>
      <td align="center" width="220">
        <img src="docs/team/michael.png" width="120" height="120" alt="Michael Colmenares" style="border-radius:50%; object-fit:cover; border:3px solid #10B981;"/><br/><br/>
        <b>🟢 Michael Colmenares</b><br/>
        <sub>Frontend</sub><br/><br/>
        <a href="https://www.instagram.com/ma1c0ld/"><img src="https://img.shields.io/badge/Instagram-@ma1c0ld-F56040?style=for-the-badge&logo=instagram&logoColor=white"/></a><br/>
        <a href="https://www.linkedin.com/in/michael-colmenares-v/"><img src="https://img.shields.io/badge/LinkedIn-Michael_Colmenares-004182?style=for-the-badge&logo=linkedin&logoColor=white"/></a>
      </td>
    </tr>
  </table>
</p>

---

## Licencia

MIT
