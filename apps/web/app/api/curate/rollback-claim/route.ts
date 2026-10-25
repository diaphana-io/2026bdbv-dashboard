import { shouldUseNeo4j } from "../../../../lib/curate-data-source.server";
import { invalidateGraphReadCache } from "../../../../lib/data";
import {
  loadClaimGraphRow,
  persistRollbackClaim,
} from "../../../../lib/neo4j-curate";
import { isNeo4jConfigured } from "../../../../lib/neo4j";
import { runCommand } from "../../../../lib/surv-engine";

type EngineRollbackResult = {
  applied?: boolean;
  claim?: Record<string, unknown>;
  audit?: Record<string, unknown>;
  error?: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const record = asRecord(body) ?? {};
  const claimId = asString(record.claim_id)?.trim() ?? "";
  const targetClaimId = asString(record.target_claim_id)?.trim();
  const reason = asString(record.reason)?.trim() ?? "";

  if (!claimId) {
    return Response.json({ error: "claim_id required" }, { status: 400 });
  }
  if (!reason) {
    return Response.json({ error: "reason required" }, { status: 400 });
  }

  if (!isNeo4jConfigured() || !(await shouldUseNeo4j())) {
    return Response.json(
      { error: "neo4j_required_for_rollback" },
      { status: 503 },
    );
  }

  try {
    const head = await loadClaimGraphRow(claimId);
    if (!head) {
      return Response.json({ error: "claim_not_found" }, { status: 404 });
    }
    // Approved + not explicitly demoted. Missing is_head (legacy) counts as head.
    if (head.review_status !== "approved" || head.is_head === false) {
      return Response.json(
        { error: "claim_not_approved_head" },
        { status: 409 },
      );
    }

    let target = head;
    if (targetClaimId && targetClaimId !== claimId) {
      const loaded = await loadClaimGraphRow(targetClaimId);
      if (!loaded) {
        return Response.json({ error: "target_claim_not_found" }, { status: 404 });
      }
      const headLineage = head.lineage_id ?? head.id;
      const targetLineage = loaded.lineage_id ?? loaded.id;
      if (headLineage !== targetLineage) {
        return Response.json(
          { error: "target_claim_lineage_mismatch" },
          { status: 400 },
        );
      }
      target = loaded;
    }

    const newClaimId = crypto.randomUUID();
    const engineRaw = (await runCommand("curate.rollbackClaim", {
      claim: {
        id: head.id,
        lineage_id: head.lineage_id ?? head.id,
        version: head.version,
        claim_type: head.claim_type,
        claim_category: head.claim_category,
        subject_ref: head.subject_ref,
        object_value: head.object_value,
        as_of_date: head.as_of_date,
        confidence: head.confidence,
        extractor: head.extractor,
        review_status: head.review_status,
        is_head: true,
        source_id: head.source_id,
        excerpt: head.excerpt,
        claim_fingerprint: head.claim_fingerprint,
      },
      target_claim: {
        id: target.id,
        lineage_id: target.lineage_id ?? target.id,
        version: target.version,
        claim_type: target.claim_type,
        claim_category: target.claim_category,
        subject_ref: target.subject_ref,
        object_value: target.object_value,
        as_of_date: target.as_of_date,
        confidence: target.confidence,
        extractor: target.extractor,
        review_status: target.review_status,
        source_id: target.source_id,
        excerpt: target.excerpt,
        claim_fingerprint: target.claim_fingerprint,
      },
      new_claim_id: newClaimId,
      actor: "curator",
      reason,
    })) as EngineRollbackResult;

    if (engineRaw && typeof engineRaw === "object" && "error" in engineRaw) {
      const err = asString(engineRaw.error) ?? "rollback_engine_failed";
      return Response.json({ error: err }, { status: 400 });
    }

    const pending = asRecord(engineRaw.claim);
    const audit = asRecord(engineRaw.audit);
    if (!pending || !audit) {
      return Response.json({ error: "rollback_engine_invalid" }, { status: 503 });
    }

    const pendingId = asString(pending.id) ?? newClaimId;
    const lineageId =
      asString(pending.lineage_id) ?? head.lineage_id ?? head.id;
    const toVersion = asNumber(pending.version) ?? head.version + 1;

    await persistRollbackClaim({
      head: { ...head, is_head: true },
      pending: {
        id: pendingId,
        lineage_id: lineageId,
        version: toVersion,
        claim_type: asString(pending.claim_type) ?? target.claim_type,
        claim_category:
          asString(pending.claim_category) ?? target.claim_category,
        subject_ref: asString(pending.subject_ref) ?? target.subject_ref,
        object_value:
          asRecord(pending.object_value) ?? target.object_value ?? {},
        as_of_date: asString(pending.as_of_date) ?? target.as_of_date,
        confidence: asString(pending.confidence) ?? target.confidence,
        extractor: asString(pending.extractor) ?? target.extractor,
        source_id: asString(pending.source_id) ?? target.source_id,
        excerpt: asString(pending.excerpt) ?? target.excerpt,
        claim_fingerprint:
          asString(pending.claim_fingerprint) ?? target.claim_fingerprint,
      },
      audit: {
        actor: asString(audit.actor) ?? "curator",
        lineage_id: asString(audit.lineage_id) ?? lineageId,
        claim_id: asString(audit.claim_id) ?? pendingId,
        from_version: asNumber(audit.from_version) ?? head.version,
        to_version: asNumber(audit.to_version) ?? toVersion,
        reason,
        payload_digest: asString(audit.payload_digest) ?? null,
      },
    });

    invalidateGraphReadCache();

    return Response.json({
      applied: true,
      persisted: true,
      withdrawn_claim_id: head.id,
      pending_claim_id: pendingId,
      lineage_id: lineageId,
      from_version: head.version,
      to_version: toVersion,
      review_status: "pending_review",
      map_withdrawn: true,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "rollback_failed";
    if (message.startsWith("claim_not_found:")) {
      return Response.json({ error: "claim_not_found" }, { status: 404 });
    }
    return Response.json({ error: message }, { status: 503 });
  }
}
