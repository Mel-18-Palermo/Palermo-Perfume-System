import "server-only";
import type { WebAuthnConfig } from "./webauthn";

function configured(value: string | undefined): string | undefined { return value?.trim() || undefined; }

/** Production is explicit; localhost and exact Vercel preview hostnames are safe derivations. */
export function webAuthnConfig(request: Request): WebAuthnConfig {
  const url = new URL(request.url); const rpID = configured(process.env["PALERMO_WEBAUTHN_RP_ID"]); const origin = configured(process.env["PALERMO_WEBAUTHN_ORIGIN"]);
  if (rpID && origin) return { rpID, origin: new URL(origin).origin };
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (process.env["NODE_ENV"] !== "production" && (local || url.hostname.endsWith(".vercel.app"))) return { rpID: url.hostname, origin: url.origin };
  throw new Error("PALERMO_WEBAUTHN_RP_ID and PALERMO_WEBAUTHN_ORIGIN are required for this host.");
}
export function sameApprovedOrigin(request: Request): boolean { try { return request.headers.get("origin") === webAuthnConfig(request).origin; } catch { return false; } }
