import { CurateShell } from "@/components/layout/curate-shell";

export default function CurateLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <CurateShell>
      <div className="mx-auto max-w-7xl px-4 py-4">{children}</div>
    </CurateShell>
  );
}
