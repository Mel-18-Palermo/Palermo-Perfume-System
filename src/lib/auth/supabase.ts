import "server-only";
import { createClient, type User, type AuthError } from "@supabase/supabase-js";
import { AuthFault } from "./errors";
import type { IdentityProvider, ProviderIdentity } from "./provider";

function identity(user: User | null): ProviderIdentity {
  if (!user?.email) throw new AuthFault("UNAUTHENTICATED", "Authentication could not be completed.");
  return { id: user.id, email: user.email.toLowerCase(), verified: Boolean(user.email_confirmed_at) };
}

function check(error: AuthError | null): void {
  if (!error) return;
  if (error.code === "email_address_not_authorized" || error.code === "unexpected_failure") {
    throw new AuthFault("TEMPORARILY_UNAVAILABLE", "Authentication email delivery is temporarily unavailable.");
  }
  if (error.status === 429 || (error.status !== undefined && error.status >= 500)) {
    throw new AuthFault("TEMPORARILY_UNAVAILABLE", "Authentication is temporarily unavailable. Try again later.");
  }
  if (error.code === "user_already_exists" || error.code === "email_exists") {
    throw new AuthFault("CONFLICT", "An account already uses this email address.");
  }
  throw new AuthFault("UNAUTHENTICATED", "The credentials or verification link are invalid or expired.");
}

export function createSupabaseIdentityProvider(): IdentityProvider {
  function client() {
    const url = process.env["SUPABASE_URL"];
    const key = process.env["SUPABASE_ANON_KEY"];
    if (!url || !key) throw new AuthFault("TEMPORARILY_UNAVAILABLE", "Authentication is not configured.");
    return createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(10_000) }) },
    });
  }
  // Each request owns its provider client; session state is never shared across users.
  return {
    async register(input) {
      const auth = client().auth;
      const { data, error } = await auth.signUp({ email: input.email, password: input.password, options: { data: { name: input.name } } });
      check(error);
      if (data.user?.identities?.length === 0) throw new AuthFault("CONFLICT", "An account already uses this email address.");
      if (data.session || data.user?.email_confirmed_at) {
        await auth.signOut({ scope: "local" });
        throw new AuthFault("INTEGRATION_ERROR", "Registration requires email confirmation to be enabled.");
      }
      return identity(data.user);
    },
    async verify(token) {
      const auth = client().auth;
      const { data, error } = await auth.verifyOtp({ token_hash: token, type: "signup" });
      check(error);
      try { return identity(data.user); } finally { await auth.signOut({ scope: "local" }); }
    },
    async login(email, password) {
      const auth = client().auth;
      const { data, error } = await auth.signInWithPassword({ email, password });
      check(error);
      try { return identity(data.user); } finally { await auth.signOut({ scope: "local" }); }
    },
    async requestPasswordReset(email) {
      const { error } = await client().auth.resetPasswordForEmail(email);
      check(error);
    },
    async recover(token) {
      const auth = client().auth;
      const { data, error } = await auth.verifyOtp({ token_hash: token, type: "recovery" });
      check(error);
      return {
        identity: identity(data.user),
        async changePassword(password) { const { error } = await auth.updateUser({ password }); check(error); },
        async dispose() { await auth.signOut({ scope: "local" }); },
      };
    },
  };
}
