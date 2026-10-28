"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { ResolveStatus } from "@/lib/curate-api";
import { withBasePath } from "@/lib/base-path";
import { curateApiPath } from "@/lib/curate-surface";

export function ResolveConflictActions({ conflictId }: { conflictId: string }) {
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function resolve(next: ResolveStatus) {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(withBasePath(curateApiPath("resolve-conflict")), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ conflict_id: conflictId, status: next }),
      });
      const data = (await res.json()) as { error?: string; status?: string };
      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      setStatus(data.status ?? next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "request failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        disabled={!!status || pending}
        onClick={() => void resolve("resolved_a")}
      >
        Keep A
      </Button>
      <Button
        type="button"
        variant="outline"
        disabled={!!status || pending}
        onClick={() => void resolve("resolved_b")}
      >
        Keep B
      </Button>
      <Button
        type="button"
        variant="secondary"
        disabled={!!status || pending}
        onClick={() => void resolve("resolved_neither")}
      >
        Keep neither
      </Button>
      {status && (
        <span className="text-xs text-zinc-600">
          {conflictId.slice(0, 8)}… → {status}
        </span>
      )}
      {error && <span className="text-xs text-red-700">{error}</span>}
    </div>
  );
}
