import { describe, expect, it } from "vitest";
import {
  isNeo4jConfigured,
  readNeo4jEnv,
  resolveNeo4jDatabase,
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
