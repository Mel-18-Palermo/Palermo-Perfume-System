"use client";

import { LogIn, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import type { AppError } from "@/contracts/common";

export interface OrderErrorViewProps {
  error: AppError;
  onRetry: () => void;
}

/** Maps the shared AppErrorCode taxonomy to the right non-happy-path presentation; invents no new states. */
export function OrderErrorView({ error, onRetry }: OrderErrorViewProps) {
  const router = useRouter();

  if (error.code === "UNAUTHENTICATED") {
    return (
      <EmptyState
        icon={<LogIn className="h-5 w-5" aria-hidden="true" />}
        title="Sign in to continue"
        description="Sign in to your Palermo account to view this."
        action={
          <Button variant="outline" size="sm" onClick={() => router.push("/login")}>
            Sign in
          </Button>
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
