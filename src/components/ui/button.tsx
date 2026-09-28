import * as React from "react";
import { actionClassName, type ActionSize, type ActionVariant } from "./action-link";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ActionVariant;
  size?: ActionSize;
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", size = "md", isLoading = false, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`relative ${actionClassName({ variant, size, className })}`}
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
