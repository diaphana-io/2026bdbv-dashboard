// Full Neo4j constraints/indexes for 2026 BDBV surveillance graph.

CREATE CONSTRAINT person_id IF NOT EXISTS FOR (p:Person) REQUIRE p.id IS UNIQUE;
CREATE CONSTRAINT person_visual_id IF NOT EXISTS FOR (p:Person) REQUIRE p.visual_id IS UNIQUE;
CREATE CONSTRAINT case_id IF NOT EXISTS FOR (c:Case) REQUIRE c.id IS UNIQUE;
CREATE CONSTRAINT outbreak_id IF NOT EXISTS FOR (o:Outbreak) REQUIRE o.id IS UNIQUE;
CREATE CONSTRAINT source_id IF NOT EXISTS FOR (s:SourceDocument) REQUIRE s.id IS UNIQUE;
CREATE CONSTRAINT source_normalized_url IF NOT EXISTS FOR (s:SourceDocument) REQUIRE s.normalized_url IS UNIQUE;
CREATE CONSTRAINT claim_id IF NOT EXISTS FOR (c:Claim) REQUIRE c.id IS UNIQUE;
CREATE CONSTRAINT claim_fingerprint_id IF NOT EXISTS FOR (c:Claim) REQUIRE c.claim_fingerprint IS UNIQUE;
CREATE CONSTRAINT ingest_batch_id IF NOT EXISTS FOR (b:IngestBatch) REQUIRE b.id IS UNIQUE;
CREATE CONSTRAINT followup_window_id IF NOT EXISTS FOR (f:FollowUpWindow) REQUIRE f.id IS UNIQUE;
CREATE CONSTRAINT followup_day_id IF NOT EXISTS FOR (d:FollowUpDay) REQUIRE d.id IS UNIQUE;
CREATE CONSTRAINT lab_result_id IF NOT EXISTS FOR (l:LabResult) REQUIRE l.id IS UNIQUE;
CREATE CONSTRAINT facility_id IF NOT EXISTS FOR (f:Facility) REQUIRE f.id IS UNIQUE;
CREATE CONSTRAINT poe_id IF NOT EXISTS FOR (p:PointOfEntry) REQUIRE p.id IS UNIQUE;
CREATE CONSTRAINT admin_id IF NOT EXISTS FOR (a:AdminUnit) REQUIRE a.id IS UNIQUE;
CREATE CONSTRAINT event_id IF NOT EXISTS FOR (e:Event) REQUIRE e.id IS UNIQUE;
CREATE CONSTRAINT cluster_id IF NOT EXISTS FOR (c:Cluster) REQUIRE c.id IS UNIQUE;
CREATE CONSTRAINT border_measure_id IF NOT EXISTS FOR (b:BorderMeasure) REQUIRE b.id IS UNIQUE;
CREATE CONSTRAINT discovery_run_id IF NOT EXISTS FOR (d:DiscoveryRun) REQUIRE d.id IS UNIQUE;
CREATE CONSTRAINT conflict_id IF NOT EXISTS FOR (c:ClaimConflict) REQUIRE c.id IS UNIQUE;
CREATE CONSTRAINT dismissed_normalized_url IF NOT EXISTS FOR (d:DismissedSource) REQUIRE d.normalized_url IS UNIQUE;

CREATE INDEX case_classification IF NOT EXISTS FOR (c:Case) ON (c.classification);
CREATE INDEX case_admin0 IF NOT EXISTS FOR (c:Case) ON (c.admin0_iso);
CREATE INDEX case_dataset IF NOT EXISTS FOR (c:Case) ON (c.dataset);
CREATE INDEX case_inclusion IF NOT EXISTS FOR (c:Case) ON (c.inclusion_reason);
CREATE INDEX claim_review_status IF NOT EXISTS FOR (c:Claim) ON (c.review_status);
CREATE INDEX source_curation_status IF NOT EXISTS FOR (s:SourceDocument) ON (s.curation_status);
CREATE INDEX followup_status IF NOT EXISTS FOR (f:FollowUpWindow) ON (f.status);
CREATE INDEX border_status IF NOT EXISTS FOR (b:BorderMeasure) ON (b.status);
CREATE INDEX conflict_status IF NOT EXISTS FOR (c:ClaimConflict) ON (c.status);
