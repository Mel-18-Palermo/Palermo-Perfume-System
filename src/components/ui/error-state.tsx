import * as React from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "./button";

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Something went wrong",
  message = "An error occurred while loading this section.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center rounded-lg border border-danger/20 bg-danger-background/40">
      <div className="mb-3 h-10 w-10 rounded-full bg-danger/10 text-danger flex items-center justify-center">
        <AlertCircle className="h-5 w-5" aria-hidden="true" />
      </div>
      <h4 className="text-sm font-semibold text-text">{title}</h4>
      <p className="mt-1 text-xs text-text-muted max-w-[var(--container-form)]">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-4">
          Retry
        </Button>
      )}
    </div>
  );
}
