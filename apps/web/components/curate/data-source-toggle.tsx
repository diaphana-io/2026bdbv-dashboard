"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  curateDataSourceCookieHeader,
  type CurateDataSource,
} from "@/lib/curate-data-source";

export function CurateDataSourceToggle({
  initialSource,
  neo4jConfigured,
}: {
  initialSource: CurateDataSource;
  neo4jConfigured: boolean;
}) {
  const router = useRouter();
  const [source, setSource] = useState<CurateDataSource>(initialSource);
  const [pending, startTransition] = useTransition();

  const live = neo4jConfigured && source === "live";

  function onCheckedChange(checked: boolean) {
    if (checked && !neo4jConfigured) return;
    const next: CurateDataSource = checked ? "live" : "fixture";
    document.cookie = curateDataSourceCookieHeader(next);
    setSource(next);
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-1.5 px-1 py-1">
      <div className="flex items-center justify-between gap-2">
        <Label
          htmlFor="curate-data-source"
          className="text-[11px] font-medium leading-tight text-sidebar-foreground"
        >
          Live Neo4j
        </Label>
        <Switch
          id="curate-data-source"
          size="sm"
          checked={live}
          disabled={pending || !neo4jConfigured}
          onCheckedChange={onCheckedChange}
          aria-label="Use live Neo4j data instead of fixture seed"
        />
      </div>
      <p className="text-[10px] leading-snug text-muted-foreground">
        {!neo4jConfigured
          ? "Neo4j not configured — using fixture seed."
          : live
            ? "Graph (Aura / Bolt). Off = seed JSON."
            : "Fixture seed (`apps/web/data`)."}
      </p>
    </div>
  );
}
