import * as React from "react";
import Link from "next/link";

export type ActionVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "link";
export type ActionSize = "sm" | "md" | "lg" | "icon";

const baseClassName = "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:translate-y-px disabled:pointer-events-none disabled:opacity-50";

const variantClassName: Record<ActionVariant, string> = {
  primary: "bg-primary text-primary-text hover:bg-primary-hover",
  secondary: "bg-surface-muted text-text hover:bg-surface-muted/80",
  outline: "border border-border bg-transparent text-text hover:bg-surface-muted",
  ghost: "bg-transparent text-text hover:bg-surface-muted",
  danger: "bg-danger text-primary-text hover:bg-danger/90",
  link: "min-h-0 bg-transparent p-0 text-primary underline-offset-4 hover:underline",
};

const sizeClassName: Record<ActionSize, string> = {
  sm: "min-h-[44px] px-3 py-2 text-xs",
  md: "min-h-[44px] px-4 py-2 text-sm",
  lg: "min-h-[48px] px-6 py-3 text-base",
  icon: "h-11 min-h-[44px] w-11 p-0",
};

/** Shared foreground, state and focus contract for buttons and navigational CTAs. */
export function actionClassName({
  variant = "primary",
  size = "md",
  className = "",
}: Readonly<{ variant?: ActionVariant | undefined; size?: ActionSize | undefined; className?: string | undefined }> = {}): string {
  return `${baseClassName} ${variantClassName[variant]} ${sizeClassName[size]} ${className}`.trim();
}

export type ActionLinkProps = React.ComponentProps<typeof Link> & Readonly<{
  variant?: ActionVariant;
  size?: ActionSize;
}>;

export function ActionLink({ className, variant, size, ...props }: ActionLinkProps) {
  return <Link {...props} className={actionClassName({ variant, size, className })} />;
}
