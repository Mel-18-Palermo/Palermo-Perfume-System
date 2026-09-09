import * as React from "react";
import { AlertTriangle, AlertCircle, CheckCircle2, Info } from "lucide-react";

export type AlertVariant = "info" | "success" | "warning" | "danger";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  title?: string;
}

const alertStyles: Record<AlertVariant, { container: string; text: string; icon: React.ReactNode }> = {
  info: {
    container: "bg-info-background border-info/30",
    text: "text-text",
    icon: <Info className="h-4 w-4 text-info shrink-0" aria-hidden="true" />,
  },
  success: {
    container: "bg-success-background border-success/30",
    text: "text-text",
    icon: <CheckCircle2 className="h-4 w-4 text-success shrink-0" aria-hidden="true" />,
  },
  warning: {
    container: "bg-warning-background border-warning/40",
    text: "text-text",
    icon: <AlertTriangle className="h-4 w-4 text-warning-border shrink-0" aria-hidden="true" />,
  },
  danger: {
    container: "bg-danger-background border-danger/30",
    text: "text-text",
    icon: <AlertCircle className="h-4 w-4 text-danger shrink-0" aria-hidden="true" />,
  },
};

export function Alert({
  variant = "info",
  title,
  children,
  className = "",
  ...props
}: AlertProps) {
  const current = alertStyles[variant] ?? alertStyles.info;

  return (
    <div
      role="alert"
      className={`flex gap-3 p-4 rounded-md border text-sm ${current.container} ${className}`}
      {...props}
    >
      <div className="mt-0.5">{current.icon}</div>
      <div className="space-y-1">
        {title && <h5 className={`font-semibold leading-none ${current.text}`}>{title}</h5>}
        <div className={`text-xs leading-relaxed ${current.text}`}>{children}</div>
      </div>
    </div>
  );
}
