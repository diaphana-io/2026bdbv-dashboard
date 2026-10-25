"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { withBasePath } from "../../lib/base-path";
import type { DuplicateLevel, InboxRow } from "../../lib/data-types";
import {
  EVIDENCE_CLASSES,
  SOURCE_KINDS,
  type EvidenceClass,
  type SourceKind,
  isEvidenceClass,
  isSourceKind,
} from "../../lib/source-enums";
import { DuplicateLevelBadge } from "./duplicate-level-badge";

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export function InboxDetailPanel({
  row,
  onUpdated,
  onDismissed,
}: {
  row: InboxRow | null;
  onUpdated: (row: InboxRow) => void;
  onDismissed: (id: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [publisher, setPublisher] = useState("");
  const [kind, setKind] = useState<SourceKind>("other");
  const [evidenceClass, setEvidenceClass] = useState<EvidenceClass>("other");
  const [pending, setPending] = useState(false);
  const [dismissPending, setDismissPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!row) {
      setTitle("");
      setPublisher("");
      setKind("other");
      setEvidenceClass("other");
      setError(null);
      setMessage(null);
      return;
    }
    setTitle(row.title ?? "");
    setPublisher(row.publisher ?? "");
    setKind(isSourceKind(row.kind) ? row.kind : "other");
    setEvidenceClass(
      row.evidence_class && isEvidenceClass(row.evidence_class)
        ? row.evidence_class
        : "other",
    );
    setError(null);
    setMessage(null);
  }, [row]);

  if (!row) {
    return (
      <div className="flex h-full min-h-48 flex-col items-center justify-center gap-1 px-4 text-center">
        <p className="text-sm font-medium">No source selected</p>
        <p className="text-xs text-muted-foreground">
          Choose a candidate in the table to view and edit metadata.
        </p>
      </div>
    );
  }

  const level = (row.duplicate_level ?? "none") as DuplicateLevel;
  const exactDup = level === "exact_url" || level === "content_hash";
  const reviewHref = `/curate/review?url=${encodeURIComponent(row.url)}`;

  async function save() {
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(withBasePath("/api/curate/update-source"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: row!.id,
          title: title || null,
          publisher: publisher || null,
          kind,
          evidence_class: evidenceClass,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        persisted?: boolean;
        title?: string | null;
        publisher?: string | null;
        kind?: string;
        evidence_class?: string;
      };
      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      onUpdated({
        ...row!,
        title: data.title ?? undefined,
        publisher: data.publisher ?? undefined,
        kind: data.kind ?? kind,
        evidence_class: data.evidence_class ?? evidenceClass,
      });
      setMessage(
        data.persisted
          ? "Metadata saved."
          : "Saved locally (Neo4j not writing on this request).",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "request failed");
    } finally {
      setPending(false);
    }
  }

  async function dismiss() {
    setDismissPending(true);
    setError(null);
    try {
      const res = await fetch(withBasePath("/api/curate/dismiss-source"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: row!.url }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      onDismissed(row!.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "request failed");
    } finally {
      setDismissPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <DuplicateLevelBadge level={row.duplicate_level} />
          <Badge variant="outline">{row.kind}</Badge>
          {row.evidence_class && (
            <Badge variant="secondary">{row.evidence_class}</Badge>
          )}
        </div>
        <a
          href={row.url}
          target="_blank"
          rel="noreferrer"
          className="break-all text-sm text-blue-700 hover:underline dark:text-blue-400"
        >
          {row.url}
        </a>
        {row.discovered_at && (
          <p className="text-[11px] text-muted-foreground">
            Discovered {row.discovered_at.slice(0, 10)}
          </p>
        )}
      </div>

      <div className="grid gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="detail-title">Title</Label>
          <Input
            id="detail-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="detail-publisher">Publisher</Label>
          <Input
            id="detail-publisher"
            value={publisher}
            onChange={(e) => setPublisher(e.target.value)}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="detail-kind">Kind</Label>
            <select
              id="detail-kind"
              className={selectClassName}
              value={kind}
              onChange={(e) => setKind(e.target.value as SourceKind)}
            >
              {SOURCE_KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="detail-evidence">Evidence class</Label>
            <select
              id="detail-evidence"
              className={selectClassName}
              value={evidenceClass}
              onChange={(e) =>
                setEvidenceClass(e.target.value as EvidenceClass)
              }
            >
              {EVIDENCE_CLASSES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={pending}
          onClick={() => void save()}
        >
          {pending ? "Saving…" : "Save metadata"}
        </Button>
        {exactDup ? (
          <Button variant="ghost" size="default" asChild>
            <Link href={reviewHref}>Accept anyway</Link>
          </Button>
        ) : (
          <Button variant="outline" asChild>
            <Link href={reviewHref}>Accept → Review</Link>
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          disabled={dismissPending}
          onClick={() => void dismiss()}
        >
          {dismissPending ? "Dismissing…" : "Dismiss"}
        </Button>
      </div>

      {exactDup && (
        <p className="text-[11px] text-amber-800 dark:text-amber-200">
          Flagged duplicate — review before accepting.
        </p>
      )}
      {message && (
        <p className="text-xs text-muted-foreground">{message}</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
