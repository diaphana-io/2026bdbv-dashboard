"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { withBasePath } from "../../lib/base-path";
import type { DuplicateLevel } from "../../lib/data-types";

export function InboxActions({
  url,
  duplicateLevel = "none",
}: {
  url: string;
  duplicateLevel?: DuplicateLevel | string | null;
}) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const level = (duplicateLevel ?? "none") as DuplicateLevel;
  const exactDup = level === "exact_url" || level === "content_hash";
  const reviewHref = `/curate/review?url=${encodeURIComponent(url)}`;

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

  function acceptExactDup() {
    const ok = window.confirm(
      "This source looks like an exact duplicate (same URL or content hash). Accept anyway to open Review?",
    );
    if (ok) router.push(reviewHref);
  }

  if (dismissed) {
    return <span className="text-xs text-muted-foreground">Dismissed (session)</span>;
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-2">
        {exactDup ? (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={acceptExactDup}
            className="text-muted-foreground"
          >
            Accept anyway
          </Button>
        ) : (
          <Button variant="outline" size="xs" asChild>
            <Link href={reviewHref}>Accept</Link>
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          size="xs"
          disabled={pending}
          onClick={() => void dismiss()}
        >
          Dismiss
        </Button>
      </div>
      {exactDup && (
        <span className="text-[11px] text-amber-800 dark:text-amber-200">
          Flagged duplicate — review before accepting
        </span>
      )}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
