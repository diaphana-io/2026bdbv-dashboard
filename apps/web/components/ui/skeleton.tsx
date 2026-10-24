import type { HTMLAttributes } from "react";

/** shadcn-style skeleton placeholder. */
export function Skeleton({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`animate-pulse rounded-md bg-zinc-200/80 ${className}`}
      {...props}
    />
  );
}
