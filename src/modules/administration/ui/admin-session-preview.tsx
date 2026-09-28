"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

type AdminSessionPreviewProps = Readonly<{
  children: ReactNode;
  administratorName: string;
}>;

export function AdminSessionPreview({
  children,
  administratorName,
}: AdminSessionPreviewProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  async function logout(): Promise<void> {
    if (loggingOut) return;
    setLoggingOut(true);
    setLogoutError(null);
    try {
      const result = await api.auth.logout();
      if (!result.ok) {
        setLogoutError(result.error.message);
        setLoggingOut(false);
        return;
      }
      router.replace("/admin/login");
      router.refresh();
    } catch {
      setLogoutError("The account service is temporarily unavailable. Please try again.");
      setLoggingOut(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <p className="text-sm text-text-muted">Administrator: {administratorName}</p>
        <Button type="button" variant="outline" isLoading={loggingOut} onClick={() => { void logout(); }}>
          Sign out
        </Button>
      </div>
      {logoutError ? <p role="alert" className="-mt-3 text-sm text-danger">{logoutError}</p> : null}
      {children}
    </div>
  );
}
