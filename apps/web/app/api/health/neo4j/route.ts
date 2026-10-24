import {
  isNeo4jConfigured,
  readNeo4jEnv,
  resolveNeo4jDatabase,
  verifyConnectivity,
  withSession,
} from "../../../../lib/neo4j";

export async function GET() {
  const env = readNeo4jEnv();
  if (!isNeo4jConfigured(env)) {
    return Response.json(
      { ok: false, configured: false, error: "neo4j_not_configured" },
      { status: 503 },
    );
  }

  try {
    await verifyConnectivity(env);
    const database = resolveNeo4jDatabase(env);
    const nodeCount = await withSession(async (session) => {
      const res = await session.run("MATCH (n) RETURN count(n) AS n");
      const n = res.records[0]?.get("n");
      return typeof n?.toNumber === "function" ? n.toNumber() : Number(n);
    }, env);
    return Response.json({
      ok: true,
      configured: true,
      // Host only — never echo password.
      uriHost: safeHost(env.uri!),
      database,
      nodeCount,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "neo4j_unreachable";
    return Response.json(
      {
        ok: false,
        configured: true,
        database: resolveNeo4jDatabase(env),
        error: message,
      },
      { status: 503 },
    );
  }
}

function safeHost(uri: string): string {
  try {
    return new URL(uri.replace(/^neo4j(\+s)?:\/\//, "https://")).host;
  } catch {
    return "unknown";
  }
}
