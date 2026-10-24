import type { Integer, Node, Record as Neo4jRecord } from "neo4j-driver";
import type {
  CaseQueryOpts,
  CaseRow,
  ClaimRow,
  ConflictView,
  ContactRow,
  InboxRow,
  MeasureRow,
  SourceRow,
} from "./data-types";
import { withSession } from "./neo4j";

function num(v: unknown): number | undefined {
  if (v == null) return undefined;
  if (typeof v === "number") return v;
  if (typeof v === "object" && v !== null && "toNumber" in v) {
    return (v as Integer).toNumber();
  }
  return Number(v);
}

function props(node: Node | null | undefined): Record<string, unknown> {
  return (node?.properties ?? {}) as Record<string, unknown>;
}

function caseFromNode(n: Node): CaseRow {
  const p = props(n);
  return {
    id: String(p.id),
    visual_id: String(p.visual_id),
    dataset: String(p.dataset),
    classification: String(p.classification),
    date_of_onset: (p.date_of_onset as string | null) ?? null,
    date_of_reporting: (p.date_of_reporting as string | null) ?? null,
    outcome: (p.outcome as string | null) ?? null,
    pathogen_identified: Boolean(p.pathogen_identified),
    virus_species: String(p.virus_species),
    identification_status: String(p.identification_status),
    in_outbreak_window: Boolean(p.in_outbreak_window),
    inclusion_reason: String(p.inclusion_reason),
    admin0_iso: String(p.admin0_iso),
    admin1_name: (p.admin1_name as string | undefined) ?? undefined,
    lat: num(p.lat),
    lon: num(p.lon),
    transmission_type: (p.transmission_type as string | undefined) ?? undefined,
    confidence: String(p.confidence),
    is_synthetic: Boolean(p.is_synthetic),
    source_ids: (p.source_ids as string[] | undefined) ?? undefined,
    notes: (p.notes as string | undefined) ?? undefined,
  };
}

function claimFromNode(n: Node): ClaimRow {
  const p = props(n);
  let object_value: Record<string, unknown> = {};
  if (typeof p.object_value_json === "string") {
    try {
      object_value = JSON.parse(p.object_value_json) as Record<string, unknown>;
    } catch {
      object_value = {};
    }
  }
  return {
    id: String(p.id),
    claim_type: String(p.claim_type),
    subject_ref: String(p.subject_ref),
    object_value,
    as_of_date: String(p.as_of_date),
    confidence: String(p.confidence),
    review_status: String(p.review_status),
    source_id: String(p.source_id),
    excerpt: (p.excerpt as string | undefined) ?? undefined,
  };
}

function sourceFromNode(n: Node): SourceRow {
  const p = props(n);
  return {
    id: String(p.id),
    url: String(p.url),
    title: (p.title as string | null) ?? null,
    publisher: (p.publisher as string | null) ?? null,
    kind: String(p.kind),
    published_at: (p.published_at as string | null) ?? null,
    curation_status: String(p.curation_status),
  };
}

export async function getOutbreakNeo4j() {
  return withSession(async (session) => {
    const res = await session.run(`MATCH (o:Outbreak) RETURN o LIMIT 1`);
    if (res.records.length === 0) return {};
    return props(res.records[0].get("o") as Node);
  });
}

export async function getCasesNeo4j(opts?: CaseQueryOpts): Promise<CaseRow[]> {
  return withSession(async (session) => {
    const res = await session.run(
      `
      MATCH (c:Case)
      WHERE c.dataset = 'production'
        AND ($country IS NULL OR c.admin0_iso = $country)
      RETURN c
      ORDER BY c.visual_id
      `,
      {
        country: opts?.country && opts.country !== "ALL" ? opts.country : null,
      },
    );
    let rows = res.records.map((r: Neo4jRecord) => caseFromNode(r.get("c")));
    if (opts?.confirmedOnly) {
      rows = rows.filter(
        (c) => c.classification === "confirmed" && c.virus_species === "BDBV",
      );
    } else if (opts?.includeTemporalSuspects === false) {
      rows = rows.filter((c) => c.inclusion_reason !== "temporal_suspect");
    }
    return rows;
  });
}

export async function getSourcesNeo4j(): Promise<SourceRow[]> {
  return withSession(async (session) => {
    const all = await session.run(
      `MATCH (s:SourceDocument) RETURN s ORDER BY coalesce(s.published_at, s.discovered_at)`,
    );
    return all.records
      .map((r) => sourceFromNode(r.get("s")))
      .filter((s) => s.curation_status !== "candidate");
  });
}

export async function getClaimsNeo4j(): Promise<ClaimRow[]> {
  return withSession(async (session) => {
    const res = await session.run(`MATCH (c:Claim) RETURN c`);
    return res.records.map((r) => claimFromNode(r.get("c")));
  });
}

export async function getConflictViewsNeo4j(): Promise<ConflictView[]> {
  return withSession(async (session) => {
    const res = await session.run(
      `
      MATCH (cf:ClaimConflict {status: 'open'})-[:SIDE_A]->(a:Claim),
            (cf)-[:SIDE_B]->(b:Claim)
      OPTIONAL MATCH (a)-[:FROM]->(sa:SourceDocument)
      OPTIONAL MATCH (b)-[:FROM]->(sb:SourceDocument)
      RETURN cf, a, b, sa, sb
      ORDER BY cf.detected_at
      `,
    );
    return res.records.map((r) => {
      const cf = props(r.get("cf") as Node);
      const claim_a = claimFromNode(r.get("a"));
      const claim_b = claimFromNode(r.get("b"));
      const sa = r.get("sa") as Node | null;
      const sb = r.get("sb") as Node | null;
      return {
        conflict: {
          id: String(cf.id),
          claim_a_id: String(cf.claim_a_id ?? claim_a.id),
          claim_b_id: String(cf.claim_b_id ?? claim_b.id),
          subject_ref: String(cf.subject_ref),
          claim_type: String(cf.claim_type),
          status: String(cf.status),
          detected_at: String(cf.detected_at),
        },
        claim_a,
        claim_b,
        source_a: sa ? sourceFromNode(sa) : undefined,
        source_b: sb ? sourceFromNode(sb) : undefined,
      };
    });
  });
}

export async function getContactsNeo4j(country?: string): Promise<ContactRow[]> {
  return withSession(async (session) => {
    const res = await session.run(
      `
      MATCH (p:Person)-[e:EXPOSED_TO]->(c:Case)
      MATCH (p)-[:HAS_FOLLOWUP_WINDOW]->(f:FollowUpWindow)
      WHERE p.role = 'contact'
        AND p.dataset = 'production'
        AND ($country IS NULL OR p.admin0_iso = $country)
      RETURN p, e, c, f
      ORDER BY p.visual_id
      `,
      { country: country && country !== "ALL" ? country : null },
    );
    return res.records.map((r) => {
      const p = props(r.get("p") as Node);
      const e = r.get("e").properties as Record<string, unknown>;
      const c = props(r.get("c") as Node);
      const f = props(r.get("f") as Node);
      return {
        id: String(p.id),
        visual_id: String(p.visual_id),
        dataset: String(p.dataset),
        role: String(p.role),
        admin0_iso: String(p.admin0_iso),
        risk_level: (p.risk_level as string | undefined) ?? undefined,
        is_healthcare_worker:
          (p.is_healthcare_worker as boolean | undefined) ?? undefined,
        exposure: {
          to_case_visual_id: String(c.visual_id),
          date_of_last_contact: String(e.date_of_last_contact),
          exposure_setting: String(e.exposure_setting),
          intensity: String(e.intensity),
          certainty: String(e.certainty),
          relationship: (e.relationship as string | undefined) ?? undefined,
        },
        followup: {
          window_start: String(f.window_start),
          window_end: String(f.window_end),
          incubation_max_days: num(f.incubation_max_days) ?? 21,
          status: String(f.status),
        },
      };
    });
  });
}

export async function getMeasuresNeo4j(country?: string): Promise<MeasureRow[]> {
  return withSession(async (session) => {
    const res = await session.run(
      `
      MATCH (b:BorderMeasure)
      WHERE $country IS NULL OR $country IN b.applies_to_countries
      RETURN b
      ORDER BY b.as_of_date DESC
      `,
      { country: country && country !== "ALL" ? country : null },
    );
    return res.records.map((r) => {
      const p = props(r.get("b") as Node);
      return {
        id: String(p.id),
        title: String(p.title),
        measure_type: String(p.measure_type),
        status: String(p.status),
        as_of_date: String(p.as_of_date),
        summary: (p.summary as string | undefined) ?? undefined,
        applies_to_countries: (p.applies_to_countries as string[]) ?? [],
        poe: (p.poe as string | undefined) ?? undefined,
        confidence: String(p.confidence),
      };
    });
  });
}

export async function getInboxCandidatesNeo4j(): Promise<InboxRow[]> {
  return withSession(async (session) => {
    const res = await session.run(
      `
      MATCH (s:SourceDocument {curation_status: 'candidate'})
      RETURN s
      ORDER BY s.discovered_at DESC
      `,
    );
    return res.records.map((r) => {
      const p = props(r.get("s") as Node);
      return {
        id: String(p.id),
        url: String(p.url),
        title: (p.title as string | undefined) ?? undefined,
        publisher: (p.publisher as string | undefined) ?? undefined,
        kind: String(p.kind),
        curation_status: String(p.curation_status),
        discovered_at: (p.discovered_at as string | undefined) ?? undefined,
      };
    });
  });
}

export async function overviewKpisNeo4j(country?: string) {
  // One session — avoids 3× pool acquisition on Aura Free / Workers.
  return withSession(async (session) => {
    const countryParam =
      country && country !== "ALL" ? country : null;
    const casesRes = await session.run(
      `
      MATCH (c:Case)
      WHERE c.dataset = 'production'
        AND ($country IS NULL OR c.admin0_iso = $country)
      RETURN c.classification AS classification,
             c.outcome AS outcome,
             c.inclusion_reason AS inclusion_reason
      `,
      { country: countryParam },
    );
    let confirmed = 0;
    let deaths = 0;
    let temporal = 0;
    for (const r of casesRes.records) {
      if (r.get("classification") === "confirmed") confirmed += 1;
      if (r.get("outcome") === "deceased") deaths += 1;
      if (r.get("inclusion_reason") === "temporal_suspect") temporal += 1;
    }

    const contactsRes = await session.run(
      `
      MATCH (p:Person)-[:HAS_FOLLOWUP_WINDOW]->(f:FollowUpWindow)
      WHERE p.role = 'contact'
        AND p.dataset = 'production'
        AND ($country IS NULL OR p.admin0_iso = $country)
        AND f.status = 'active'
      RETURN count(p) AS n
      `,
      { country: countryParam },
    );
    const followupRaw = contactsRes.records[0]?.get("n");
    const followup =
      typeof followupRaw?.toNumber === "function"
        ? followupRaw.toNumber()
        : Number(followupRaw ?? 0);

    const outbreakRes = await session.run(
      `MATCH (o:Outbreak) RETURN o.declared_at AS declared_at LIMIT 1`,
    );
    const declared = outbreakRes.records[0]?.get("declared_at");
    const asOf =
      typeof declared === "string" && declared.length >= 10
        ? declared.slice(0, 10)
        : "2026-10-23";

    return { confirmed, deaths, temporal, followup, asOf };
  });
}
