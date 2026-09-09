import * as React from "react";
import { Inbox } from "lucide-react";

export interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center rounded-lg border border-dashed border-border bg-surface-muted/30">
      {icon ? (
        <div className="mb-3 text-text-muted">{icon}</div>
      ) : (
        <div className="mb-3 h-10 w-10 rounded-full bg-surface-muted flex items-center justify-center text-text-muted">
          <Inbox className="h-5 w-5" aria-hidden="true" />
        </div>
      )}
      <h4 className="text-sm font-semibold text-text">{title}</h4>
      <p className="mt-1 text-xs text-text-muted max-w-[var(--container-form)]">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
