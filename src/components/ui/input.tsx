import * as React from "react";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", label, error, helperText, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-medium text-foreground">
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          aria-invalid={!!error}
          className={`w-full rounded-md border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${
            error ? "border-danger focus:ring-danger" : "border-border"
          } ${className}`}
          {...props}
        />
        {error ? (
          <p className="text-xs text-danger">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-muted-foreground">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
