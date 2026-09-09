import * as React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "link";
  size?: "sm" | "md" | "lg" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", size = "md", ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50 min-h-[44px]";

    const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
      primary: "bg-primary text-primary-text hover:bg-primary-hover",
      secondary: "bg-surface-muted text-text hover:bg-surface-muted/80",
      outline: "border border-border bg-transparent hover:bg-surface-muted text-text",
      ghost: "hover:bg-surface-muted text-text",
      danger: "bg-danger text-surface hover:bg-danger/90",
      link: "text-text underline-offset-4 hover:underline p-0 min-h-0",
    };

    const sizes: Record<NonNullable<ButtonProps["size"]>, string> = {
      sm: "px-3 py-1.5 text-xs min-h-[44px]",
      md: "px-4 py-2 text-sm min-h-[44px]",
      lg: "px-6 py-3 text-base min-h-[44px]",
      icon: "h-11 w-11 p-0",
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
