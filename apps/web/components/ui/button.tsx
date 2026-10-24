import type { ButtonHTMLAttributes, ReactNode } from "react";

export function Button({
  children,
  variant = "default",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "default" | "outline" | "secondary" | "destructive";
}) {
  const styles: Record<string, string> = {
    default: "bg-zinc-900 text-white hover:bg-zinc-800",
    outline: "border border-zinc-300 bg-white hover:bg-zinc-50",
    secondary: "bg-zinc-100 text-zinc-900 hover:bg-zinc-200",
    destructive: "bg-red-600 text-white hover:bg-red-700",
  };
  return (
    <button
      className={`inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
