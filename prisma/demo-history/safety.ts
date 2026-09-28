import { databaseConfiguration } from "../../src/lib/db/connection";

type Environment = Readonly<Record<string, string | undefined>>;
const refPattern = /^[a-z0-9]{20}$/;
function matchesProject(url: URL, ref: string): boolean { return url.hostname === `db.${ref}.supabase.co` || decodeURIComponent(url.username).endsWith(`.${ref}`); }

/** Dedicated production-only guard. It deliberately does not relax demo-safety or seed guards. */
export function assertHistoryApplySafety(args: Readonly<{ apply: boolean; target?: string; confirm?: string }>, environment: Environment = process.env): void {
  if (!args.apply) return;
  if (args.target !== "palermo_prod" || args.confirm !== "synthetic-demo-production") throw new Error("Applying history requires --target=palermo_prod and --confirm=synthetic-demo-production.");
  if (environment["VERCEL"] || environment["VERCEL_ENV"]) throw new Error("History population cannot execute in a Vercel runtime.");
  const direct = environment["DIRECT_URL"]; const ref = environment["PALERMO_DEMO_SUPABASE_PROJECT_REF"]?.trim();
  if (!direct || !ref || !refPattern.test(ref)) throw new Error("Production history population requires the configured Palermo demo project reference.");
  const url = new URL(direct); const configuration = databaseConfiguration(direct);
  if (configuration.schema !== "palermo_prod" || url.searchParams.get("sslmode") !== "verify-full" || !matchesProject(url, ref)) throw new Error("Production history target must be palermo_prod on the configured Supabase project with verified TLS.");
}
