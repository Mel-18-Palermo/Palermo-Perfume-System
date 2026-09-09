import * as React from "react";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "info" | "success" | "warning" | "danger";
  title?: string;
}

export function Alert({
  variant = "info",
  title,
  children,
  className = "",
  ...props
}: AlertProps) {
  const styles: Record<string, string> = {
    info: "bg-info-background text-info border-info/30",
    success: "bg-success-background text-success border-success/30",
    warning: "bg-warning-background text-warning border-warning/30",
    danger: "bg-danger-background text-danger border-danger/30",
  };

  return (
    <div
      role="alert"
      className={`p-4 rounded-md border text-sm ${styles[variant]} ${className}`}
      {...props}
    >
      {title && <h5 className="font-semibold mb-1 leading-none">{title}</h5>}
      <div className="text-xs leading-relaxed opacity-95">{children}</div>
    </div>
  );
}
