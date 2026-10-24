import type { Integer, Node, Record as Neo4jRecord } from "neo4j-driver";
import type {
  CaseDetail,
  CaseDetailEvent,
  CaseQueryOpts,
  CaseRow,
  ClaimRow,
  ConflictView,
  ContactRow,
  InboxRow,
  MapAggregate,
  MapCase,
  MapExposure,
  MapSnapshot,
  MapTravel,
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

export async function getMapSnapshotNeo4j(asOf: string): Promise<MapSnapshot> {
  return withSession(async (session) => {
    const aggRes = await session.run(
      `
      MATCH (a:AdminUnit {tracking_mode: 'aggregate'})
      OPTIONAL MATCH (cl:Claim)
      WHERE cl.claim_type = 'case_count'
        AND cl.subject_ref = a.iso
        AND cl.review_status = 'approved'
        AND cl.as_of_date <= $asOf
      WITH a, cl
      ORDER BY cl.as_of_date DESC
      WITH a, collect(cl)[0] AS latest
      WHERE latest IS NOT NULL AND a.lat IS NOT NULL AND a.lon IS NOT NULL
      RETURN a, latest
      `,
      { asOf },
    );
    const aggregates: MapAggregate[] = aggRes.records.map((r) => {
      const a = props(r.get("a") as Node);
      const claim = claimFromNode(r.get("latest") as Node);
      return {
        admin_iso: String(a.iso),
        name: String(a.name),
        lat: num(a.lat)!,
        lon: num(a.lon)!,
        confirmed: Number(claim.object_value.confirmed ?? 0),
        deaths: Number(claim.object_value.deaths ?? 0),
        as_of_date: claim.as_of_date,
      };
    });

    const caseRes = await session.run(
      `
      MATCH (c:Case)
      WHERE c.dataset = 'production'
        AND c.lat IS NOT NULL AND c.lon IS NOT NULL
        AND coalesce(c.date_of_reporting, c.date_of_onset) <= $asOf
      RETURN c
      ORDER BY c.visual_id
      `,
      { asOf },
    );
    const mapCases: MapCase[] = caseRes.records.map((r) => {
      const c = caseFromNode(r.get("c") as Node);
      return {
        id: c.id,
        visual_id: c.visual_id,
        admin0_iso: c.admin0_iso,
        classification: c.classification,
        lat: c.lat!,
        lon: c.lon!,
        date_of_onset: c.date_of_onset ?? null,
        date_of_reporting: c.date_of_reporting ?? null,
      };
    });

    const travelRes = await session.run(
      `
      MATCH (p:Person)-[:TRAVELED]->(t:TravelLeg)
      OPTIONAL MATCH (t)-[:FROM]->(fromA:AdminUnit)
      OPTIONAL MATCH (t)-[:TO]->(toA:AdminUnit)
      OPTIONAL MATCH (p)-[:HAS_CASE]->(c:Case)
      WHERE coalesce(t.departed_at, t.arrived_at) <= $asOf
        AND fromA.lat IS NOT NULL AND toA.lat IS NOT NULL
      RETURN t, p, fromA, toA, c
      `,
      { asOf },
    );
    const travels: MapTravel[] = travelRes.records.map((r) => {
      const t = props(r.get("t") as Node);
      const p = props(r.get("p") as Node);
      const fromA = props(r.get("fromA") as Node);
      const toA = props(r.get("toA") as Node);
      const c = r.get("c") as Node | null;
      return {
        id: String(t.id),
        person_id: String(p.id),
        case_id: c ? String(props(c).id) : null,
        mode: String(t.mode ?? "unknown"),
        departed_at: (t.departed_at as string | null) ?? null,
        arrived_at: (t.arrived_at as string | null) ?? null,
        from: {
          admin_id: String(fromA.id),
          iso: String(fromA.iso),
          lat: num(fromA.lat)!,
          lon: num(fromA.lon)!,
        },
        to: {
          admin_id: String(toA.id),
          iso: String(toA.iso),
          lat: num(toA.lat)!,
          lon: num(toA.lon)!,
        },
      };
    });

    const expRes = await session.run(
      `
      MATCH (p:Person)-[e:EXPOSED_TO]->(c:Case)
      WHERE p.role = 'contact'
        AND p.dataset = 'production'
        AND e.date_of_last_contact <= $asOf
      RETURN p, e, c
      `,
      { asOf },
    );
    const exposures: MapExposure[] = expRes.records.map((r) => {
      const p = props(r.get("p") as Node);
      const e = r.get("e").properties as Record<string, unknown>;
      const c = caseFromNode(r.get("c") as Node);
      return {
        from_person_id: String(p.id),
        from_visual_id: String(p.visual_id),
        to_case_id: c.id,
        to_case_visual_id: c.visual_id,
        date_of_last_contact: String(e.date_of_last_contact),
        to_lat: c.lat,
        to_lon: c.lon,
      };
    });

    return { asOf, aggregates, cases: mapCases, travels, exposures };
  });
}

export async function getCaseDetailNeo4j(
  caseId: string,
): Promise<CaseDetail | null> {
  return withSession(async (session) => {
    const caseRes = await session.run(
      `MATCH (c:Case {id: $caseId}) RETURN c LIMIT 1`,
      { caseId },
    );
    if (caseRes.records.length === 0) return null;
    const cNode = caseRes.records[0].get("c") as Node;
    const c = caseFromNode(cNode);
    const events: CaseDetailEvent[] = [];
    if (c.date_of_onset) {
      events.push({
        kind: "onset",
        at: c.date_of_onset,
        label: "Symptom onset",
      });
    }
    if (c.date_of_reporting) {
      events.push({
        kind: "reporting",
        at: c.date_of_reporting,
        label: "Reported",
      });
    }

    const travelRes = await session.run(
      `
      MATCH (p:Person)-[:HAS_CASE]->(c:Case {id: $caseId})
      MATCH (p)-[:TRAVELED]->(t:TravelLeg)
      OPTIONAL MATCH (t)-[:FROM]->(fromA:AdminUnit)
      OPTIONAL MATCH (t)-[:TO]->(toA:AdminUnit)
      RETURN t, fromA, toA
      `,
      { caseId },
    );
    for (const r of travelRes.records) {
      const t = props(r.get("t") as Node);
      const fromA = r.get("fromA") as Node | null;
      const toA = r.get("toA") as Node | null;
      const at =
        (t.arrived_at as string | null) ?? (t.departed_at as string | null);
      if (!at) continue;
      events.push({
        kind: "travel",
        at,
        label: `Travel ${fromA ? props(fromA).iso : "?"} → ${toA ? props(toA).iso : "?"} (${t.mode})`,
        meta: {
          mode: t.mode,
          departed_at: t.departed_at,
          arrived_at: t.arrived_at,
        },
      });
    }

    const hospRes = await session.run(
      `
      MATCH (c:Case {id: $caseId})-[:HAS_HOSPITALIZATION]->(h:Hospitalization)
      RETURN h
      `,
      { caseId },
    );
    for (const r of hospRes.records) {
      const h = props(r.get("h") as Node);
      if (!h.admitted_at) continue;
      events.push({
        kind: "hospitalization",
        at: String(h.admitted_at),
        label: h.facility_name
          ? `Admitted · ${h.facility_name}`
          : "Admitted",
        meta: {
          discharged_at: h.discharged_at,
          facility_name: h.facility_name,
        },
      });
    }

    const expRes = await session.run(
      `
      MATCH (p:Person)-[e:EXPOSED_TO]->(c:Case {id: $caseId})
      RETURN p, e
      `,
      { caseId },
    );
    for (const r of expRes.records) {
      const p = props(r.get("p") as Node);
      const e = r.get("e").properties as Record<string, unknown>;
      events.push({
        kind: "exposure",
        at: String(e.date_of_last_contact),
        label: `Contact ${p.visual_id}`,
        meta: { contact_id: p.id, intensity: e.intensity },
      });
    }

    if (c.outcome && c.outcome !== "unknown") {
      const outcomeAt =
        (props(cNode).date_of_outcome as string | undefined) ??
        c.date_of_reporting ??
        c.date_of_onset;
      if (outcomeAt) {
        events.push({
          kind: "outcome",
          at: String(outcomeAt),
          label: `Outcome: ${c.outcome}`,
        });
      }
    }

    events.sort((a, b) => a.at.localeCompare(b.at));
    return {
      id: c.id,
      visual_id: c.visual_id,
      admin0_iso: c.admin0_iso,
      classification: c.classification,
      lat: c.lat,
      lon: c.lon,
      events,
    };
  });
}
