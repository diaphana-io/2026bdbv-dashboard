"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { withBasePath } from "../../lib/base-path";
import type { InboxRow } from "../../lib/data-types";
import {
  EVIDENCE_CLASSES,
  SOURCE_KINDS,
  type EvidenceClass,
  type SourceKind,
} from "../../lib/source-enums";

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export function SubmitSourceForm({
  onSubmitted,
}: {
  onSubmitted: (row: InboxRow) => void;
}) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [publisher, setPublisher] = useState("");
  const [kind, setKind] = useState<SourceKind>("other");
  const [evidenceClass, setEvidenceClass] = useState<EvidenceClass>("other");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(withBasePath("/api/curate/submit-source"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          url,
          title: title || null,
          publisher: publisher || null,
          kind,
          evidence_class: evidenceClass,
        }),
      });
      const data = (await res.json()) as InboxRow & {
        error?: string;
        persisted?: boolean;
      };
      if (!res.ok) {
        setError(
          data.error === "duplicate_url"
            ? "That URL is already in the graph."
            : (data.error ?? `HTTP ${res.status}`),
        );
        return;
      }
      onSubmitted({
        id: data.id,
        url: data.url,
        title: data.title ?? undefined,
        publisher: data.publisher ?? undefined,
        kind: data.kind,
        evidence_class: data.evidence_class ?? "other",
        duplicate_level: data.duplicate_level ?? "none",
        curation_status: "candidate",
        discovered_at: data.discovered_at,
      });
      setUrl("");
      setTitle("");
      setPublisher("");
      setKind("other");
      setEvidenceClass("other");
      setMessage(
        data.persisted
          ? "Added to Inbox."
          : "Added locally (Neo4j not writing on this request).",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "request failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-2">
          <Label htmlFor="submit-url">Source URL</Label>
          <Input
            id="submit-url"
            type="url"
            required
            placeholder="https://…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="submit-title">Title</Label>
          <Input
            id="submit-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Optional"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="submit-publisher">Publisher</Label>
          <Input
            id="submit-publisher"
            value={publisher}
            onChange={(e) => setPublisher(e.target.value)}
            placeholder="Optional"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="submit-kind">Kind</Label>
          <select
            id="submit-kind"
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
          <Label htmlFor="submit-evidence">Evidence class</Label>
          <select
            id="submit-evidence"
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
        <div className="flex items-end sm:col-span-2 lg:col-span-2">
          <Button type="submit" disabled={pending || !url.trim()}>
            {pending ? "Submitting…" : "Submit source"}
          </Button>
        </div>
      </div>
      {message && (
        <p className="text-xs text-muted-foreground">{message}</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </form>
  );
}
