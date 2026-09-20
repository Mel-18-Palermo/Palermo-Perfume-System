export type DemoDatabaseSchema = "palermo";
export type DemoTarget = Readonly<{
  databaseUrl: string;
  schema: DemoDatabaseSchema;
  supabaseUrl: string;
  projectRef: string;
}>;
type Environment = Readonly<Record<string, string | undefined>>;

const projectRefPattern = /^[a-z0-9]{20}$/;

function required(environment: Environment, name: string): string {
  const value = environment[name]?.trim();
  if (!value) throw new Error(`Demo reset requires ${name}.`);
  return value;
}

function matchesDatabaseProject(url: URL, projectRef: string): boolean {
  const username = decodeURIComponent(url.username);
  return url.hostname === `db.${projectRef}.supabase.co` || username.endsWith(`.${projectRef}`);
}

/** Pure, fail-closed validation used before any reset client or Auth administrator is created. */
export function demoTargetFromEnvironment(environment: Environment): DemoTarget {
  if (!["development", "preview"].includes(environment["PALERMO_DATABASE_ENV"] ?? "")
    || environment["VERCEL_ENV"] === "production") {
    throw new Error("Demo reset requires an explicit isolated development/preview environment.");
  }

  const projectRef = required(environment, "PALERMO_DEMO_SUPABASE_PROJECT_REF");
  if (!projectRefPattern.test(projectRef)) {
    throw new Error("Demo Supabase project reference must be valid.");
  }

  const databaseUrl = required(environment, "DIRECT_URL");
  const supabaseUrl = required(environment, "SUPABASE_URL");
  let database: URL;
  let supabase: URL;
  try {
    database = new URL(databaseUrl);
    supabase = new URL(supabaseUrl);
  } catch {
    throw new Error("Demo reset target URLs are invalid.");
  }

  const schema = database.searchParams.get("schema");
  if (schema !== "palermo"
    || supabase.origin !== `https://${projectRef}.supabase.co`
    || supabase.pathname !== "/" || supabase.search || supabase.hash
    || !matchesDatabaseProject(database, projectRef)) {
    throw new Error("Database and Auth targets must match the explicitly configured isolated demo project.");
  }

  return { databaseUrl, schema, supabaseUrl: supabase.origin, projectRef };
}
