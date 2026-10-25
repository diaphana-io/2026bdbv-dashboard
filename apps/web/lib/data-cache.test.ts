import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// data.ts imports the server module; vitest has no vinext next/headers alias.
vi.mock("./curate-data-source.server", () => ({
  preferFixtureData: async () => false,
}));

vi.mock("./d1", () => ({
  getDb: vi.fn(() => null),
}));

describe("graph read cache facade", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("serves TTL-fresh Neo4j results without a second query", async () => {
    vi.stubEnv("NEO4J_URI", "bolt://127.0.0.1:7687");
    vi.stubEnv("NEO4J_USER", "neo4j");
    vi.stubEnv("NEO4J_PASSWORD", "test");
    vi.stubEnv("NEO4J_READ_CACHE_TTL_MS", "60000");

    const { getDb } = await import("./d1");
    vi.mocked(getDb).mockReturnValue(null);

    const neo4j = await import("./neo4j-queries");
    const spy = vi
      .spyOn(neo4j, "getInboxCandidatesNeo4j")
      .mockResolvedValue([
        {
          id: "1",
          url: "https://example.test/a",
          title: "A",
          publisher: undefined,
          kind: "sitrep",
          curation_status: "candidate",
        },
      ]);

    const { getInboxCandidates, invalidateGraphReadCache } = await import("./data");
    const first = await getInboxCandidates();
    const second = await getInboxCandidates();
    expect(first).toEqual(second);
    expect(spy).toHaveBeenCalledTimes(1);

    invalidateGraphReadCache();
    await getInboxCandidates();
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("falls back to JSON when Neo4j rejects and cache is empty", async () => {
    vi.stubEnv("NEO4J_URI", "bolt://127.0.0.1:7687");
    vi.stubEnv("NEO4J_USER", "neo4j");
    vi.stubEnv("NEO4J_PASSWORD", "test");

    const { getDb } = await import("./d1");
    vi.mocked(getDb).mockReturnValue(null);

    const neo4j = await import("./neo4j-queries");
    vi.spyOn(neo4j, "getConflictViewsNeo4j").mockRejectedValue(
      new Error("neo4j_timeout:100ms"),
    );

    const { getConflictViews } = await import("./data");
    const { getConflictViewsJson } = await import("./data-json");
    const views = await getConflictViews();
    expect(views).toEqual(getConflictViewsJson());
  });

  it("empty D1 (sources=0) falls through to Neo4j", async () => {
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

    const neo4j = await import("./neo4j-queries");
    const spy = vi
      .spyOn(neo4j, "getInboxCandidatesNeo4j")
      .mockResolvedValue([
        {
          id: "neo",
          url: "https://example.test/neo",
          kind: "sitrep",
          curation_status: "candidate",
        },
      ]);

    const { getInboxCandidates } = await import("./data");
    const rows = await getInboxCandidates();
    expect(rows[0].id).toBe("neo");
    expect(spy).toHaveBeenCalledTimes(1);
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

    const neo4j = await import("./neo4j-queries");
    const spy = vi
      .spyOn(neo4j, "getInboxCandidatesNeo4j")
      .mockResolvedValue([
        {
          id: "neo",
          url: "https://example.test/neo",
          kind: "sitrep",
          curation_status: "candidate",
        },
      ]);

    const { getInboxCandidates } = await import("./data");
    const rows = await getInboxCandidates();
    expect(rows).toEqual(d1Inbox);
    expect(spy).not.toHaveBeenCalled();
  });
});
