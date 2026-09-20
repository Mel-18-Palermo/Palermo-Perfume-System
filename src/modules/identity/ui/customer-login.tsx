"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

type CustomerLoginProps = Readonly<{
  nextPath: string;
}>;

export function CustomerLogin({
  nextPath,
}: CustomerLoginProps) {
  const router = useRouter();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [checkingSession, setCheckingSession] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;

    async function checkSession(): Promise<void> {
      const result = await api.auth.getSession();

      if (cancelled) return;

      if (result.ok && result.data.user?.role === "CUSTOMER") {
        router.replace(nextPath);
        router.refresh();
        return;
      }

      setCheckingSession(false);
    }

    void checkSession();

    return () => {
      cancelled = true;
    };
  }, [nextPath, router]);

  async function submit(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (submitting) return;

    setError(null);
    setSubmitting(true);

    const result = await api.auth.login({
      email,
      password,
    });

    if (!result.ok) {
      setError(result.error.message);
      setSubmitting(false);
      return;
    }

    if (!result.data.user || result.data.user.role !== "CUSTOMER") {
      setError("Customer session could not be established.");
      setSubmitting(false);
      return;
    }

    router.replace(nextPath);
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-bg px-4 py-12 sm:px-6">
      <div className="mx-auto w-full max-w-[var(--container-form)]">
        <div className="mb-10 text-center">
          <Link
            href="/"
            className="inline-block text-h2 font-bold tracking-tight text-text"
          >
            PALERMO
          </Link>

          <p className="mt-2 text-sm text-text-muted">
            Sign in to your customer account
          </p>
        </div>

        <section className="rounded-lg border border-border bg-surface p-6 shadow-sm sm:p-8">
          <h1 className="text-h1 text-text">
            Sign in
          </h1>

          <p className="mt-2 text-sm text-text-muted">
            Access your cart, checkout and orders.
          </p>

          {checkingSession ? (
            <p
              className="mt-8 text-sm text-text-muted"
              role="status"
            >
              Checking your session…
            </p>
          ) : (
            <form
              className="mt-8 space-y-5"
              onSubmit={event => {
                void submit(event);
              }}
            >
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-label text-text"
                >
                  Email
                </label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  disabled={submitting}
                  className="min-h-[44px] w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-base text-text outline-none transition focus:border-info disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-label text-text"
                >
                  Password
                </label>

                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  disabled={submitting}
                  className="min-h-[44px] w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-base text-text outline-none transition focus:border-info disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-md border border-danger/20 bg-danger-bg px-4 py-3 text-sm text-danger"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="min-h-[44px] w-full rounded-md bg-primary px-4 py-2 text-label text-primary-text transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Signing in…" : "Sign in"}
              </button>
            </form>
          )}

          <div className="mt-6 border-t border-border pt-6">
            <Link
              href="/"
              className="text-sm font-medium text-text underline-offset-4 hover:underline"
            >
              Back to catalogue
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
