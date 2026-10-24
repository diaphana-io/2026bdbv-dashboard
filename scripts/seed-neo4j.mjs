#!/usr/bin/env node
/**
 * Apply constraints + seed data/curated into Neo4j (Aura or local).
 * Env: NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD (or apps/web/.env).
 *
 * Usage: npm run seed:neo4j
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import neo4j from "neo4j-driver";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const curatedDir = join(root, "data", "curated");
const constraintsPath = join(root, "infra", "neo4j", "constraints.cypher");

function loadDotEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i < 0) continue;
    const key = trimmed.slice(0, i).trim();
    let val = trimmed.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] == null) process.env[key] = val;
  }
}

loadDotEnv(join(root, "apps", "web", ".env"));
loadDotEnv(join(root, ".env"));

const uri = process.env.NEO4J_URI?.trim();
const user = process.env.NEO4J_USER?.trim() || "neo4j";
const password = process.env.NEO4J_PASSWORD;
const database =
  process.env.NEO4J_DATABASE?.trim() || user || "neo4j";
if (!uri || !password) {
  console.error(
    "Missing NEO4J_URI / NEO4J_PASSWORD. Set env or apps/web/.env (see docs/neo4j-aura.md).",
  );
  process.exit(1);
}

function readJson(name) {
  return JSON.parse(readFileSync(join(curatedDir, name), "utf8"));
}

async function runStatements(session, cypherText) {
  const parts = cypherText
    .split(";")
    .map((s) =>
      s
        .split("\n")
        .filter((line) => !line.trim().startsWith("//"))
        .join("\n")
        .trim(),
    )
    .filter(Boolean);
  for (const stmt of parts) {
    await session.run(stmt);
  }
}

async function main() {
  const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  const session = driver.session({ database });
  try {
    await driver.verifyConnectivity();
    console.log(
      "Connected:",
      uri.replace(/:[^:@/]+@/, ":****@"),
      `database=${database}`,
    );

    console.log("Applying constraints…");
    await runStatements(session, readFileSync(constraintsPath, "utf8"));

    const outbreak = readJson("outbreak.json");
    const sources = readJson("sources.json");
    const cases = readJson("cases.json");
    const claims = readJson("claims.json");
    const conflicts = readJson("conflicts.json");
    const contacts = readJson("contacts.json");
    const measures = readJson("measures.json");
    const inbox = readJson("inbox_candidates.json");
    const adminUnits = readJson("admin_units.json");
    const travelLegs = readJson("travel_legs.json");
    const hospitalizations = readJson("hospitalizations.json");

    await session.run(
      `
      MERGE (o:Outbreak {id: $id})
      SET o.name = $name,
          o.disease_code = $disease_code,
          o.pathogen = $pathogen,
          o.status = $status,
          o.declared_at = $declared_at,
          o.ended_at = $ended_at,
          o.incubation_min_days = $incubation_min_days,
          o.incubation_max_days = $incubation_max_days,
          o.followup_duration_days = $followup_duration_days,
          o.followup_starts_on_last_contact = $followup_starts_on_last_contact,
          o.case_definition_version = $case_definition_version,
          o.countries = $countries
      `,
      {
        ...outbreak,
        ended_at: outbreak.ended_at ?? null,
        countries: outbreak.countries ?? [],
      },
    );

    for (const a of adminUnits) {
      await session.run(
        `
        MERGE (u:AdminUnit {id: $id})
        SET u.iso = $iso,
            u.level = $level,
            u.name = $name,
            u.tracking_mode = $tracking_mode,
            u.lat = $lat,
            u.lon = $lon
        WITH u
        MATCH (o:Outbreak {id: $outbreak_id})
        MERGE (o)-[:INCLUDES_ADMIN]->(u)
        `,
        {
          id: a.id,
          iso: a.iso,
          level: a.level,
          name: a.name,
          tracking_mode: a.tracking_mode ?? null,
          lat: a.lat ?? null,
          lon: a.lon ?? null,
          outbreak_id: outbreak.id,
        },
      );
    }

    for (const s of sources) {
      await session.run(
        `
        MERGE (d:SourceDocument {id: $id})
        SET d.url = $url,
            d.normalized_url = $normalized_url,
            d.title = $title,
            d.publisher = $publisher,
            d.kind = $kind,
            d.published_at = $published_at,
            d.curation_status = $curation_status,
            d.content_hash = $content_hash
        `,
        {
          id: s.id,
          url: s.url,
          normalized_url: s.normalized_url,
          title: s.title ?? null,
          publisher: s.publisher ?? null,
          kind: s.kind,
          published_at: s.published_at ?? null,
          curation_status: s.curation_status,
          content_hash: s.content_hash ?? null,
        },
      );
    }

    for (const c of cases) {
      await session.run(
        `
        MERGE (p:Person {id: $person_id})
        ON CREATE SET p.visual_id = $person_visual_id
        SET p.dataset = $dataset,
            p.admin0_iso = $admin0_iso,
            p.role = coalesce(p.role, 'case')
        WITH p
        MERGE (c:Case {id: $id})
        SET c.visual_id = $visual_id,
            c.dataset = $dataset,
            c.classification = $classification,
            c.classification_date = $classification_date,
            c.date_of_onset = $date_of_onset,
            c.date_of_reporting = $date_of_reporting,
            c.date_of_isolation = $date_of_isolation,
            c.date_of_outcome = $date_of_outcome,
            c.outcome = $outcome,
            c.pathogen_identified = $pathogen_identified,
            c.virus_species = $virus_species,
            c.identification_status = $identification_status,
            c.in_outbreak_window = $in_outbreak_window,
            c.inclusion_reason = $inclusion_reason,
            c.admin0_iso = $admin0_iso,
            c.admin1_name = $admin1_name,
            c.lat = $lat,
            c.lon = $lon,
            c.transmission_type = $transmission_type,
            c.generation = $generation,
            c.confidence = $confidence,
            c.is_synthetic = $is_synthetic,
            c.source_ids = $source_ids,
            c.notes = $notes
        MERGE (p)-[:HAS_CASE]->(c)
        WITH c
        MATCH (o:Outbreak {id: $outbreak_id})
        MERGE (c)-[:IN_OUTBREAK]->(o)
        `,
        {
          id: c.id,
          person_id: c.person_id,
          person_visual_id: c.visual_id,
          visual_id: c.visual_id,
          dataset: c.dataset,
          classification: c.classification,
          classification_date: c.classification_date ?? null,
          date_of_onset: c.date_of_onset ?? null,
          date_of_reporting: c.date_of_reporting ?? null,
          date_of_isolation: c.date_of_isolation ?? null,
          date_of_outcome: c.date_of_outcome ?? null,
          outcome: c.outcome ?? null,
          pathogen_identified: Boolean(c.pathogen_identified),
          virus_species: c.virus_species,
          identification_status: c.identification_status,
          in_outbreak_window: Boolean(c.in_outbreak_window),
          inclusion_reason: c.inclusion_reason,
          admin0_iso: c.admin0_iso,
          admin1_name: c.admin1_name ?? null,
          lat: c.lat ?? null,
          lon: c.lon ?? null,
          transmission_type: c.transmission_type ?? null,
          generation: c.generation ?? null,
          confidence: c.confidence,
          is_synthetic: Boolean(c.is_synthetic),
          source_ids: c.source_ids ?? [],
          notes: c.notes ?? null,
          outbreak_id: outbreak.id,
        },
      );
    }

    for (const claim of claims) {
      await session.run(
        `
        MERGE (cl:Claim {id: $id})
        SET cl.claim_type = $claim_type,
            cl.subject_ref = $subject_ref,
            cl.object_value_json = $object_value_json,
            cl.as_of_date = $as_of_date,
            cl.claim_fingerprint = $claim_fingerprint,
            cl.confidence = $confidence,
            cl.extractor = $extractor,
            cl.review_status = $review_status,
            cl.reviewed_at = $reviewed_at,
            cl.reviewed_by = $reviewed_by,
            cl.excerpt = $excerpt,
            cl.source_id = $source_id
        WITH cl
        MATCH (s:SourceDocument {id: $source_id})
        MERGE (cl)-[:FROM]->(s)
        `,
        {
          id: claim.id,
          claim_type: claim.claim_type,
          subject_ref: claim.subject_ref,
          object_value_json: JSON.stringify(claim.object_value ?? {}),
          as_of_date: claim.as_of_date,
          claim_fingerprint: claim.claim_fingerprint,
          confidence: claim.confidence,
          extractor: claim.extractor ?? null,
          review_status: claim.review_status,
          reviewed_at: claim.reviewed_at ?? null,
          reviewed_by: claim.reviewed_by ?? null,
          excerpt: claim.excerpt ?? null,
          source_id: claim.source_id,
        },
      );
    }

    for (const conflict of conflicts) {
      await session.run(
        `
        MERGE (cf:ClaimConflict {id: $id})
        SET cf.subject_ref = $subject_ref,
            cf.claim_type = $claim_type,
            cf.status = $status,
            cf.detected_at = $detected_at,
            cf.resolution_note = $resolution_note,
            cf.claim_a_id = $claim_a_id,
            cf.claim_b_id = $claim_b_id
        WITH cf
        MATCH (a:Claim {id: $claim_a_id}), (b:Claim {id: $claim_b_id})
        MERGE (cf)-[:SIDE_A]->(a)
        MERGE (cf)-[:SIDE_B]->(b)
        MERGE (a)-[:CONFLICTS_WITH]->(b)
        MERGE (b)-[:CONFLICTS_WITH]->(a)
        `,
        {
          id: conflict.id,
          subject_ref: conflict.subject_ref,
          claim_type: conflict.claim_type,
          status: conflict.status,
          detected_at: conflict.detected_at,
          resolution_note: conflict.resolution_note ?? null,
          claim_a_id: conflict.claim_a_id,
          claim_b_id: conflict.claim_b_id,
        },
      );
    }

    for (const contact of contacts) {
      await session.run(
        `
        MERGE (p:Person {id: $id})
        SET p.visual_id = $visual_id,
            p.dataset = $dataset,
            p.role = $role,
            p.admin0_iso = $admin0_iso,
            p.risk_level = $risk_level,
            p.was_quarantined = $was_quarantined,
            p.is_healthcare_worker = $is_healthcare_worker,
            p.is_synthetic = $is_synthetic
        WITH p
        MATCH (c:Case {visual_id: $to_case_visual_id})
        MERGE (p)-[e:EXPOSED_TO]->(c)
        SET e.id = $exposure_id,
            e.date_of_last_contact = $date_of_last_contact,
            e.exposure_setting = $exposure_setting,
            e.intensity = $intensity,
            e.certainty = $certainty,
            e.relationship = $relationship
        WITH p
        MERGE (f:FollowUpWindow {id: $followup_id})
        SET f.window_start = $window_start,
            f.window_end = $window_end,
            f.incubation_max_days = $incubation_max_days,
            f.status = $followup_status
        MERGE (p)-[:HAS_FOLLOWUP_WINDOW]->(f)
        `,
        {
          id: contact.id,
          visual_id: contact.visual_id,
          dataset: contact.dataset,
          role: contact.role,
          admin0_iso: contact.admin0_iso,
          risk_level: contact.risk_level ?? null,
          was_quarantined: contact.was_quarantined ?? null,
          is_healthcare_worker: contact.is_healthcare_worker ?? null,
          is_synthetic: Boolean(contact.is_synthetic),
          to_case_visual_id: contact.exposure.to_case_visual_id,
          exposure_id: contact.exposure.id,
          date_of_last_contact: contact.exposure.date_of_last_contact,
          exposure_setting: contact.exposure.exposure_setting,
          intensity: contact.exposure.intensity,
          certainty: contact.exposure.certainty,
          relationship: contact.exposure.relationship ?? null,
          followup_id: contact.followup.id,
          window_start: contact.followup.window_start,
          window_end: contact.followup.window_end,
          incubation_max_days: contact.followup.incubation_max_days,
          followup_status: contact.followup.status,
        },
      );
    }

    for (const m of measures) {
      await session.run(
        `
        MERGE (b:BorderMeasure {id: $id})
        SET b.title = $title,
            b.measure_type = $measure_type,
            b.status = $status,
            b.effective_from = $effective_from,
            b.effective_to = $effective_to,
            b.as_of_date = $as_of_date,
            b.summary = $summary,
            b.audience = $audience,
            b.applies_to_countries = $applies_to_countries,
            b.poe = $poe,
            b.confidence = $confidence,
            b.source_ids = $source_ids
        `,
        {
          id: m.id,
          title: m.title,
          measure_type: m.measure_type,
          status: m.status,
          effective_from: m.effective_from ?? null,
          effective_to: m.effective_to ?? null,
          as_of_date: m.as_of_date,
          summary: m.summary ?? null,
          audience: m.audience ?? null,
          applies_to_countries: m.applies_to_countries ?? [],
          poe: m.poe ?? null,
          confidence: m.confidence,
          source_ids: m.source_ids ?? [],
        },
      );
    }

    for (const item of inbox) {
      await session.run(
        `
        MERGE (d:SourceDocument {id: $id})
        SET d.url = $url,
            d.normalized_url = $normalized_url,
            d.title = $title,
            d.publisher = $publisher,
            d.kind = $kind,
            d.curation_status = $curation_status,
            d.discovered_at = $discovered_at,
            d.discovery_query = $discovery_query
        `,
        {
          id: item.id,
          url: item.url,
          normalized_url: item.normalized_url,
          title: item.title ?? null,
          publisher: item.publisher ?? null,
          kind: item.kind,
          curation_status: item.curation_status,
          discovered_at: item.discovered_at ?? null,
          discovery_query: item.discovery_query ?? null,
        },
      );
    }

    for (const leg of travelLegs) {
      await session.run(
        `
        MERGE (t:TravelLeg {id: $id})
        SET t.departed_at = $departed_at,
            t.arrived_at = $arrived_at,
            t.mode = $mode
        WITH t
        MATCH (p:Person {id: $person_id})
        MERGE (p)-[:TRAVELED]->(t)
        WITH t
        OPTIONAL MATCH (fromAdmin:AdminUnit {id: $from_admin_id})
        FOREACH (_ IN CASE WHEN fromAdmin IS NULL THEN [] ELSE [1] END |
          MERGE (t)-[:FROM]->(fromAdmin)
        )
        WITH t
        OPTIONAL MATCH (toAdmin:AdminUnit {id: $to_admin_id})
        FOREACH (_ IN CASE WHEN toAdmin IS NULL THEN [] ELSE [1] END |
          MERGE (t)-[:TO]->(toAdmin)
        )
        `,
        {
          id: leg.id,
          person_id: leg.person_id,
          departed_at: leg.departed_at ?? null,
          arrived_at: leg.arrived_at ?? null,
          mode: leg.mode ?? "unknown",
          from_admin_id: leg.from_admin_id ?? null,
          to_admin_id: leg.to_admin_id ?? null,
        },
      );
    }

    for (const h of hospitalizations) {
      await session.run(
        `
        MERGE (hosp:Hospitalization {id: $id})
        SET hosp.admitted_at = $admitted_at,
            hosp.discharged_at = $discharged_at,
            hosp.facility_name = $facility_name
        WITH hosp
        MATCH (c:Case {id: $case_id})
        MERGE (c)-[:HAS_HOSPITALIZATION]->(hosp)
        `,
        {
          id: h.id,
          case_id: h.case_id,
          admitted_at: h.admitted_at ?? null,
          discharged_at: h.discharged_at ?? null,
          facility_name: h.facility_name ?? null,
        },
      );
    }

    const counts = await session.run(`
      RETURN
        count { MATCH (o:Outbreak) RETURN o } AS outbreaks,
        count { MATCH (c:Case) RETURN c } AS cases,
        count { MATCH (cl:Claim) RETURN cl } AS claims,
        count { MATCH (cf:ClaimConflict) RETURN cf } AS conflicts,
        count { MATCH (p:Person) WHERE p.role = 'contact' RETURN p } AS contacts,
        count { MATCH (s:SourceDocument) RETURN s } AS sources,
        count { MATCH (b:BorderMeasure) RETURN b } AS measures,
        count { MATCH (a:AdminUnit) RETURN a } AS admin_units,
        count { MATCH (t:TravelLeg) RETURN t } AS travel_legs,
        count { MATCH (h:Hospitalization) RETURN h } AS hospitalizations
    `);
    const row = counts.records[0];
    console.log("Seed complete:", {
      outbreaks: row.get("outbreaks").toNumber?.() ?? row.get("outbreaks"),
      cases: row.get("cases").toNumber?.() ?? row.get("cases"),
      claims: row.get("claims").toNumber?.() ?? row.get("claims"),
      conflicts: row.get("conflicts").toNumber?.() ?? row.get("conflicts"),
      contacts: row.get("contacts").toNumber?.() ?? row.get("contacts"),
      sources: row.get("sources").toNumber?.() ?? row.get("sources"),
      measures: row.get("measures").toNumber?.() ?? row.get("measures"),
      admin_units: row.get("admin_units").toNumber?.() ?? row.get("admin_units"),
      travel_legs: row.get("travel_legs").toNumber?.() ?? row.get("travel_legs"),
      hospitalizations:
        row.get("hospitalizations").toNumber?.() ?? row.get("hospitalizations"),
    });
  } finally {
    await session.close();
    await driver.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
