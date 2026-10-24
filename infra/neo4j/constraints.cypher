// Placeholder — full constraints added in schema commit.
CREATE CONSTRAINT person_id IF NOT EXISTS FOR (p:Person) REQUIRE p.id IS UNIQUE;
CREATE CONSTRAINT case_id IF NOT EXISTS FOR (c:Case) REQUIRE c.id IS UNIQUE;
CREATE CONSTRAINT source_normalized_url IF NOT EXISTS FOR (s:SourceDocument) REQUIRE s.normalized_url IS UNIQUE;
CREATE CONSTRAINT claim_id IF NOT EXISTS FOR (c:Claim) REQUIRE c.id IS UNIQUE;
CREATE CONSTRAINT outbreak_id IF NOT EXISTS FOR (o:Outbreak) REQUIRE o.id IS UNIQUE;
CREATE CONSTRAINT border_measure_id IF NOT EXISTS FOR (b:BorderMeasure) REQUIRE b.id IS UNIQUE;
CREATE INDEX case_classification IF NOT EXISTS FOR (c:Case) ON (c.classification);
CREATE INDEX case_admin0 IF NOT EXISTS FOR (c:Case) ON (c.admin0_iso);
CREATE INDEX claim_review_status IF NOT EXISTS FOR (c:Claim) ON (c.review_status);
CREATE INDEX source_curation_status IF NOT EXISTS FOR (s:SourceDocument) ON (s.curation_status);
CREATE INDEX dataset_label IF NOT EXISTS FOR (n:Case) ON (n.dataset);
