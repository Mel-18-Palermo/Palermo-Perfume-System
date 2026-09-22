"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { CustomerShell } from "@/components/layout/customer-shell";
import { api } from "@/lib/api";

type CustomerSignupProps = Readonly<{
  loginHref: string;
}>;

type Fields = "name" | "email" | "password" | "confirmPassword";
type FieldErrors = Partial<Record<Fields, string>>;

function validate({ name, email, password, confirmPassword }: Record<Fields, string>): FieldErrors {
  const errors: FieldErrors = {};

  if (!name.trim() || name.trim().length > 100 || /[\u0000-\u001f\u007f]/.test(name)) {
    errors.name = "Enter a name of 1–100 characters.";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    errors.email = "Enter a valid email address.";
  }
  if (password.length < 12) {
    errors.password = "Use at least 12 characters.";
  } else if (new TextEncoder().encode(password).length > 72) {
    errors.password = "Choose a shorter password.";
  }
  if (!confirmPassword) {
    errors.confirmPassword = "Confirm your password.";
  } else if (confirmPassword !== password) {
    errors.confirmPassword = "Passwords do not match.";
  }

  return errors;
}

/** Customer registration intentionally finishes pending hosted email verification. */
export function CustomerSignup({ loginHref }: CustomerSignupProps) {
  const router = useRouter();
  const [fields, setFields] = React.useState<Record<Fields, string>>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [requestError, setRequestError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [checkingSession, setCheckingSession] = React.useState(true);
  const [pendingVerification, setPendingVerification] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    async function checkSession(): Promise<void> {
      const result = await api.auth.getSession();
      if (cancelled) return;

      if (result.ok && result.data.user?.role === "CUSTOMER") {
        router.replace("/");
        router.refresh();
        return;
      }

      setCheckingSession(false);
    }

    void checkSession();
    return () => { cancelled = true; };
  }, [router]);

  function update(field: Fields, value: string): void {
    setFields(current => ({ ...current, [field]: value }));
    setErrors(current => ({ ...current, [field]: undefined }));
    setRequestError(null);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (submitting || pendingVerification) return;

    const nextErrors = validate(fields);
    setErrors(nextErrors);
    setRequestError(null);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    const result = await api.auth.register({
      name: fields.name.trim(),
      email: fields.email.trim(),
      password: fields.password,
    });
    setSubmitting(false);

    if (!result.ok) {
      setRequestError(result.error.message);
      return;
    }

    setPendingVerification(true);
  }

  return (
    <CustomerShell cart={null} session={null} isLoading={checkingSession}>
      <div className="mx-auto w-full max-w-[var(--container-form)] py-4 sm:py-8">
        <div className="mb-8 text-center sm:mb-10">
          <p className="text-sm text-text-muted">Create your customer account</p>
        </div>

        <section className="rounded-lg border border-border bg-surface p-6 shadow-sm sm:p-8" aria-labelledby="signup-heading">
          <h1 id="signup-heading" className="text-h1 text-text">Create account</h1>
          <p className="mt-2 text-sm text-text-muted">Save your details and continue to checkout.</p>

          {checkingSession ? (
            <p className="mt-8 text-sm text-text-muted" role="status">Checking your session…</p>
          ) : pendingVerification ? (
            <div className="mt-8 space-y-5">
              <Alert variant="success" role="status" title="Check your email to activate your account">
                We’ve created your account. Use the verification link sent to {fields.email.trim()} before signing in.
              </Alert>
              <Link href={loginHref} className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-primary px-4 py-2 text-label text-primary-text transition hover:bg-primary-hover">
                Go to sign in
              </Link>
            </div>
          ) : (
            <form className="mt-8 space-y-5" noValidate onSubmit={event => { void submit(event); }}>
              <Input id="name" name="name" label="Name" autoComplete="name" value={fields.name} onChange={event => update("name", event.target.value)} disabled={submitting} error={errors.name} required />
              <Input id="email" name="email" type="email" label="Email" autoComplete="email" value={fields.email} onChange={event => update("email", event.target.value)} disabled={submitting} error={errors.email} required />
              <Input id="password" name="password" type="password" label="Password" autoComplete="new-password" helperText="Use at least 12 characters." value={fields.password} onChange={event => update("password", event.target.value)} disabled={submitting} error={errors.password} required />
              <Input id="confirm-password" name="confirmPassword" type="password" label="Confirm password" autoComplete="new-password" value={fields.confirmPassword} onChange={event => update("confirmPassword", event.target.value)} disabled={submitting} error={errors.confirmPassword} required />

              {requestError && <Alert variant="danger">{requestError}</Alert>}

              <button type="submit" disabled={submitting} className="min-h-[44px] w-full rounded-md bg-primary px-4 py-2 text-label text-primary-text transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60">
                {submitting ? "Creating account…" : "Create account"}
              </button>
            </form>
          )}

          <div className="mt-6 border-t border-border pt-6 text-sm text-text-muted">
            Already have an account? <Link href={loginHref} className="font-medium text-text underline-offset-4 hover:underline">Sign in</Link>
          </div>
        </section>
      </div>
    </CustomerShell>
  );
}
