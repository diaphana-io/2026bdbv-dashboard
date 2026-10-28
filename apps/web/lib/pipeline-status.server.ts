/**
 * I/O bag filler for sys.pipelineStatus.
 * Count / adapter key names must stay aligned with surv_engine::pipeline
 * (count_keys / adapter_keys / gate_keys). Engine walks PIPELINE_SPEC;
 * this module must not invent stage order or health rules.
 */
import discoveryQueries from "../data/discovery/queries.json";
import { getClaims, getConflictViews, getInboxCandidates } from "./data";
import { runCommand } from "./surv-engine";
import {
  isNeo4jConfigured,
  readNeo4jEnv,
  withSession,
} from "./neo4j";

/** Keys documented next to Rust `pipeline::count_keys`. */
const COUNT = {
  inbox: "inbox",
  pending_review: "pending_review",
  open_conflicts: "open_conflicts",
  discover: "discover",
} as const;

const ADAPTER = {
  classify: "classify",
  extract: "extract",
} as const;

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
    // Single timed session: connectivity + count (no unbounded verifyConnectivity).
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

function discoveryMeta(): {
  query_count: number;
  cron_configured: boolean;
} {
  const queries = Array.isArray(discoveryQueries.queries)
    ? discoveryQueries.queries
    : [];
  return {
    query_count: queries.length,
    cron_configured: Boolean(discoveryQueries.schedule_cron),
  };
}

/** Open param bags only — no stage list or health decisions. */
export async function gatherPipelineStatusParams(): Promise<Record<string, unknown>> {
  const extractEnabled = process.env.EXTRACT_ENABLED === "true";
  const discovery = discoveryMeta();
  const [inbox, conflicts, claims, neo4j] = await Promise.all([
    getInboxCandidates(),
    getConflictViews(),
    getClaims(),
    probeNeo4j(),
  ]);

  const pendingReview = claims.filter((c) => c.review_status === "pending_review");
  const openConflicts = conflicts.filter((c) => c.conflict.status === "open");

  return {
    extract_enabled: extractEnabled,
    gates: { extract_enabled: extractEnabled },
    // discover count omitted until D1 jobs exist → engine yields null
    counts: {
      [COUNT.inbox]: inbox.length,
      [COUNT.pending_review]: pendingReview.length,
      [COUNT.open_conflicts]: openConflicts.length,
    },
    adapters: {
      [ADAPTER.classify]: "not_configured",
      [ADAPTER.extract]: "not_configured",
    },
    // Empty until D1 / Jev job meters exist; engine zeros when not_configured.
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
}

export async function getPipelineStatus(): Promise<unknown> {
  const params = await gatherPipelineStatusParams();
  return runCommand("sys.pipelineStatus", params);
}
