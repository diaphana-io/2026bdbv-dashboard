import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// data.ts imports the server module; vitest has no vinext next/headers alias.
vi.mock("./curate-data-source.server", () => ({
  preferFixtureData: async () => false,
}));

vi.mock("./d1", () => ({
  getDb: vi.fn(() => null),
}));

// data.ts imports the server module; vitest has no vinext next/headers alias.
vi.mock("./curate-data-source.server", () => ({
  preferFixtureData: async () => false,
}));

describe("graph read cache facade", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.doUnmock("./neo4j-queries");
  });

  it("serves TTL-fresh Neo4j Case results without a second query", async () => {
    vi.stubEnv("NEO4J_URI", "bolt://127.0.0.1:7687");
    vi.stubEnv("NEO4J_USER", "neo4j");
    vi.stubEnv("NEO4J_PASSWORD", "test");
    vi.stubEnv("NEO4J_READ_CACHE_TTL_MS", "60000");

    const outbreak = { id: "ob-1", name: "Test" };
    const spy = vi.fn().mockResolvedValue(outbreak);
    vi.doMock("./neo4j-queries", async () => {
      const actual = await vi.importActual<typeof import("./neo4j-queries")>(
        "./neo4j-queries",
      );
      return { ...actual, getOutbreakNeo4j: spy };
    });

    const { getOutbreak, invalidateGraphReadCache } = await import("./data");
    const first = await getOutbreak();
    const second = await getOutbreak();
    expect(first).toEqual(outbreak);
    expect(second).toEqual(outbreak);
    expect(spy).toHaveBeenCalledTimes(1);

    invalidateGraphReadCache();
    await getOutbreak();
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("Claim reads fall back to JSON when D1 is unbound (no Neo4j Claim)", async () => {
    vi.stubEnv("NEO4J_URI", "bolt://127.0.0.1:7687");
    vi.stubEnv("NEO4J_USER", "neo4j");
    vi.stubEnv("NEO4J_PASSWORD", "test");

    const { getDb } = await import("./d1");
    vi.mocked(getDb).mockReturnValue(null);

    const neo4j = await import("./neo4j-queries");
    expect(neo4j).not.toHaveProperty("getConflictViewsNeo4j");
    expect(neo4j).not.toHaveProperty("getClaimsNeo4j");

    const { getConflictViews } = await import("./data");
    const { getConflictViewsJson } = await import("./data-json");
    const views = await getConflictViews();
    expect(views).toEqual(getConflictViewsJson());
  });

  it("empty D1 (sources=0) falls through to JSON without Neo4j Claim", async () => {
    vi.stubEnv("NEO4J_URI", "bolt://127.0.0.1:7687");
    vi.stubEnv("NEO4J_USER", "neo4j");
    vi.stubEnv("NEO4J_PASSWORD", "test");
    vi.stubEnv("NEO4J_READ_CACHE_TTL_MS", "0");

    const fakeDb = { prepare: () => ({}) } as unknown as D1Database;
    const { getDb } = await import("./d1");
    vi.mocked(getDb).mockReturnValue(fakeDb);

    const queries = await import("./d1-queries");
    vi.spyOn(queries, "sourcesRowCount").mockResolvedValue(0);
    vi.spyOn(queries, "getInboxCandidatesD1").mockImplementation(async () => {
      throw new Error("should not call D1 inbox when empty");
    });
    vi.spyOn(queries, "getClaimsD1").mockImplementation(async () => {
      throw new Error("should not call D1 claims when empty");
    });

    const { getInboxCandidates, getClaims } = await import("./data");
    const { getInboxCandidatesJson, getClaimsJson } = await import("./data-json");

    expect(await getInboxCandidates()).toEqual(getInboxCandidatesJson());
    expect(await getClaims()).toEqual(getClaimsJson());
  });

  it("non-empty D1 serves Claim reads without Neo4j", async () => {
    vi.stubEnv("NEO4J_URI", "bolt://127.0.0.1:7687");
    vi.stubEnv("NEO4J_USER", "neo4j");
    vi.stubEnv("NEO4J_PASSWORD", "test");
    vi.stubEnv("NEO4J_READ_CACHE_TTL_MS", "0");

    const d1Inbox = [
      {
        id: "d1",
        url: "https://example.test/d1",
        kind: "sitrep",
        curation_status: "candidate" as const,
      },
    ];
    const fakeDb = { prepare: () => ({}) } as unknown as D1Database;
    const { getDb } = await import("./d1");
    vi.mocked(getDb).mockReturnValue(fakeDb);

    const queries = await import("./d1-queries");
    vi.spyOn(queries, "sourcesRowCount").mockResolvedValue(3);
    vi.spyOn(queries, "getInboxCandidatesD1").mockResolvedValue(d1Inbox);

    const { getInboxCandidates } = await import("./data");
    const rows = await getInboxCandidates();
    expect(rows).toEqual(d1Inbox);
  });

  it("map snapshot empty D1 uses JSON aggregates + Neo4j graph (no Claim MATCH)", async () => {
    vi.stubEnv("NEO4J_URI", "bolt://127.0.0.1:7687");
    vi.stubEnv("NEO4J_USER", "neo4j");
    vi.stubEnv("NEO4J_PASSWORD", "test");
    vi.stubEnv("NEO4J_READ_CACHE_TTL_MS", "0");

    const { getDb } = await import("./d1");
    vi.mocked(getDb).mockReturnValue(null);

    const neo4j = await import("./neo4j-queries");
    expect(neo4j).not.toHaveProperty("getMapAggregatesFromClaimsNeo4j");
    expect(neo4j).not.toHaveProperty("getMapSnapshotNeo4j");

    const graphSpy = vi.spyOn(neo4j, "getMapSnapshotGraphNeo4j").mockResolvedValue({
      cases: [
        {
          id: "case-neo",
          visual_id: "BDBV-NEO",
          admin0_iso: "UGA",
          classification: "confirmed",
          lat: 1,
          lon: 2,
          date_of_onset: null,
          date_of_reporting: "2026-10-01",
        },
      ],
      travels: [],
      exposures: [],
    });

    const { getMapSnapshot } = await import("./data");
    const { getMapSnapshotJson } = await import("./data-json");
    const snap = await getMapSnapshot("2026-10-23");

    expect(graphSpy).toHaveBeenCalledTimes(1);
    expect(snap.aggregates).toEqual(getMapSnapshotJson("2026-10-23").aggregates);
    expect(snap.cases[0]?.id).toBe("case-neo");
  });

  it("map snapshot non-empty D1 joins claims and does not call Claim Neo4j", async () => {
    vi.stubEnv("NEO4J_URI", "bolt://127.0.0.1:7687");
    vi.stubEnv("NEO4J_USER", "neo4j");
    vi.stubEnv("NEO4J_PASSWORD", "test");
    vi.stubEnv("NEO4J_READ_CACHE_TTL_MS", "0");

    const fakeDb = { prepare: () => ({}) } as unknown as D1Database;
    const { getDb } = await import("./d1");
    vi.mocked(getDb).mockReturnValue(fakeDb);

    const queries = await import("./d1-queries");
    vi.spyOn(queries, "sourcesRowCount").mockResolvedValue(2);
    vi.spyOn(queries, "getApprovedCaseCountClaimsD1").mockResolvedValue([
      {
        id: "c1",
        claim_type: "case_count",
        subject_ref: "UGA",
        object_value: { confirmed: 9, deaths: 1 },
        as_of_date: "2026-10-20",
        confidence: "high",
        review_status: "approved",
        source_id: "s1",
      },
    ]);

    const neo4j = await import("./neo4j-queries");
    vi.spyOn(neo4j, "getAggregateAdminUnitsNeo4j").mockResolvedValue([
      { iso: "UGA", name: "Uganda", lat: 1.3, lon: 32.3 },
    ]);
    vi.spyOn(neo4j, "getMapSnapshotGraphNeo4j").mockResolvedValue({
      cases: [],
      travels: [],
      exposures: [],
    });

    const { getMapSnapshot } = await import("./data");
    const snap = await getMapSnapshot("2026-10-23");
    expect(snap.aggregates).toEqual([
      {
        admin_iso: "UGA",
        name: "Uganda",
        lat: 1.3,
        lon: 32.3,
        confirmed: 9,
        deaths: 1,
        as_of_date: "2026-10-20",
      },
    ]);
  });
});
