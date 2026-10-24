import type { ReactNode } from "react";

export function Badge({
  children,
  variant = "default",
}: {
  children: ReactNode;
  variant?: "default" | "secondary" | "destructive" | "outline" | "warning";
}) {
  const styles: Record<string, string> = {
    default: "bg-zinc-900 text-white",
    secondary: "bg-zinc-100 text-zinc-800",
    destructive: "bg-red-600 text-white",
    outline: "border border-zinc-300 text-zinc-800",
    warning: "bg-amber-100 text-amber-900 border border-amber-300",
  };
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${styles[variant]}`}
    >
      {children}
    </span>
  );
}
