"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { adminSessionDestination } from "./admin-auth-routing";
import { startAuthentication } from "@simplewebauthn/browser";
import type { PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/browser";

type AdminLoginProps = Readonly<{ nextPath: string }>;

export function AdminLogin({ nextPath }: AdminLoginProps) {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [checkingSession, setCheckingSession] = React.useState(true);
  const errorRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  React.useEffect(() => {
    let cancelled = false;
    async function checkSession(): Promise<void> {
      const result = await api.auth.getSession();
      if (cancelled) return;
      const destination = result.ok ? adminSessionDestination(result.data, nextPath) : null;
      if (destination) {
        router.replace(destination);
        router.refresh();
        return;
      }
      setCheckingSession(false);
    }
    void checkSession();
    return () => { cancelled = true; };
  }, [nextPath, router]);

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    const result = await api.auth.adminLogin({ email, password });
    if (!result.ok) {
      setError(result.error.message);
      setSubmitting(false);
      return;
    }
    const destination = adminSessionDestination(result.data, nextPath);
    if (!destination) {
      setError("Administrator session could not be established.");
      setSubmitting(false);
      return;
    }
    router.replace(destination);
    router.refresh();
  }

  async function passkey(): Promise<void> {
    if (submitting || !email.trim()) { setError("Enter your administrator email to continue with a passkey."); return; }
    setError(null); setSubmitting(true);
    try {
      const options = await api.auth.adminPasskeyLoginOptions({ email });
      if (!options.ok) { setError(options.error.message); return; }
      const assertion = await startAuthentication({ optionsJSON: options.data.options as PublicKeyCredentialRequestOptionsJSON });
      const result = await api.auth.adminPasskeyLoginVerify({ email, response: assertion });
      if (!result.ok) { setError(result.error.message); return; }
      const destination = adminSessionDestination(result.data, nextPath);
      if (!destination) { setError("Administrator session could not be established."); return; }
      router.replace(destination); router.refresh();
    } catch { setError("Passkey authentication could not be completed."); }
    finally { setSubmitting(false); }
  }

  return (
    <main className="min-h-screen bg-text px-4 py-12 text-surface sm:px-6">
      <div className="mx-auto w-full max-w-[var(--container-form)]">
        <div className="mb-10 border-l-2 border-primary pl-4">
          <Link href="/" className="inline-block text-h2 font-bold tracking-[0.16em] text-surface">
            PALERMO
          </Link>
          <p className="mt-2 text-sm uppercase tracking-[0.12em] text-surface/70">Administrator access</p>
        </div>
        <section className="border border-surface/20 bg-surface p-6 text-text shadow-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">Restricted area</p>
          <h1 className="mt-3 text-h1">Administrator sign in</h1>
          <p className="mt-2 text-sm text-text-muted">Use your authorised Palermo administrator account.</p>
          {checkingSession ? (
            <p className="mt-8 text-sm text-text-muted" role="status">Checking administrator session…</p>
          ) : (
            <form className="mt-8 space-y-5" onSubmit={event => { void submit(event); }}>
              <div>
                <label htmlFor="admin-email" className="mb-2 block text-label text-text">Email</label>
                <input id="admin-email" name="email" type="email" autoComplete="email" autoFocus required value={email}
                  onChange={event => setEmail(event.target.value)} disabled={submitting}
                  aria-invalid={error ? true : undefined} aria-describedby={error ? "admin-login-error" : undefined}
                  className="min-h-[44px] w-full border border-border-strong bg-surface px-3 py-2 text-base text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60" />
              </div>
              <button type="button" disabled={submitting} onClick={() => { void passkey(); }} className="min-h-[44px] w-full border border-text bg-surface px-4 py-2 text-label text-text transition hover:bg-text/5 disabled:cursor-not-allowed disabled:opacity-60">
                {submitting ? "Waiting for passkey…" : "Continue with passkey"}
              </button>
              <p className="text-center text-xs text-text-muted">or use your password</p>
              <div>
                <label htmlFor="admin-password" className="mb-2 block text-label text-text">Password</label>
                <input id="admin-password" name="password" type="password" autoComplete="current-password" required value={password}
                  onChange={event => setPassword(event.target.value)} disabled={submitting}
                  aria-invalid={error ? true : undefined} aria-describedby={error ? "admin-login-error" : undefined}
                  className="min-h-[44px] w-full border border-border-strong bg-surface px-3 py-2 text-base text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60" />
              </div>
              {error ? <div ref={errorRef} id="admin-login-error" role="alert" tabIndex={-1} className="border border-danger/20 bg-danger-bg px-4 py-3 text-sm text-danger">{error}</div> : null}
              <button type="submit" disabled={submitting} className="min-h-[44px] w-full bg-text px-4 py-2 text-label text-surface transition hover:bg-text/85 disabled:cursor-not-allowed disabled:opacity-60">
                {submitting ? "Signing in…" : "Sign in to administration"}
              </button>
            </form>
          )}
          <div className="mt-6 border-t border-border pt-6"><Link href="/" className="text-sm font-medium text-text underline-offset-4 hover:underline">Return to catalogue</Link></div>
        </section>
      </div>
    </main>
  );
}
