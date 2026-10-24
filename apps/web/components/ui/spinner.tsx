import type { HTMLAttributes } from "react";

/** shadcn-style spinner (CSS-only; no lucide dependency). */
export function Spinner({
  className = "",
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block size-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
      {...props}
    />
  );
}
