import { describe, expect, it } from "vitest";
import {
  getClaimsD1,
  getInboxCandidatesD1,
  getSourcesD1,
  sourcesRowCount,
} from "./d1-queries";

type Row = Record<string, unknown>;

/** Minimal in-memory D1 stand-in for mapping / filter tests. */
function mockDb(tables: {
  sources?: Row[];
  claims?: Row[];
}): D1Database {
  const sources = tables.sources ?? [];
  const claims = tables.claims ?? [];

  function runSelect(sql: string, binds: unknown[]): Row[] {
    const normalized = sql.replace(/\s+/g, " ").trim().toLowerCase();
    if (normalized.includes("count(*)") && normalized.includes("from sources")) {
      return [{ n: sources.length }];
    }
    if (
      normalized.includes("from sources") &&
      normalized.includes("curation_status != 'candidate'")
    ) {
      return sources.filter((s) => s.curation_status !== "candidate");
    }
    if (
      normalized.includes("from sources") &&
      normalized.includes("curation_status = 'candidate'")
    ) {
      return sources.filter((s) => s.curation_status === "candidate");
    }
    if (normalized.includes("from claims") && !normalized.includes("where")) {
      return claims;
    }
    if (normalized.includes("from claims where id = ?")) {
      const id = binds[0];
      return claims.filter((c) => c.id === id);
    }
    return [];
  }

  return {
    prepare(query: string) {
      const binds: unknown[] = [];
      const stmt: D1PreparedStatement = {
        bind(...values: unknown[]) {
          binds.push(...values);
          return stmt;
        },
        async first<T = unknown>(colName?: string) {
          const rows = runSelect(query, binds);
          if (rows.length === 0) return null;
          if (colName) return rows[0][colName] as T;
          return rows[0] as T;
        },
        async all<T = unknown>() {
          return {
            results: runSelect(query, binds) as T[],
            success: true,
            meta: {},
          };
        },
        async run() {
          return { results: [], success: true, meta: {} };
        },
      };
      return stmt;
    },
  };
}

describe("d1-queries", () => {
  it("sourcesRowCount reports table size", async () => {
    const db = mockDb({
      sources: [{ id: "a", curation_status: "done" }],
    });
    expect(await sourcesRowCount(db)).toBe(1);
    expect(await sourcesRowCount(mockDb({ sources: [] }))).toBe(0);
  });

  it("getSourcesD1 excludes candidates", async () => {
    const db = mockDb({
      sources: [
        {
          id: "done-1",
          url: "https://example.test/a",
          normalized_url: "https://example.test/a",
          title: "A",
          publisher: "WHO",
          kind: "official_don",
          evidence_class: "intl_org",
          duplicate_level: "none",
          duplicate_of_source_id: null,
          published_at: "2026-10-01",
          discovered_at: null,
          curation_status: "done",
        },
        {
          id: "cand-1",
          url: "https://example.test/b",
          normalized_url: "https://example.test/b",
          title: "B",
          publisher: null,
          kind: "sitrep",
          evidence_class: "other",
          duplicate_level: "none",
          duplicate_of_source_id: null,
          published_at: null,
          discovered_at: "2026-10-02",
          curation_status: "candidate",
        },
      ],
    });
    const rows = await getSourcesD1(db);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe("done-1");
  });

  it("getInboxCandidatesD1 returns only candidates", async () => {
    const db = mockDb({
      sources: [
        {
          id: "done-1",
          url: "https://example.test/a",
          normalized_url: "https://example.test/a",
          title: "A",
          publisher: null,
          kind: "news",
          evidence_class: "news",
          duplicate_level: "none",
          duplicate_of_source_id: null,
          published_at: null,
          discovered_at: null,
          curation_status: "done",
        },
        {
          id: "cand-1",
          url: "https://example.test/b",
          normalized_url: "https://example.test/b",
          title: "B",
          publisher: "Wire",
          kind: "news",
          evidence_class: "news",
          duplicate_level: "possible",
          duplicate_of_source_id: "done-1",
          published_at: null,
          discovered_at: "2026-10-24",
          curation_status: "candidate",
        },
      ],
    });
    const rows = await getInboxCandidatesD1(db);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: "cand-1",
      duplicate_level: "possible",
      curation_status: "candidate",
    });
  });

  it("getClaimsD1 parses object_value JSON and is_head int", async () => {
    const db = mockDb({
      claims: [
        {
          id: "c1",
          source_id: "s1",
          claim_type: "case_count",
          claim_category: "aggregate_count",
          subject_ref: "KE",
          object_value: JSON.stringify({ confirmed: 9, deaths: 1 }),
          as_of_date: "2026-10-20",
          confidence: "official",
          review_status: "approved",
          excerpt: "nine cases",
          lineage_id: "lin-1",
          version: 2,
          is_head: 1,
          extractor: "human",
          reviewed_at: "2026-10-23T12:00:00.000Z",
          review_policy: null,
        },
      ],
    });
    const rows = await getClaimsD1(db);
    expect(rows).toHaveLength(1);
    expect(rows[0].object_value).toEqual({ confirmed: 9, deaths: 1 });
    expect(rows[0].is_head).toBe(true);
    expect(rows[0].version).toBe(2);
  });

  it("getClaimsD1 yields empty object_value on bad JSON", async () => {
    const db = mockDb({
      claims: [
        {
          id: "c2",
          source_id: "s1",
          claim_type: "case_count",
          claim_category: null,
          subject_ref: "NG",
          object_value: "{not-json",
          as_of_date: "2026-10-20",
          confidence: "news_single",
          review_status: "pending_review",
          excerpt: null,
          lineage_id: null,
          version: 1,
          is_head: 0,
          extractor: "human",
          reviewed_at: null,
          review_policy: null,
        },
      ],
    });
    const rows = await getClaimsD1(db);
    expect(rows[0].object_value).toEqual({});
    expect(rows[0].is_head).toBe(false);
  });
});
