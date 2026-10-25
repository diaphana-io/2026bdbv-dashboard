import type { SourceBibCandidate } from "./source-bib";
import {
  doiLandingUrl,
  parseSourceIdentifier,
  type ParsedSourceIdentifier,
} from "./source-identifier";
import type { EvidenceClass, SourceKind } from "./source-enums";

export type { SourceBibCandidate } from "./source-bib";

type CrossrefWork = {
  DOI?: string;
  title?: string[];
  publisher?: string;
  type?: string;
  URL?: string;
  issued?: { "date-parts"?: number[][] };
  "container-title"?: string[];
  author?: Array<{ given?: string; family?: string }>;
};

function mapCrossrefType(type: string | undefined): {
  kind: SourceKind;
  evidence_class: EvidenceClass;
} {
  switch (type) {
    case "journal-article":
    case "proceedings-article":
    case "book-chapter":
    case "book":
    case "monograph":
    case "report":
    case "posted-content":
      return { kind: "other", evidence_class: "academic" };
    default:
      return { kind: "other", evidence_class: "other" };
  }
}

function issuedToIso(issued?: { "date-parts"?: number[][] }): string | null {
  const parts = issued?.["date-parts"]?.[0];
  if (!parts || parts.length < 1) return null;
  const y = parts[0]!;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  const iso = `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}T00:00:00.000Z`;
  return Number.isFinite(Date.parse(iso)) ? iso : null;
}

async function fetchCrossrefWork(doi: string): Promise<CrossrefWork | null> {
  const endpoint = `https://api.crossref.org/works/${encodeURIComponent(doi)}`;
  const res = await fetch(endpoint, {
    headers: {
      Accept: "application/json",
      "User-Agent":
        "BDBV-Dashboard/0.1 (https://2026bdbv.diaphana.io; curate inbox bib)",
    },
    signal: AbortSignal.timeout(8_000),
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`crossref_http_${res.status}`);
  }
  const json = (await res.json()) as { message?: CrossrefWork };
  return json.message ?? null;
}

function fromCrossref(
  input: string,
  parsed: ParsedSourceIdentifier & { doi: string },
  work: CrossrefWork,
): SourceBibCandidate {
  const mapped = mapCrossrefType(work.type);
  const doi = (work.DOI ?? parsed.doi).toLowerCase();
  const url =
    parsed.kind === "url" && "url" in parsed
      ? parsed.url
      : work.URL || doiLandingUrl(doi);
  return {
    input,
    identifier_kind: parsed.kind,
    doi,
    url,
    title: work.title?.[0]?.trim() || null,
    publisher: work.publisher?.trim() || null,
    kind: mapped.kind,
    evidence_class: mapped.evidence_class,
    bib_source: "crossref",
    published_at: issuedToIso(work.issued),
    container_title: work["container-title"]?.[0]?.trim() || null,
  };
}

function urlOnly(input: string, url: string, doi: string | null): SourceBibCandidate {
  return {
    input,
    identifier_kind: doi ? "doi" : "url",
    doi,
    url,
    title: null,
    publisher: null,
    kind: "other",
    evidence_class: doi ? "academic" : "other",
    bib_source: "url_only",
    published_at: null,
    container_title: null,
  };
}

/**
 * Resolve curator paste → editable bib candidate.
 * DOI path prefers Crossref; plain URLs return an empty bib shell around the URL.
 */
export async function fetchSourceBib(
  raw: string,
): Promise<
  | { ok: true; bib: SourceBibCandidate }
  | { ok: false; error: string; status: number }
> {
  const input = raw.trim();
  if (!input) {
    return { ok: false, error: "identifier_required", status: 400 };
  }

  const parsed = parseSourceIdentifier(input);
  if (parsed.kind === "unknown") {
    return { ok: false, error: "unrecognized_identifier", status: 400 };
  }

  const doi = parsed.doi;

  if (doi) {
    try {
      const work = await fetchCrossrefWork(doi);
      if (work) {
        return {
          ok: true,
          bib: fromCrossref(input, { ...parsed, doi }, work),
        };
      }
    } catch {
      // Crossref timeout / HTTP error — still return a DOI URL shell.
    }
    return {
      ok: true,
      bib: urlOnly(
        input,
        parsed.kind === "url" ? parsed.url : doiLandingUrl(doi),
        doi,
      ),
    };
  }

  return { ok: true, bib: urlOnly(input, parsed.url, null) };
}
