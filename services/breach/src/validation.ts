/**
 * Validación y normalización estricta de inputs del breach-service.
 *
 * Separamos esto en su propio módulo para:
 *  - testear sin levantar el server
 *  - reusar la misma lógica desde el api-gateway si quiere validar antes
 *  - mantener el index.ts del servicio limpio
 *
 * Cada validador devuelve un valor normalizado o lanza ValidationError.
 */

import { getAddress, isAddress } from "viem";

export type TargetType = "email" | "phone" | "wallet";

export class ValidationError extends Error {
  field: string;
  code: string;
  constructor(field: string, code: string, message: string) {
    super(message);
    this.field = field;
    this.code = code;
    this.name = "ValidationError";
  }
}

// --------------------------------------------------------------------------
// Email — RFC 5322 simplificado, longitud máxima por especificación.
// --------------------------------------------------------------------------

// Patron pragmatico: local-part puede tener letras, numeros y los simbolos
// comunes; dominio requiere al menos un punto y TLD de >=2 caracteres.
const EMAIL_REGEX = /^[A-Za-z0-9._%+\-]{1,64}@[A-Za-z0-9.\-]{1,253}\.[A-Za-z]{2,}$/;
const MAX_EMAIL_LENGTH = 254;

export function validateEmail(raw: unknown): string {
  if (typeof raw !== "string") {
    throw new ValidationError("target", "email_not_string", "Email debe ser texto");
  }
  const trimmed = raw.trim().toLowerCase();

  if (trimmed.length === 0) {
    throw new ValidationError("target", "email_empty", "Email vacío");
  }
  if (trimmed.length > MAX_EMAIL_LENGTH) {
    throw new ValidationError(
      "target",
      "email_too_long",
      `Email supera ${MAX_EMAIL_LENGTH} caracteres`
    );
  }
  if (!EMAIL_REGEX.test(trimmed)) {
    throw new ValidationError(
      "target",
      "email_invalid_format",
      "Formato de email inválido"
    );
  }
  // Defensa adicional contra inyección de caracteres de control.
  if (/[\x00-\x1f\x7f]/.test(trimmed)) {
    throw new ValidationError(
      "target",
      "email_control_chars",
      "Email contiene caracteres no permitidos"
    );
  }

  return trimmed;
}

// --------------------------------------------------------------------------
// Wallet — formato EIP-55 con checksum si viene con mayúsculas/minúsculas mixtas.
// --------------------------------------------------------------------------

export function validateWallet(raw: unknown): string {
  if (typeof raw !== "string") {
    throw new ValidationError("target", "wallet_not_string", "Wallet debe ser texto");
  }
  const trimmed = raw.trim();
  if (!isAddress(trimmed)) {
    throw new ValidationError(
      "target",
      "wallet_invalid",
      "Wallet inválida (debe ser un address EVM 0x...)"
    );
  }
  // getAddress devuelve la forma EIP-55 con checksum,
  // pero la normalizamos a lowercase para indexación consistente.
  return getAddress(trimmed).toLowerCase();
}

// --------------------------------------------------------------------------
// Phone — E.164 simplificado (10-15 dígitos, opcional +).
// --------------------------------------------------------------------------

const PHONE_E164_REGEX = /^\+?[1-9]\d{6,14}$/;

export function validatePhone(raw: unknown): string {
  if (typeof raw !== "string") {
    throw new ValidationError("target", "phone_not_string", "Teléfono debe ser texto");
  }
  // Limpiamos espacios, guiones, paréntesis — frecuentes en input humano.
  const cleaned = raw.replace(/[\s\-().]/g, "");
  if (cleaned.length === 0) {
    throw new ValidationError("target", "phone_empty", "Teléfono vacío");
  }
  if (!PHONE_E164_REGEX.test(cleaned)) {
    throw new ValidationError(
      "target",
      "phone_invalid",
      "Teléfono inválido (formato E.164 esperado, ej: +5491155551234)"
    );
  }
  // Normalizamos siempre con el "+" al inicio.
  return cleaned.startsWith("+") ? cleaned : `+${cleaned}`;
}

// --------------------------------------------------------------------------
// Tipo discriminado
// --------------------------------------------------------------------------

export function validateTargetType(raw: unknown): TargetType {
  if (raw === "email" || raw === "phone" || raw === "wallet") return raw;
  throw new ValidationError(
    "targetType",
    "invalid_target_type",
    "targetType debe ser 'email', 'phone' o 'wallet'"
  );
}

export function normalizeAndValidate(
  rawTarget: unknown,
  rawType: unknown
): { target: string; targetType: TargetType } {
  const targetType = validateTargetType(rawType);
  switch (targetType) {
    case "email":
      return { target: validateEmail(rawTarget), targetType };
    case "wallet":
      return { target: validateWallet(rawTarget), targetType };
    case "phone":
      return { target: validatePhone(rawTarget), targetType };
  }
}
