"use client";

import * as React from "react";

const MAX_RATING = 5;
const RATING_VALUES = [1, 2, 3, 4, 5] as const;

interface StarIconProps {
  filled: boolean;
  className?: string;
}

function StarIcon({ filled, className = "h-4 w-4" }: StarIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
      focusable="false"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.48 3.5a.56.56 0 011.04 0l2.12 4.9 5.32.52c.5.05.7.67.32 1l-4.01 3.53 1.17 5.23c.11.49-.42.88-.85.62L12 16.55l-4.59 2.75c-.43.26-.96-.13-.85-.62l1.17-5.23-4.01-3.53a.56.56 0 01.32-1l5.32-.52 2.12-4.9z"
      />
    </svg>
  );
}

export interface RatingDisplayProps {
  /** Server-supplied rating. `null` renders the not-yet-rated presentation. */
  value: number | null;
  /** Accessible sentence describing what the rating belongs to. */
  label: string;
  className?: string;
}

/**
 * Read-only rating presentation. The numeric value is always rendered as text so
 * the rating is never communicated by shape or colour alone (design-system §26).
 */
export function RatingDisplay({ value, label, className = "" }: RatingDisplayProps) {
  if (value === null) {
    return <span className={`text-xs text-muted-foreground ${className}`}>Not yet rated</span>;
  }

  const rounded = Math.round(value);

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="flex items-center gap-0.5 text-accent" aria-hidden="true">
        {RATING_VALUES.map((star) => (
          <StarIcon key={star} filled={star <= rounded} />
        ))}
      </span>
      <span className="text-xs font-medium text-foreground">
        {value.toFixed(1)} out of {MAX_RATING}
        <span className="sr-only"> — {label}</span>
      </span>
    </span>
  );
}

export interface RatingInputProps {
  value: number;
  onChange: (rating: number) => void;
  name: string;
  disabled?: boolean;
  /** Id of the element describing the field, e.g. a validation message. */
  describedBy?: string;
}

/**
 * Rating field built from native radio inputs inside a fieldset, so keyboard
 * navigation, grouping semantics and screen-reader labelling come from the
 * platform rather than custom key handling.
 */
export function RatingInput({
  value,
  onChange,
  name,
  disabled = false,
  describedBy,
}: RatingInputProps) {
  return (
    <fieldset
      className="min-w-0 border-0 p-0 m-0"
      {...(describedBy ? { "aria-describedby": describedBy } : {})}
    >
      <legend className="block text-xs font-medium text-foreground mb-1.5">
        Your rating <span className="text-danger">*</span>
      </legend>

      <div className="flex flex-wrap items-center gap-1">
        {RATING_VALUES.map((star) => {
          const selected = star <= value;

          return (
            <label key={star} className="cursor-pointer">
              <input
                type="radio"
                name={name}
                value={star}
                checked={value === star}
                onChange={() => onChange(star)}
                disabled={disabled}
                className="sr-only peer"
              />
              <span
                className={`flex h-11 w-11 items-center justify-center rounded-md transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-info peer-disabled:opacity-50 ${
                  selected ? "text-accent" : "text-border-strong"
                } ${disabled ? "" : "hover:bg-surface-muted"}`}
              >
                <StarIcon filled={selected} className="h-6 w-6" />
                <span className="sr-only">
                  {star} {star === 1 ? "star" : "stars"}
                </span>
              </span>
            </label>
          );
        })}

        <span className="ml-2 text-xs text-muted-foreground" aria-live="polite">
          {value > 0 ? `${value} of ${MAX_RATING} selected` : "No rating selected"}
        </span>
      </div>
    </fieldset>
  );
}
