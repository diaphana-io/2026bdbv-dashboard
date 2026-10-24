"use client";

import Link from "next/link";
import { useState } from "react";
import { withBasePath } from "../../lib/base-path";

export function InboxActions({ url }: { url: string }) {
  const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function dismiss() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(withBasePath("/api/curate/dismiss-source"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      setDismissed(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "request failed");
    } finally {
      setPending(false);
    }
  }

  if (dismissed) {
    return <span className="text-xs text-zinc-500">Dismissed (session)</span>;
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2">
        <Link
          href={`/curate/review?url=${encodeURIComponent(url)}`}
          className="rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50"
        >
          Accept
        </Link>
        <button
          type="button"
          disabled={pending}
          onClick={() => void dismiss()}
          className="rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50 disabled:opacity-50"
        >
          Dismiss
        </button>
      </div>
      {error && <span className="text-xs text-red-700">{error}</span>}
    </div>
  );
}
