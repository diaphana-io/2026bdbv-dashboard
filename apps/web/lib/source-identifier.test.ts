import { describe, expect, it } from "vitest";
import {
  doiLandingUrl,
  extractDoi,
  parseSourceIdentifier,
} from "./source-identifier";

describe("source-identifier", () => {
  it("extracts bare DOI", () => {
    expect(extractDoi("10.1038/s41586-020-2000-0")).toBe(
      "10.1038/s41586-020-2000-0",
    );
  });

  it("parses doi.org URL as doi", () => {
    const p = parseSourceIdentifier(
      "https://doi.org/10.1038/s41586-020-2000-0",
    );
    expect(p).toEqual({
      kind: "doi",
      doi: "10.1038/s41586-020-2000-0",
      url: doiLandingUrl("10.1038/s41586-020-2000-0"),
    });
  });

  it("keeps publisher URL that embeds a DOI", () => {
    const p = parseSourceIdentifier(
      "https://journals.example.org/doi/10.1038/s41586-020-2000-0",
    );
    expect(p).toEqual({
      kind: "url",
      url: "https://journals.example.org/doi/10.1038/s41586-020-2000-0",
      doi: "10.1038/s41586-020-2000-0",
    });
  });

  it("parses plain https URL", () => {
    const p = parseSourceIdentifier(
      "https://www.who.int/emergencies/disease-outbreak-news/item/2026-DON622",
    );
    expect(p).toEqual({
      kind: "url",
      url: "https://www.who.int/emergencies/disease-outbreak-news/item/2026-DON622",
      doi: null,
    });
  });

  it("rejects bare non-DOI text", () => {
    expect(parseSourceIdentifier("PMID:12345").kind).toBe("unknown");
  });
});
