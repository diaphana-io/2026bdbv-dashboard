/**
 * Parse a single curator paste field: URL, DOI, or DOI URL.
 * Other bare identifiers are returned as `unknown` for the UI to reject or extend later.
 */

const DOI_RE =
  /\b(10\.\d{4,9}\/[-._;()/:A-Z0-9]+)\b/i;

export type ParsedSourceIdentifier =
  | { kind: "url"; url: string; doi: string | null }
  | { kind: "doi"; doi: string; url: string }
  | { kind: "unknown"; raw: string };

export function extractDoi(raw: string): string | null {
  const m = raw.trim().match(DOI_RE);
  if (!m?.[1]) return null;
  return m[1].replace(/\.+$/, "").toLowerCase();
}

export function doiLandingUrl(doi: string): string {
  return `https://doi.org/${doi}`;
}

export function parseSourceIdentifier(raw: string): ParsedSourceIdentifier {
  const trimmed = raw.trim();
  if (!trimmed) return { kind: "unknown", raw: trimmed };

  const doi = extractDoi(trimmed);
  if (doi) {
    // Prefer explicit http(s) URL when the paste is a landing page that embeds a DOI.
    try {
      const u = new URL(trimmed);
      if (u.protocol === "http:" || u.protocol === "https:") {
        const host = u.hostname.toLowerCase();
        if (host === "doi.org" || host === "dx.doi.org" || host.endsWith(".doi.org")) {
          return { kind: "doi", doi, url: doiLandingUrl(doi) };
        }
        return { kind: "url", url: trimmed, doi };
      }
    } catch {
      // bare DOI or "doi:10.…"
    }
    return { kind: "doi", doi, url: doiLandingUrl(doi) };
  }

  try {
    const u = new URL(trimmed);
    if (u.protocol === "http:" || u.protocol === "https:") {
      return { kind: "url", url: trimmed, doi: null };
    }
  } catch {
    // not a URL
  }

  return { kind: "unknown", raw: trimmed };
}
