"use client";

import * as React from "react";
import { actionClassName } from "@/components/ui/action-link";

type AdminButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type AdminButtonSize = "sm" | "md";

export interface AdminButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: AdminButtonVariant;
  size?: AdminButtonSize;
  isLoading?: boolean;
}

export const AdminButton = React.forwardRef<HTMLButtonElement, AdminButtonProps>(
  ({ className = "", variant = "primary", size = "md", isLoading = false, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={actionClassName({ variant, size, className })}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        {...props}
      >
        {isLoading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
        ) : null}
        {children}
      </button>
    );
  },
);
AdminButton.displayName = "AdminButton";

export type AdminBadgeStatus = "active" | "archived" | "warning" | "info";

export interface AdminBadgeProps {
  status: AdminBadgeStatus;
  children: React.ReactNode;
}

const statusClasses: Record<AdminBadgeStatus, string> = {
  active: "bg-success-bg text-success",
  archived: "bg-surface-muted text-text-muted",
  warning: "bg-warning-bg text-warning",
  info: "bg-info-bg text-info",
};

export function AdminBadge({ status, children }: AdminBadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClasses[status]}`}>
      {children}
    </span>
  );
}

export function AdminSkeleton({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`animate-pulse rounded-md bg-border/60 ${className}`} {...props} />;
}

export interface AdminEmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export function AdminEmptyState({ title, description, action, icon }: AdminEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface-muted/30 p-8 text-center">
      {icon ? <div className="mb-3 text-text-muted">{icon}</div> : null}
      <h3 className="text-h3 font-semibold">{title}</h3>
      <p className="mt-1 max-w-reading text-sm text-text-muted">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export interface AdminErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function AdminErrorState({ title = "Something went wrong", message = "An error occurred while loading this section.", onRetry }: AdminErrorStateProps) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center rounded-lg border border-danger-bg bg-danger-bg/40 p-8 text-center">
      <h3 className="text-h3 font-semibold text-danger">{title}</h3>
      <p className="mt-1 max-w-reading text-sm text-text-muted">{message}</p>
      {onRetry ? (
        <AdminButton variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </AdminButton>
      ) : null}
    </div>
  );
}
