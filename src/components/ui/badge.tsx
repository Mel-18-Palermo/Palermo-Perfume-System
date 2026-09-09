import * as React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "neutral" | "accent" | "success" | "warning" | "danger" | "info";
}

export function Badge({
  className = "",
  variant = "neutral",
  children,
  ...props
}: BadgeProps) {
  const variantStyles: Record<string, string> = {
    neutral: "bg-surface-muted text-text border-border",
    accent: "bg-accent-subtle text-text border-accent/40",
    success: "bg-success-background text-text border-success/30",
    warning: "bg-warning-background text-text border-warning/40",
    danger: "bg-danger-background text-text border-danger/30",
    info: "bg-info-background text-text border-info/30",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium border ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
