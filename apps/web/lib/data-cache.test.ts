import { afterEach, describe, expect, it, vi } from "vitest";

describe("graph read cache facade", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("serves TTL-fresh Neo4j results without a second query", async () => {
    vi.stubEnv("NEO4J_URI", "bolt://127.0.0.1:7687");
    vi.stubEnv("NEO4J_USER", "neo4j");
    vi.stubEnv("NEO4J_PASSWORD", "test");
    vi.stubEnv("NEO4J_READ_CACHE_TTL_MS", "60000");

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
    spy.mockRestore();
  });

  it("falls back to JSON when Neo4j rejects and cache is empty", async () => {
    vi.stubEnv("NEO4J_URI", "bolt://127.0.0.1:7687");
    vi.stubEnv("NEO4J_USER", "neo4j");
    vi.stubEnv("NEO4J_PASSWORD", "test");

    const neo4j = await import("./neo4j-queries");
    const spy = vi
      .spyOn(neo4j, "getConflictViewsNeo4j")
      .mockRejectedValue(new Error("neo4j_timeout:100ms"));

    const { getConflictViews } = await import("./data");
    const { getConflictViewsJson } = await import("./data-json");
    const views = await getConflictViews();
    expect(views).toEqual(getConflictViewsJson());
    spy.mockRestore();
  });
});
