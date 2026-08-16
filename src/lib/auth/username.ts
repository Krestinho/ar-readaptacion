/**
 * Auth por username (nombre.apellido).
 * Internamente Supabase usa email sintético: usuario@dominio
 */
export const AUTH_EMAIL_DOMAIN =
  process.env.NEXT_PUBLIC_AUTH_EMAIL_DOMAIN || "ar-readaptacion.local";

export function normalizeUsername(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, ".")
    .replace(/[^a-z0-9.]/g, "")
    .replace(/\.{2,}/g, ".")
    .replace(/^\.|\.$/g, "");
}

export function isValidUsername(username: string): boolean {
  return /^[a-z0-9]+(\.[a-z0-9]+)+$/.test(username) && username.length >= 3;
}

export function usernameToAuthEmail(username: string): string {
  return `${normalizeUsername(username)}@${AUTH_EMAIL_DOMAIN}`;
}

/** Login: acepta username o email real (admin). */
export function identifierToAuthEmail(identifier: string): string {
  const value = identifier.trim().toLowerCase();
  if (value.includes("@")) return value;
  return usernameToAuthEmail(value);
}
