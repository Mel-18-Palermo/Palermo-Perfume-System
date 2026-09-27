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

  async function logout(): Promise<void> {
    if (loggingOut) return;
    setLoggingOut(true);
    const result = await api.auth.logout();
    if (!result.ok) {
      setLoggingOut(false);
      return;
    }
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <p className="text-sm text-text-muted">Administrator: {administratorName}</p>
        <Button type="button" variant="outline" isLoading={loggingOut} onClick={() => { void logout(); }}>
          Sign out
        </Button>
      </div>
      {children}
    </div>
  );
}
