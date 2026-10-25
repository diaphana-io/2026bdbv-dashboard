import { describe, expect, it } from "vitest";
import {
  loadClaimTabularRow,
  persistDismissSource,
  persistResolveConflict,
  persistReviewClaim,
  persistRollbackClaim,
  persistSubmitSource,
  persistUpdateSource,
} from "./d1-curate";

type Row = Record<string, unknown>;

type Tables = {
  sources: Row[];
  claims: Row[];
  claim_conflicts: Row[];
  curate_audit_events: Row[];
  dismissed_sources: Row[];
};

/** Mutable in-memory D1 stand-in covering Phase 3 write SQL. */
function mockDb(seed?: Partial<Tables>): D1Database {
  const tables: Tables = {
    sources: [...(seed?.sources ?? [])],
    claims: [...(seed?.claims ?? [])],
    claim_conflicts: [...(seed?.claim_conflicts ?? [])],
    curate_audit_events: [...(seed?.curate_audit_events ?? [])],
    dismissed_sources: [...(seed?.dismissed_sources ?? [])],
  };

  function runStatement(sql: string, binds: unknown[]): { changes: number; rows: Row[] } {
    const normalized = sql.replace(/\s+/g, " ").trim().toLowerCase();

    if (normalized.startsWith("select id from sources where normalized_url")) {
      const rows = tables.sources.filter((s) => s.normalized_url === binds[0]);
      return { changes: 0, rows };
    }
    if (
      normalized.includes("select id from sources") &&
      normalized.includes("url = ? or normalized_url = ?")
    ) {
      const rows = tables.sources.filter(
        (s) => s.url === binds[0] || s.normalized_url === binds[1],
      );
      return { changes: 0, rows };
    }
    if (normalized.includes("from claims where id = ?")) {
      const rows = tables.claims.filter((c) => c.id === binds[0]);
      return { changes: 0, rows };
    }
    if (normalized.startsWith("insert into sources")) {
      tables.sources.push({
        id: binds[0],
        url: binds[1],
        normalized_url: binds[2],
        title: binds[3],
        publisher: binds[4],
        kind: binds[5],
        evidence_class: binds[6],
        duplicate_level: "none",
        curation_status: "candidate",
        discovered_at: binds[7],
      });
      return { changes: 1, rows: [] };
    }
    if (
      normalized.startsWith("update sources") &&
      normalized.includes("curation_status = 'candidate'")
    ) {
      const row = tables.sources.find(
        (s) => s.id === binds[4] && s.curation_status === "candidate",
      );
      if (!row) return { changes: 0, rows: [] };
      row.title = binds[0];
      row.publisher = binds[1];
      row.kind = binds[2];
      row.evidence_class = binds[3];
      return { changes: 1, rows: [] };
    }
    if (
      normalized.startsWith("update sources") &&
      normalized.includes("curation_status = 'dismissed'")
    ) {
      let changes = 0;
      for (const s of tables.sources) {
        if (s.normalized_url === binds[0]) {
          s.curation_status = "dismissed";
          changes += 1;
        }
      }
      return { changes, rows: [] };
    }
    if (normalized.startsWith("insert into dismissed_sources")) {
      const existing = tables.dismissed_sources.find(
        (d) => d.normalized_url === binds[0],
      );
      if (existing) {
        existing.dismissed_at = binds[1];
      } else {
        tables.dismissed_sources.push({
          normalized_url: binds[0],
          dismissed_at: binds[1],
        });
      }
      return { changes: 1, rows: [] };
    }
    if (normalized.startsWith("update claim_conflicts")) {
      const row = tables.claim_conflicts.find((c) => c.id === binds[2]);
      if (!row) return { changes: 0, rows: [] };
      row.status = binds[0];
      row.resolved_at = binds[1];
      return { changes: 1, rows: [] };
    }
    if (normalized.startsWith("insert into claim_conflicts")) {
      tables.claim_conflicts.push({
        id: binds[0],
        claim_a_id: binds[1],
        claim_b_id: binds[2],
        subject_ref: binds[3],
        claim_type: binds[4],
        status: "open",
        detected_at: binds[5],
      });
      return { changes: 1, rows: [] };
    }
    if (normalized.startsWith("insert into curate_audit_events")) {
      tables.curate_audit_events.push({
        id: binds[0],
        at: binds[1],
        actor: binds[2],
        action: binds[3],
        lineage_id: binds[4],
        claim_id: binds[5],
        source_id: binds[6],
        from_version: binds[7],
        to_version: binds[8],
        reason: binds[9],
        payload_digest: binds[10],
      });
      return { changes: 1, rows: [] };
    }
    if (
      normalized.startsWith("update claims") &&
      normalized.includes("review_status = 'rejected'")
    ) {
      const row = tables.claims.find((c) => c.id === binds[3]);
      if (!row) return { changes: 0, rows: [] };
      row.review_status = "rejected";
      row.rejection_reason = binds[0];
      row.reviewed_at = binds[1];
      row.lineage_id = row.lineage_id ?? binds[2];
      row.is_head = 0;
      return { changes: 1, rows: [] };
    }
    if (
      normalized.startsWith("update claims") &&
      normalized.includes("review_status = 'approved'")
    ) {
      const row = tables.claims.find((c) => c.id === binds[9]);
      if (!row) return { changes: 0, rows: [] };
      row.claim_type = binds[0];
      row.claim_category = binds[1];
      row.subject_ref = binds[2];
      row.object_value = binds[3];
      row.as_of_date = binds[4];
      row.claim_fingerprint = binds[5];
      row.reviewed_at = binds[6];
      row.reviewed_by = "curator";
      row.source_id = binds[7];
      row.lineage_id = row.lineage_id ?? binds[8];
      row.review_status = "approved";
      row.is_head = 1;
      row.rejection_reason = null;
      return { changes: 1, rows: [] };
    }
    if (
      normalized.startsWith("update claims") &&
      normalized.includes("review_status = 'superseded'")
    ) {
      const row = tables.claims.find((c) => c.id === binds[0]);
      if (!row) return { changes: 0, rows: [] };
      row.review_status = "superseded";
      row.is_head = 0;
      return { changes: 1, rows: [] };
    }
    if (
      normalized.startsWith("insert into claims") &&
      normalized.includes("'approved'")
    ) {
      tables.claims.push({
        id: binds[0],
        source_id: binds[1],
        claim_type: binds[2],
        claim_category: binds[3],
        subject_ref: binds[4],
        object_value: binds[5],
        as_of_date: binds[6],
        claim_fingerprint: binds[7],
        lineage_id: binds[8],
        version: binds[9],
        is_head: 1,
        confidence: "human",
        extractor: "human",
        review_status: "approved",
        reviewed_at: binds[10],
        reviewed_by: "curator",
        excerpt: null,
      });
      return { changes: 1, rows: [] };
    }
    if (
      normalized.startsWith("insert into claims") &&
      normalized.includes("'pending_review'")
    ) {
      tables.claims.push({
        id: binds[0],
        source_id: binds[1],
        claim_type: binds[2],
        claim_category: binds[3],
        subject_ref: binds[4],
        object_value: binds[5],
        as_of_date: binds[6],
        claim_fingerprint: binds[7],
        lineage_id: binds[8],
        version: binds[9],
        is_head: 0,
        needs_revision: 0,
        confidence: binds[10],
        excerpt: binds[11],
        extractor: binds[12],
        review_status: "pending_review",
      });
      return { changes: 1, rows: [] };
    }
    if (
      normalized.startsWith("insert into claims") &&
      normalized.includes("'rejected'")
    ) {
      tables.claims.push({
        id: binds[0],
        source_id: binds[1],
        claim_type: "unknown",
        claim_category: "other",
        subject_ref: "unknown",
        object_value: "{}",
        as_of_date: "now",
        claim_fingerprint: "reject-placeholder",
        lineage_id: binds[2],
        version: 1,
        is_head: 0,
        confidence: "human",
        extractor: "human",
        review_status: "rejected",
        reviewed_at: binds[3],
        rejection_reason: binds[4],
        excerpt: null,
      });
      return { changes: 1, rows: [] };
    }

    return { changes: 0, rows: [] };
  }

  const db = {
    prepare(query: string) {
      const binds: unknown[] = [];
      const stmt: D1PreparedStatement = {
        bind(...values: unknown[]) {
          binds.push(...values);
          return stmt;
        },
        async first<T = unknown>(colName?: string) {
          const { rows } = runStatement(query, binds);
          if (rows.length === 0) return null;
          if (colName) return rows[0][colName] as T;
          return rows[0] as T;
        },
        async all<T = unknown>() {
          const { rows } = runStatement(query, binds);
          return { results: rows as T[], success: true, meta: {} };
        },
        async run() {
          const { changes } = runStatement(query, binds);
          return {
            results: [],
            success: true,
            meta: { changes },
          };
        },
      };
      return stmt;
    },
    async batch(statements: D1PreparedStatement[]) {
      const out = [];
      for (const s of statements) {
        out.push(await s.run());
      }
      return out;
    },
    _tables: tables,
  };
  return db as D1Database & { _tables: Tables };
}

function baseSource(id = "src-1"): Row {
  return {
    id,
    url: "https://example.test/a",
    normalized_url: "https://example.test/a",
    title: "A",
    publisher: "WHO",
    kind: "official_don",
    evidence_class: "intl_org",
    curation_status: "candidate",
  };
}

function baseClaim(overrides: Partial<Row> = {}): Row {
  return {
    id: "claim-1",
    source_id: "src-1",
    claim_type: "case_count",
    claim_category: "aggregate_count",
    subject_ref: "KE",
    object_value: JSON.stringify({ confirmed: 3 }),
    as_of_date: "2026-10-20",
    claim_fingerprint: "KE|case_count|2026-10-20|{}",
    lineage_id: "lin-1",
    version: 1,
    is_head: 1,
    confidence: "human",
    extractor: "human",
    review_status: "approved",
    excerpt: null,
    ...overrides,
  };
}

describe("d1-curate", () => {
  it("persistSubmitSource inserts candidate or reports duplicate", async () => {
    const db = mockDb({ sources: [baseSource()] }) as D1Database & {
      _tables: Tables;
    };
    const dup = await persistSubmitSource(db, {
      id: "new",
      url: "https://example.test/a",
      normalizedUrl: "https://example.test/a",
      kind: "news",
      evidenceClass: "news",
    });
    expect(dup).toEqual({ created: false, existingId: "src-1" });

    const ok = await persistSubmitSource(db, {
      id: "src-2",
      url: "https://example.test/b",
      normalizedUrl: "https://example.test/b",
      title: "B",
      kind: "news",
      evidenceClass: "news",
    });
    expect(ok).toEqual({ created: true });
    expect(db._tables.sources).toHaveLength(2);
    expect(db._tables.sources[1].curation_status).toBe("candidate");
  });

  it("persistUpdateSource updates candidate only", async () => {
    const db = mockDb({ sources: [baseSource()] });
    await persistUpdateSource(db, {
      id: "src-1",
      title: "Updated",
      publisher: "CDC",
      kind: "sitrep",
      evidenceClass: "gov",
    });
    const tables = (db as D1Database & { _tables: Tables })._tables;
    expect(tables.sources[0]).toMatchObject({
      title: "Updated",
      publisher: "CDC",
      kind: "sitrep",
    });

    await expect(
      persistUpdateSource(db, {
        id: "missing",
        kind: "news",
        evidenceClass: "news",
      }),
    ).rejects.toThrow(/source_not_found/);
  });

  it("persistDismissSource records dismissal and updates source status", async () => {
    const db = mockDb({ sources: [baseSource()] }) as D1Database & {
      _tables: Tables;
    };
    await persistDismissSource(db, "https://example.test/a");
    expect(db._tables.dismissed_sources).toHaveLength(1);
    expect(db._tables.sources[0].curation_status).toBe("dismissed");
  });

  it("persistReviewClaim approve updates claim, writes audit, opens conflict", async () => {
    const db = mockDb({
      sources: [baseSource("src-1")],
      claims: [
        baseClaim({
          id: "claim-1",
          review_status: "pending_review",
          is_head: 0,
        }),
        baseClaim({
          id: "claim-2",
          subject_ref: "KE",
          review_status: "approved",
        }),
      ],
    }) as D1Database & { _tables: Tables };

    const out = await persistReviewClaim(db, {
      action: "approve",
      claimId: "claim-1",
      claimType: "case_count",
      claimCategory: "aggregate_count",
      subjectRef: "KE",
      asOfDate: "2026-10-21",
      objectValue: { confirmed: 5 },
      conflictsWithClaimId: "claim-2",
    });
    expect(out.claimId).toBe("claim-1");
    expect(out.lineageId).toBe("lin-1");
    expect(db._tables.claims.find((c) => c.id === "claim-1")).toMatchObject({
      review_status: "approved",
      is_head: 1,
    });
    expect(db._tables.curate_audit_events).toHaveLength(1);
    expect(db._tables.curate_audit_events[0].action).toBe("approve");
    expect(db._tables.claim_conflicts).toHaveLength(1);
    expect(db._tables.claim_conflicts[0]).toMatchObject({
      claim_a_id: "claim-1",
      claim_b_id: "claim-2",
      status: "open",
    });
  });

  it("persistReviewClaim reject updates existing claim + audit", async () => {
    const db = mockDb({
      sources: [baseSource()],
      claims: [baseClaim({ review_status: "pending_review", is_head: 0 })],
    }) as D1Database & { _tables: Tables };

    const out = await persistReviewClaim(db, {
      action: "reject",
      claimId: "claim-1",
      rejectionReason: "weak evidence",
    });
    expect(out.claimId).toBe("claim-1");
    expect(db._tables.claims[0]).toMatchObject({
      review_status: "rejected",
      rejection_reason: "weak evidence",
      is_head: 0,
    });
    expect(db._tables.curate_audit_events[0].action).toBe("reject");
  });

  it("persistResolveConflict sets status or throws", async () => {
    const db = mockDb({
      claim_conflicts: [
        {
          id: "cf-1",
          claim_a_id: "a",
          claim_b_id: "b",
          subject_ref: "KE",
          claim_type: "case_count",
          status: "open",
          detected_at: "2026-10-01",
        },
      ],
    }) as D1Database & { _tables: Tables };

    await persistResolveConflict(db, "cf-1", "resolved_a");
    expect(db._tables.claim_conflicts[0].status).toBe("resolved_a");
    await expect(
      persistResolveConflict(db, "missing", "resolved_b"),
    ).rejects.toThrow(/conflict_not_found/);
  });

  it("persistRollbackClaim supersedes head and inserts pending + audit", async () => {
    const db = mockDb({
      sources: [baseSource()],
      claims: [baseClaim()],
    }) as D1Database & { _tables: Tables };

    const head = await loadClaimTabularRow(db, "claim-1");
    expect(head).not.toBeNull();

    const out = await persistRollbackClaim(db, {
      head: head!,
      pending: {
        id: "claim-2",
        lineage_id: "lin-1",
        version: 2,
        claim_type: "case_count",
        claim_category: "aggregate_count",
        subject_ref: "KE",
        object_value: { confirmed: 2 },
        as_of_date: "2026-10-19",
        source_id: "src-1",
      },
      audit: {
        actor: "curator",
        lineage_id: "lin-1",
        claim_id: "claim-2",
        from_version: 1,
        to_version: 2,
        reason: "correction",
      },
    });
    expect(out.newClaimId).toBe("claim-2");
    expect(db._tables.claims.find((c) => c.id === "claim-1")).toMatchObject({
      review_status: "superseded",
      is_head: 0,
    });
    expect(db._tables.claims.find((c) => c.id === "claim-2")).toMatchObject({
      review_status: "pending_review",
      version: 2,
    });
    expect(db._tables.curate_audit_events[0].action).toBe("rollback");
  });
});
