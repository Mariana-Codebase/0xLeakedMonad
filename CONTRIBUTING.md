# Guía de colaboración de 0xLeaked

## 1) Convención de ramas

Todas las ramas deben seguir este formato:

- `main`: producción
- `develop`: integración
- `feature/<dominio>-<descripcion-corta>`
- `fix/<dominio>-<descripcion-corta>`
- `contracts/<descripcion-corta>`

Ejemplos:

- `feature/frontend-breach-scanner-ui`
- `feature/backend-alert-service-worker`
- `contracts/breach-registry-v1`
- `fix/backend-webhook-auth`

## 2) Idioma común de ramas y PR

- Usar `kebab-case` en nombres.
- Ser explícitos por dominio: `frontend`, `backend`, `blockchain`, `infra`.
- Mantener nombres cortos y orientados a resultado.

## 3) Convención de commits (Conventional Commits)

Formato:

`tipo(alcance): descripcion`

Tipos permitidos:

- `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `ci`

Ejemplos:

- `feat(frontend): add generic module cards`
- `fix(backend): validate webhook signature`
- `docs(repo): define branch strategy`

## 4) Pull Requests

- Todo PR apunta a `develop` (excepto hotfixes urgentes).
- Todo PR debe incluir:
  - contexto del problema,
  - solución aplicada,
  - evidencia de prueba.
- Mínimo 1 aprobación antes de merge.
- No se hace merge con checks fallando.

## 5) Definición de terminado (DoD)

Antes de marcar una tarea como lista:

- [ ] Código compila y corre localmente.
- [ ] Variables nuevas están en `.env.example`.
- [ ] README/Documentación actualizada si aplica.
- [ ] PR con descripción clara y pruebas.
- [ ] Si toca frontend/web3: flujo validado con MetaMask en red Monad.

## 6) Reglas de seguridad

- Nunca subir secretos o llaves privadas.
- Rotar credenciales comprometidas inmediatamente.
- Usar cuentas y wallets de pruebas para desarrollo.
