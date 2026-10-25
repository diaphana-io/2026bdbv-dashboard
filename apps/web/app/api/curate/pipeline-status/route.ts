import { readFile } from "node:fs/promises";
import path from "node:path";
import { getClaims, getConflictViews, getInboxCandidates } from "../../../../lib/data";
import { runCommand } from "../../../../lib/surv-engine";
import {
  isNeo4jConfigured,
  readNeo4jEnv,
  verifyConnectivity,
  withSession,
} from "../../../../lib/neo4j";

/**
 * Param bag keys must stay aligned with surv_engine::pipeline count_keys /
 * adapter_keys / gate_keys. Do not encode stage order here — Rust PIPELINE_SPEC owns that.
 */
async function probeNeo4j(): Promise<{
  configured: boolean;
  ok: boolean;
  error?: string;
  node_count?: number;
}> {
  const env = readNeo4jEnv();
  if (!isNeo4jConfigured(env)) {
    return { configured: false, ok: false, error: "neo4j_not_configured" };
  }
  try {
    await verifyConnectivity(env);
    const nodeCount = await withSession(async (session) => {
      const res = await session.run("MATCH (n) RETURN count(n) AS n");
      const n = res.records[0]?.get("n");
      return typeof n?.toNumber === "function" ? n.toNumber() : Number(n);
    }, env);
    return {
      configured: true,
      ok: true,
      node_count: Number.isFinite(nodeCount) ? nodeCount : undefined,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "neo4j_unreachable";
    return { configured: true, ok: false, error: message };
  }
}

async function discoveryMeta(): Promise<{
  query_count: number;
  cron_configured: boolean;
}> {
  try {
    const file = path.join(process.cwd(), "..", "..", "data", "discovery", "queries.json");
    // Prefer repo-root data/; fall back to apps/web-relative walks.
    const candidates = [
      file,
      path.join(process.cwd(), "data", "discovery", "queries.json"),
      path.resolve(process.cwd(), "../../data/discovery/queries.json"),
    ];
    for (const p of candidates) {
      try {
        const raw = await readFile(p, "utf8");
        const parsed = JSON.parse(raw) as {
          queries?: unknown[];
          schedule_cron?: string;
        };
        return {
          query_count: Array.isArray(parsed.queries) ? parsed.queries.length : 0,
          cron_configured: Boolean(parsed.schedule_cron),
        };
      } catch {
        /* try next */
      }
    }
  } catch {
    /* ignore */
  }
  return { query_count: 0, cron_configured: false };
}

export async function GET() {
  const extractEnabled = process.env.EXTRACT_ENABLED === "true";

  const [inbox, conflicts, claims, neo4j, discovery] = await Promise.all([
    getInboxCandidates(),
    getConflictViews(),
    getClaims(),
    probeNeo4j(),
    discoveryMeta(),
  ]);

  const pendingReview = claims.filter((c) => c.review_status === "pending_review");
  const openConflicts = conflicts.filter((c) => c.conflict.status === "open");

  const params = {
    extract_enabled: extractEnabled,
    counts: {
      inbox: inbox.length,
      pending_review: pendingReview.length,
      open_conflicts: openConflicts.length,
    },
    adapters: {
      classify: "not_configured",
      extract: "not_configured",
    },
    llm_usage: {},
    infra: {
      neo4j,
      r2: { configured: false, ok: false },
      d1: { configured: false, ok: false },
      discovery: {
        configured: discovery.query_count > 0,
        ok: discovery.query_count > 0,
        query_count: discovery.query_count,
        cron_configured: discovery.cron_configured,
      },
    },
  };

  try {
    const result = await runCommand("sys.pipelineStatus", params);
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "pipeline_status_failed";
    return Response.json({ error: message }, { status: 503 });
  }
}
