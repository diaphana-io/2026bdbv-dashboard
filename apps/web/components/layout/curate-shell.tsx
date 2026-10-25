"use client";

import type { ReactNode } from "react";
import type { CurateDataSource } from "@/lib/curate-data-source";
import { AppShell } from "./app-shell";
import { CurateSidebar } from "./curate-sidebar";

export function CurateShell({
  children,
  inboxCount,
  conflictCount,
  dataSource,
  neo4jConfigured,
}: {
  children: ReactNode;
  inboxCount?: number;
  conflictCount?: number;
  dataSource: CurateDataSource;
  neo4jConfigured: boolean;
}) {
  return (
    <AppShell
      variant="page"
      sidebar={
        <CurateSidebar
          inboxCount={inboxCount}
          conflictCount={conflictCount}
          dataSource={dataSource}
          neo4jConfigured={neo4jConfigured}
        />
      }
    >
      {children}
    </AppShell>
  );
}
