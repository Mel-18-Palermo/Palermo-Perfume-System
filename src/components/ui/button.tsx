import * as React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", size = "md", isLoading = false, disabled, children, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none rounded-md";

    const variantStyles = {
      primary: "bg-primary text-primary-text hover:bg-primary/90",
      secondary: "bg-surface-muted text-text hover:bg-surface-muted/80",
      outline: "border border-border bg-transparent text-text hover:bg-surface-muted",
      ghost: "bg-transparent text-text hover:bg-surface-muted",
      danger: "bg-danger text-danger-text hover:bg-danger/90",
    };

    const sizeStyles = {
      sm: "min-h-[44px] px-3 py-2 text-xs",
      md: "min-h-[44px] px-4 py-2 text-sm",
      lg: "min-h-[48px] px-6 py-3 text-base",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <span className="inline-flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            <span>{children}</span>
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);
Button.displayName = "Button";
