/** Restrict post-auth navigation to paths owned by this application. */
export function safeNextPath(
  value: string | string[] | undefined,
  fallback: string,
): string {
  if (typeof value !== "string" || !value.startsWith("/")) return fallback;

  try {
    const base = new URL("https://palermo.invalid");
    const target = new URL(value, base);
    return target.origin === base.origin
      ? `${target.pathname}${target.search}${target.hash}`
      : fallback;
  } catch {
    return fallback;
  }
}
