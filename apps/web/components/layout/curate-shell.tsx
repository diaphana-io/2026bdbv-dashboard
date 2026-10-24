"use client";

import type { ReactNode } from "react";
import { AppShell } from "./app-shell";
import { CurateSidebar } from "./curate-sidebar";

export function CurateShell({ children }: { children: ReactNode }) {
  return (
    <AppShell variant="page" sidebar={<CurateSidebar />}>
      {children}
    </AppShell>
  );
}
