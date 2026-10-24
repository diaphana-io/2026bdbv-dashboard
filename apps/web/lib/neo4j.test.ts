import { describe, expect, it, vi } from "vitest";
import {
  isNeo4jConfigured,
  isNeo4jTimeoutError,
  neo4jSessionTimeoutMs,
  readNeo4jEnv,
  resolveNeo4jDatabase,
  withHardTimeout,
  Neo4jTimeoutError,
} from "./neo4j";

describe("readNeo4jEnv / isNeo4jConfigured", () => {
  it("is false when any field is missing", () => {
    expect(isNeo4jConfigured({})).toBe(false);
    expect(isNeo4jConfigured({ uri: "bolt://localhost:7687" })).toBe(false);
    expect(
      isNeo4jConfigured({
        uri: "bolt://localhost:7687",
        user: "neo4j",
      }),
    ).toBe(false);
  });

  it("is true when uri, user, and password are set", () => {
    expect(
      isNeo4jConfigured({
        uri: "neo4j+s://example.databases.neo4j.io",
        user: "neo4j",
        password: "secret",
      }),
    ).toBe(true);
  });

  it("reads process-style env keys", () => {
    const env = readNeo4jEnv({
      NEO4J_URI: " bolt://127.0.0.1:7687 ",
      NEO4J_USER: " neo4j ",
      NEO4J_PASSWORD: "bdbvlocal",
    } as NodeJS.ProcessEnv);
    expect(env).toEqual({
      uri: "bolt://127.0.0.1:7687",
      user: "neo4j",
      password: "bdbvlocal",
      database: undefined,
    });
    expect(isNeo4jConfigured(env)).toBe(true);
  });

  it("resolves Aura instance database from user when unset", () => {
    expect(
      resolveNeo4jDatabase({
        uri: "neo4j+s://928c135c.databases.neo4j.io",
        user: "928c135c",
        password: "x",
      }),
    ).toBe("928c135c");
    expect(
      resolveNeo4jDatabase({
        uri: "bolt://127.0.0.1:7687",
        user: "neo4j",
        password: "x",
        database: "neo4j",
      }),
    ).toBe("neo4j");
  });
});

describe("withHardTimeout / neo4jSessionTimeoutMs", () => {
  it("defaults to 2500ms and accepts overrides", () => {
    expect(neo4jSessionTimeoutMs({} as NodeJS.ProcessEnv)).toBe(2_500);
    expect(
      neo4jSessionTimeoutMs({ NEO4J_SESSION_TIMEOUT_MS: "1200" } as NodeJS.ProcessEnv),
    ).toBe(1_200);
    expect(
      neo4jSessionTimeoutMs({ NEO4J_SESSION_TIMEOUT_MS: "nope" } as NodeJS.ProcessEnv),
    ).toBe(2_500);
  });

  it("resolves when the work finishes before the deadline", async () => {
    await expect(withHardTimeout(Promise.resolve("ok"), 500)).resolves.toBe("ok");
  });

  it("rejects Neo4jTimeoutError when the promise never settles", async () => {
    vi.useFakeTimers();
    const hung = new Promise<string>(() => undefined);
    const pending = withHardTimeout(hung, 100);
    const assertion = expect(pending).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof Neo4jTimeoutError &&
        isNeo4jTimeoutError(err) &&
        err.message === "neo4j_timeout:100ms",
    );
    await vi.advanceTimersByTimeAsync(100);
    await assertion;
    vi.useRealTimers();
  });
});
