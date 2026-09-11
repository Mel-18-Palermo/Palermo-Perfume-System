import * as React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string | undefined;
  error?: string | undefined;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", label, error, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-text mb-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full min-h-[44px] px-3 py-2 border rounded-md bg-surface text-text placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            error ? "border-danger focus-visible:ring-danger" : "border-border"
          } ${className}`}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";
