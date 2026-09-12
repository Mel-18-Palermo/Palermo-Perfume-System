import * as React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "link";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", size = "md", isLoading = false, disabled, children, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none rounded-md";

    const variantStyles = {
      primary: "bg-primary text-surface hover:bg-primary/90",
      secondary: "bg-surface-muted text-text hover:bg-surface-muted/80",
      outline: "border border-border bg-transparent text-text hover:bg-surface-muted",
      ghost: "bg-transparent text-text hover:bg-surface-muted",
      danger: "bg-danger text-surface hover:bg-danger/90",
      link: "text-primary underline-offset-4 hover:underline bg-transparent p-0 min-h-0",
    };

    const sizeStyles = {
      sm: "min-h-[44px] px-3 py-2 text-xs",
      md: "min-h-[44px] px-4 py-2 text-sm",
      lg: "min-h-[48px] px-6 py-3 text-base",
      icon: "h-11 w-11 min-h-[44px] p-0 flex items-center justify-center",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`relative ${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {isLoading && (
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          </span>
        )}
        <span className={isLoading ? "invisible flex items-center gap-2" : "flex items-center gap-2"}>
          {children}
        </span>
      </button>
    );
  }
);
Button.displayName = "Button";
