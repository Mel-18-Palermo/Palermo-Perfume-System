"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "@/contracts/auth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

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
  const [state, setState] = useState<SessionState>({
    status: "loading",
  });
  const [reloadToken, setReloadToken] = useState(0);

  const isDevelopment = process.env.NODE_ENV === "development";

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

  function retry() {
    setState({ status: "loading" });
    setReloadToken(value => value + 1);
  }

  if (state.status === "loading") {
    return <p role="status">Checking administrator session…</p>;
  }

  const user = state.status === "ready" ? state.session.user : null;

  if (user?.role === "ADMIN") {
    return (
      <div className="space-y-6">
        <p className="text-sm text-text-muted">
          Administrator: {user.displayName}
        </p>
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

        {isDevelopment && (
          <p className="text-sm text-text-muted">
            Development UI preview only. No administrator access has
            been established. Real operations still require server
            authorization; mock screens are labelled separately.
          </p>
        )}
      </section>

      {isDevelopment ? children : null}
    </div>
  );
}