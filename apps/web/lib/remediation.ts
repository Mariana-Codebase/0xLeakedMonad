export type RemediationStep = {
  id: string;
  title: string;
  detail: string;
};

export const remediationSteps: RemediationStep[] = [
  {
    id: "rotate",
    title: "Rotar credenciales",
    detail: "Cambia claves comprometidas y habilita 2FA en cuentas críticas."
  },
  {
    id: "revoke",
    title: "Revocar approvals",
    detail: "Elimina permisos amplios en contratos sospechosos antes de mover fondos."
  },
  {
    id: "vault",
    title: "Mover fondos a bóveda",
    detail: "Transfiere fondos de forma temporal a RemediationVault para reducir exposición."
  },
  {
    id: "monitor",
    title: "Monitorear actividad",
    detail: "Revisa actividad on-chain reciente y activa alertas para movimientos anómalos."
  }
];

export function parseMonAmount(value: string): number {
  const parsed = Number(value.trim());
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return parsed;
}
