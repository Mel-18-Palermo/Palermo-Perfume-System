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
    neutral: "bg-surface-muted text-foreground border-border",
    accent: "bg-accent-subtle text-accent border-accent/20",
    success: "bg-success-background text-success border-success/20",
    warning: "bg-warning-background text-warning border-warning/20",
    danger: "bg-danger-background text-danger border-danger/20",
    info: "bg-info-background text-info border-info/20",
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
