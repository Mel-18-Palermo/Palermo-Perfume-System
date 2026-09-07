import type { ReactNode } from "react";

import { api as defaultApi, createApiClient } from "@/lib/api";

type AdminSessionPreviewProps = Readonly<{
  children: ReactNode;
}>;

export async function AdminSessionPreview({
  children,
}: AdminSessionPreviewProps) {
  const isDemo = process.env.NODE_ENV === "development";
  let client = defaultApi;

  if (isDemo) {
    const { createMockApi } = await import("@/lib/api/mocks");
    client = createApiClient(createMockApi({ actor: "ADMIN" }));
  }

  const result = await client.auth.getSession(undefined);

  if (!result.ok) {
    return (
      <section aria-labelledby="admin-session-error">
        <h1 id="admin-session-error" className="text-h1 font-bold">
          Administration unavailable
        </h1>
        <p role="alert" className="mt-4 text-text-muted">
          {result.error.message}
        </p>
      </section>
    );
  }

  const user = result.data.user;

  if (!user || user.role !== "ADMIN") {
    return (
      <section aria-labelledby="admin-access-heading">
        <h1 id="admin-access-heading" className="text-h1 font-bold">
          {user ? "Access denied" : "Sign-in required"}
        </h1>
        <p className="mt-4 text-text-muted">
          An administrator session is required to view this area.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-text-muted">
        {isDemo ? "Mock admin preview" : "Administrator"}: {user.displayName}
      </p>
      {children}
    </div>
  );
}
