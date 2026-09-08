import { invalid } from "./errors";

export function object(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) invalid();
  return value as Record<string, unknown>;
}

export function email(value: unknown): string {
  if (typeof value !== "string") invalid("Enter a valid email address.");
  const normalized = value.trim().toLowerCase();
  if (normalized.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) invalid("Enter a valid email address.");
  return normalized;
}

export function password(value: unknown): string {
  // Supabase uses bcrypt: reject inputs beyond its 72-byte boundary instead of truncating.
  if (typeof value !== "string" || value.length < 12 || Buffer.byteLength(value, "utf8") > 72) {
    invalid("Use a password of at least 12 characters and at most 72 UTF-8 bytes.");
  }
  return value;
}

export function name(value: unknown): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > 100 || /[\u0000-\u001f\u007f]/.test(value)) invalid("Enter a name of 1–100 characters.");
  return value.trim();
}

export function verificationToken(value: unknown): string {
  if (typeof value !== "string" || !/^[a-f0-9]{40,128}$/i.test(value)) invalid("The verification link is invalid or expired.");
  return value;
}
