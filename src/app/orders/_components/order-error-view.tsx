"use client";

import { LogIn, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import type { AppError } from "@/contracts/common";

export interface OrderErrorViewProps {
  error: AppError;
  onRetry: () => void;
  loginHref: string;
}

/** Maps the shared AppErrorCode taxonomy to the right non-happy-path presentation; invents no new states. */
export function OrderErrorView({ error, onRetry, loginHref }: OrderErrorViewProps) {
  if (error.code === "UNAUTHENTICATED") {
    return (
      <EmptyState
        icon={<LogIn className="h-5 w-5" aria-hidden="true" />}
        title="Sign in to continue"
        description="Sign in to your Palermo account to view this."
        action={
          <Link
            href={loginHref}
            className="inline-flex min-h-[44px] items-center justify-center rounded-md border border-border bg-transparent px-3 py-2 text-xs font-medium text-text transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Sign in
          </Link>
        }
      />
    );
  }

  if (error.code === "FORBIDDEN") {
    return (
      <EmptyState
        icon={<ShieldAlert className="h-5 w-5" aria-hidden="true" />}
        title="You don't have access to this"
        description={error.message}
      />
    );
  }

  return <ErrorState message={error.message} onRetry={onRetry} />;
}
