"use client";

import type { ReactNode } from "react";
import { AppShell } from "./app-shell";
import { CurateSidebar } from "./curate-sidebar";

export function CurateShell({
  children,
  inboxCount,
  conflictCount,
}: {
  children: ReactNode;
  inboxCount?: number;
  conflictCount?: number;
}) {
  return (
    <AppShell
      variant="page"
      sidebar={
        <CurateSidebar
          inboxCount={inboxCount}
          conflictCount={conflictCount}
        />
      }
    >
      {children}
    </AppShell>
  );
}
