"use client";

import { useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { withBasePath } from "../../lib/base-path";
import { curateApiPath } from "../../lib/curate-surface";
import type { InboxRow } from "../../lib/data-types";
import type { SourceBibCandidate } from "../../lib/source-bib";
import {
  EVIDENCE_CLASSES,
  SOURCE_KINDS,
  type EvidenceClass,
  type SourceKind,
  isEvidenceClass,
  isSourceKind,
} from "../../lib/source-enums";

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

type BibDraft = {
  url: string;
  doi: string | null;
  title: string;
  publisher: string;
  kind: SourceKind;
  evidence_class: EvidenceClass;
  bib_source: SourceBibCandidate["bib_source"];
  container_title: string | null;
  published_at: string | null;
};

function draftFromBib(bib: SourceBibCandidate): BibDraft {
  return {
    url: bib.url,
    doi: bib.doi,
    title: bib.title ?? "",
    publisher: bib.publisher ?? "",
    kind: isSourceKind(bib.kind) ? bib.kind : "other",
    evidence_class: isEvidenceClass(bib.evidence_class)
      ? bib.evidence_class
      : "other",
    bib_source: bib.bib_source,
    container_title: bib.container_title,
    published_at: bib.published_at,
  };
}

export function SubmitSourceForm({
  onSubmitted,
}: {
  onSubmitted: (row: InboxRow) => void;
}) {
  const [identifier, setIdentifier] = useState("");
  const [draft, setDraft] = useState<BibDraft | null>(null);
  const [fetching, setFetching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function onFetch(e?: FormEvent) {
    e?.preventDefault();
    const value = identifier.trim();
    if (!value) return;
    setFetching(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(withBasePath(curateApiPath("fetch-source-bib")), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ identifier: value }),
      });
      const data = (await res.json()) as SourceBibCandidate & {
        error?: string;
      };
      if (!res.ok) {
        setDraft(null);
        setError(
          data.error === "unrecognized_identifier"
            ? "Enter a URL or DOI (e.g. 10.1234/… or https://…)."
            : (data.error ?? `HTTP ${res.status}`),
        );
        return;
      }
      setDraft(draftFromBib(data));
      setMessage(
        data.bib_source === "crossref"
          ? "Crossref candidate loaded — edit if needed, then add to Inbox."
          : "No Crossref hit — fill title/category as needed, then add to Inbox.",
      );
    } catch (err) {
      setDraft(null);
      setError(err instanceof Error ? err.message : "fetch failed");
    } finally {
      setFetching(false);
    }
  }

  async function onSubmitBib(e: FormEvent) {
    e.preventDefault();
    if (!draft?.url) return;
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(withBasePath(curateApiPath("submit-source")), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          url: draft.url,
          title: draft.title || null,
          publisher: draft.publisher || null,
          kind: draft.kind,
          evidence_class: draft.evidence_class,
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
      setIdentifier("");
      setDraft(null);
      setMessage(
        data.persisted
          ? "Added to Inbox."
          : "Added locally (Neo4j not writing on this request).",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "request failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <form
        onSubmit={(e) => void onFetch(e)}
        className="flex min-w-0 flex-col gap-3"
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="submit-identifier">URL or identifier</Label>
          <Input
            id="submit-identifier"
            value={identifier}
            onChange={(e) => {
              setIdentifier(e.target.value);
              setDraft(null);
              setMessage(null);
              setError(null);
            }}
            placeholder="https://… or 10.1234/… or doi:10.…"
            autoComplete="off"
          />
          <p className="text-[11px] text-muted-foreground">
            Paste a source URL or DOI in the same field, then Fetch to load a
            bibliographic candidate on the right.
          </p>
        </div>
        <div>
          <Button type="submit" disabled={fetching || !identifier.trim()}>
            {fetching ? (
              <>
                <Spinner className="size-3.5" />
                Fetching…
              </>
            ) : (
              "Fetch"
            )}
          </Button>
        </div>
        {error && !draft && (
          <p className="text-xs text-destructive">{error}</p>
        )}
        {message && !draft && (
          <p className="text-xs text-muted-foreground">{message}</p>
        )}
      </form>

      <div className="min-w-0 rounded-lg border border-border/80 bg-muted/20">
        {!draft ? (
          <div className="flex h-full min-h-40 flex-col items-center justify-center gap-1 px-4 py-6 text-center">
            <p className="text-sm font-medium">Bibliographic candidate</p>
            <p className="text-xs text-muted-foreground">
              Fetch a URL or DOI to preview title, category, and publisher here.
            </p>
          </div>
        ) : (
          <form
            onSubmit={(e) => void onSubmitBib(e)}
            className="flex flex-col gap-3 p-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">
                Bibliographic candidate
              </span>
              <Badge variant="secondary">{draft.bib_source}</Badge>
              {draft.doi && (
                <Badge variant="outline" className="font-mono text-[10px]">
                  {draft.doi}
                </Badge>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bib-title">Title</Label>
              <Input
                id="bib-title"
                value={draft.title}
                onChange={(e) =>
                  setDraft({ ...draft, title: e.target.value })
                }
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bib-publisher">Publisher</Label>
              <Input
                id="bib-publisher"
                value={draft.publisher}
                onChange={(e) =>
                  setDraft({ ...draft, publisher: e.target.value })
                }
              />
            </div>

            {(draft.container_title || draft.published_at) && (
              <p className="text-[11px] text-muted-foreground">
                {draft.container_title ? (
                  <span>{draft.container_title}</span>
                ) : null}
                {draft.container_title && draft.published_at ? " · " : null}
                {draft.published_at
                  ? `Published ${draft.published_at.slice(0, 10)}`
                  : null}
              </p>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="bib-kind">Category</Label>
                <select
                  id="bib-kind"
                  className={selectClassName}
                  value={draft.kind}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      kind: e.target.value as SourceKind,
                    })
                  }
                >
                  {SOURCE_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="bib-evidence">Evidence class</Label>
                <select
                  id="bib-evidence"
                  className={selectClassName}
                  value={draft.evidence_class}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      evidence_class: e.target.value as EvidenceClass,
                    })
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

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bib-url">Resolved URL</Label>
              <Input
                id="bib-url"
                value={draft.url}
                onChange={(e) => setDraft({ ...draft, url: e.target.value })}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" disabled={submitting || !draft.url.trim()}>
                {submitting ? "Adding…" : "Add to Inbox"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={submitting}
                onClick={() => {
                  setDraft(null);
                  setMessage(null);
                  setError(null);
                }}
              >
                Clear
              </Button>
            </div>

            {message && (
              <p className="text-xs text-muted-foreground">{message}</p>
            )}
            {error && <p className="text-xs text-destructive">{error}</p>}
          </form>
        )}
      </div>
    </div>
  );
}
