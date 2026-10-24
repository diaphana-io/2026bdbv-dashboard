"use client";

import { useState } from "react";
import { Button } from "../ui/button";

export function ResolveConflictActions({ conflictId }: { conflictId: string }) {
  const [status, setStatus] = useState<string | null>(null);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        disabled={!!status}
        onClick={() => setStatus("resolved_a")}
      >
        Keep A
      </Button>
      <Button
        type="button"
        variant="outline"
        disabled={!!status}
        onClick={() => setStatus("resolved_b")}
      >
        Keep B
      </Button>
      <Button
        type="button"
        variant="secondary"
        disabled={!!status}
        onClick={() => setStatus("resolved_neither")}
      >
        Keep neither
      </Button>
      {status && (
        <span className="text-xs text-zinc-600">
          {conflictId.slice(0, 8)}… → {status}
        </span>
      )}
    </div>
  );
}
