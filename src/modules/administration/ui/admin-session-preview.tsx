"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Session } from "@/contracts/auth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { adminLoginHref } from "./admin-auth-routing";

type AdminSessionPreviewProps = Readonly<{
  children: ReactNode;
}>;

type SessionState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; session: Session };

export function AdminSessionPreview({
  children,
}: AdminSessionPreviewProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [state, setState] = useState<SessionState>({
    status: "loading",
  });
  const [reloadToken, setReloadToken] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadSession() {
      try {
        const result = await api.auth.getSession(undefined);

        if (!active) return;

        setState(
          result.ok
            ? { status: "ready", session: result.data }
            : { status: "error", message: result.error.message },
        );
      } catch {
        if (active) {
          setState({
            status: "error",
            message: "The account service is temporarily unavailable.",
          });
        }
      }
    }

    void loadSession();

    return () => {
      active = false;
    };
  }, [reloadToken]);

  useEffect(() => {
    if (state.status !== "ready" || state.session.user) return;
    router.replace(adminLoginHref(pathname));
  }, [pathname, router, state]);

  function retry() {
    setState({ status: "loading" });
    setReloadToken(value => value + 1);
  }

  async function logout(): Promise<void> {
    if (loggingOut) return;
    setLoggingOut(true);
    const result = await api.auth.logout();
    if (!result.ok) {
      setState({ status: "error", message: result.error.message });
      setLoggingOut(false);
      return;
    }
    router.replace("/admin/login");
    router.refresh();
  }

  if (state.status === "loading") {
    return <p role="status">Checking administrator session…</p>;
  }

  const user = state.status === "ready" ? state.session.user : null;

  if (user?.role === "ADMIN") {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <p className="text-sm text-text-muted">Administrator: {user.displayName}</p>
          <Button type="button" variant="outline" isLoading={loggingOut} onClick={() => { void logout(); }}>
            Sign out
          </Button>
        </div>
        {children}
      </div>
    );
  }

  const heading =
    state.status === "error"
      ? "Administrator session unavailable"
      : user
        ? "Access denied"
        : "Administrator sign-in required";

  const message =
    state.status === "error"
      ? state.message
      : user
        ? "The current account is not an administrator."
        : "No signed-in administrator session was found.";

  if (state.status === "ready" && !user) {
    return <p role="status">Redirecting to administrator sign-in…</p>;
  }

  return (
    <div className="space-y-6">
      <section
        aria-labelledby="admin-session-heading"
        className="space-y-3 rounded-lg border border-border bg-surface p-5"
      >
        <h1
          id="admin-session-heading"
          className="text-h3 font-semibold"
        >
          {heading}
        </h1>

        <p role="alert" className="text-sm text-text-muted">
          {message}
        </p>

        <Button variant="outline" onClick={retry}>
          Check session again
        </Button>

      </section>

    </div>
  );
}
