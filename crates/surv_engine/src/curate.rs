use super::{CmdResult, EngineError, Session};
use serde_json::{json, Map, Value};
use sha2::{Digest, Sha256};

pub fn normalize_url(url: &str) -> String {
    let mut u = url.trim().to_lowercase();
    if let Some((base, _)) = u.split_once('?') {
        // drop tracking query
        u = base.to_string();
    }
    if u.ends_with('/') && u.matches("://").count() == 1 {
        let without = u.trim_end_matches('/');
        if !(without.ends_with(":/") || without.is_empty()) {
            u = without.to_string();
        }
    }
    u
}

pub fn content_hash(body: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(body.as_bytes());
    hex::encode(hasher.finalize())
}

pub fn claim_fingerprint(
    claim_type: &str,
    subject_ref: &str,
    as_of_date: &str,
    object_value: &Value,
) -> String {
    let payload = format!("{claim_type}|{subject_ref}|{as_of_date}|{object_value}");
    content_hash(&payload)
}

fn existing_sources(params: &Value) -> Vec<Value> {
    if let Some(arr) = params.get("existing_sources").and_then(|v| v.as_array()) {
        return arr.clone();
    }
    let mut out = Vec::new();
    let urls = params
        .get("existing_normalized_urls")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();
    let hashes = params
        .get("existing_content_hashes")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();
    let ids = params
        .get("existing_source_ids")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();
    let n = urls.len().max(hashes.len()).max(ids.len());
    for i in 0..n {
        out.push(json!({
            "id": ids.get(i).cloned().unwrap_or(Value::Null),
            "normalized_url": urls.get(i).cloned().unwrap_or(Value::Null),
            "content_hash": hashes.get(i).cloned().unwrap_or(Value::Null),
        }));
    }
    out
}

/// Duplicate levels: `none` | `exact_url` | `content_hash` | `possible`.
/// Priority: exact_url > content_hash > possible.
pub fn check_duplicate(_s: &mut Session, params: &Value) -> CmdResult {
    let url = params.get("url").and_then(|v| v.as_str()).unwrap_or("");
    let normalized = normalize_url(url);
    let hash = params.get("content_hash").and_then(|v| v.as_str());
    let sources = existing_sources(params);

    let mut exact_id: Option<Value> = None;
    let mut hash_id: Option<Value> = None;
    let mut possible_id: Option<Value> = None;

    for src in &sources {
        let src_url = src
            .get("normalized_url")
            .and_then(|v| v.as_str())
            .map(normalize_url);
        let src_hash = src.get("content_hash").and_then(|v| v.as_str());
        let src_id = src.get("id").cloned().unwrap_or(Value::Null);
        let soft = src
            .get("possible")
            .and_then(|v| v.as_bool())
            .unwrap_or(false);

        if exact_id.is_none() && src_url.as_deref() == Some(normalized.as_str()) {
            exact_id = Some(src_id.clone());
        }
        if hash_id.is_none() && hash.is_some() && src_hash.is_some() && hash == src_hash {
            hash_id = Some(src_id.clone());
        }
        if possible_id.is_none() && soft {
            possible_id = Some(src_id);
        }
    }

    // Explicit soft matches from caller (classify/match follow-up).
    if possible_id.is_none() {
        if let Some(id) = params.get("possible_of_source_id").filter(|v| !v.is_null()) {
            possible_id = Some(id.clone());
        }
    }

    let (duplicate_level, duplicate_of_source_id) = if let Some(id) = exact_id {
        ("exact_url", id)
    } else if let Some(id) = hash_id {
        ("content_hash", id)
    } else if let Some(id) = possible_id {
        ("possible", id)
    } else {
        ("none", Value::Null)
    };

    let is_dup = duplicate_level != "none";
    Ok(json!({
        "normalized_url": normalized,
        "duplicate": is_dup,
        "duplicate_level": duplicate_level,
        "duplicate_of_source_id": duplicate_of_source_id,
        // Legacy alias (exact_url → "exact"); prefer duplicate_level.
        "level": match duplicate_level {
            "exact_url" => "exact",
            other => other,
        }
    }))
}

/// Stub: Jev-like classify not configured.
pub fn classify_source_stub(_s: &mut Session, _params: &Value) -> CmdResult {
    Ok(json!({
        "status": "not_configured",
        "classifier_status": "not_configured",
        "evidence_class": "other",
        "suggested_confidence": null,
        "message": "Classifier backend not configured"
    }))
}

/// Stub: Extract backend not configured (see GitHub Issue).
pub fn extract_claims_stub(_s: &mut Session, _params: &Value) -> CmdResult {
    Ok(json!({
        "status": "not_configured",
        "claims": [],
        "message": "Extract backend not configured"
    }))
}

pub fn discover_sources(_s: &mut Session, params: &Value) -> CmdResult {
    let candidates = params
        .get("candidates")
        .cloned()
        .unwrap_or_else(|| json!([]));
    let existing = params
        .get("existing_normalized_urls")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();
    let mut enqueued = Vec::new();
    let mut deduped = 0u64;
    if let Some(arr) = candidates.as_array() {
        for c in arr {
            let url = c.get("url").and_then(|u| u.as_str()).unwrap_or("");
            let n = normalize_url(url);
            if existing.iter().any(|v| v.as_str() == Some(n.as_str()))
                || enqueued.iter().any(|e: &Value| e["normalized_url"] == n)
            {
                deduped += 1;
                continue;
            }
            enqueued.push(json!({
                "url": url,
                "normalized_url": n,
                "title": c.get("title").cloned().unwrap_or(json!(null)),
                "curation_status": "candidate",
                "evidence_class": "other",
                "duplicate_level": "none"
            }));
        }
    }
    Ok(json!({
        "found": candidates.as_array().map(|a| a.len()).unwrap_or(0),
        "enqueued": enqueued,
        "deduped": deduped
    }))
}

pub fn approve_claim(_s: &mut Session, params: &Value) -> CmdResult {
    let status = params
        .get("review_status")
        .and_then(|v| v.as_str())
        .unwrap_or("pending_review");
    if status != "pending_review" {
        return Err(EngineError::Failed(
            "only pending_review claims can be approved".into(),
        ));
    }
    let duplicate = params
        .get("duplicate")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    if duplicate {
        return Err(EngineError::Failed(
            "exact duplicate cannot be approved".into(),
        ));
    }
    // Near/conflict: still approve, but surface both claims for human resolution later.
    let conflicts_with = params.get("conflicts_with_claim_id").cloned();
    Ok(json!({
        "review_status": "approved",
        "applied": true,
        "open_conflict": conflicts_with.is_some(),
        "conflicts_with_claim_id": conflicts_with,
        "display_policy": "show_both_until_resolved"
    }))
}

/// Detect value disagreement for same subject+type+near date; never drop either claim.
pub fn detect_conflict(_s: &mut Session, params: &Value) -> CmdResult {
    let a = params.get("claim_a").cloned().unwrap_or(json!({}));
    let b = params.get("claim_b").cloned().unwrap_or(json!({}));
    let same_subject = a.get("subject_ref") == b.get("subject_ref");
    let same_type = a.get("claim_type") == b.get("claim_type");
    let values_differ = a.get("object_value") != b.get("object_value");
    let conflict = same_subject && same_type && values_differ;
    Ok(json!({
        "conflict": conflict,
        "status": if conflict { "open" } else { "none" },
        "display": if conflict { "show_both" } else { "single" },
        "resolution_required": conflict
    }))
}

pub fn reject_claim(_s: &mut Session, params: &Value) -> CmdResult {
    let reason = params
        .get("rejection_reason")
        .and_then(|v| v.as_str())
        .unwrap_or("rejected");
    Ok(json!({
        "review_status": "rejected",
        "rejection_reason": reason
    }))
}

pub fn resolve_conflict(_s: &mut Session, params: &Value) -> CmdResult {
    let resolution = params.get("status").and_then(|v| v.as_str()).unwrap_or("");
    match resolution {
        "resolved_a" | "resolved_b" | "resolved_neither" => Ok(json!({
            "status": resolution,
            "resolved": true
        })),
        _ => Err(EngineError::Failed(
            "status must be resolved_a|resolved_b|resolved_neither".into(),
        )),
    }
}

fn claim_version(claim: &Value) -> u64 {
    claim.get("version").and_then(|v| v.as_u64()).unwrap_or(1)
}

fn lineage_id_of(claim: &Value) -> Value {
    claim
        .get("lineage_id")
        .cloned()
        .unwrap_or_else(|| claim.get("id").cloned().unwrap_or(Value::Null))
}

fn merge_claim_fields(base: &Value, overlay: &Value) -> Value {
    let mut map = match base.as_object() {
        Some(o) => o.clone(),
        None => Map::new(),
    };
    if let Some(o) = overlay.as_object() {
        for (k, v) in o {
            map.insert(k.clone(), v.clone());
        }
    }
    Value::Object(map)
}

/// Append a new pending revision for a lineage. Old head stays approved until approve_revision.
pub fn revise_claim(_s: &mut Session, params: &Value) -> CmdResult {
    let head = params.get("claim").cloned().unwrap_or(json!({}));
    if head.as_object().is_none() {
        return Err(EngineError::Failed("claim object required".into()));
    }
    let from_version = claim_version(&head);
    let to_version = from_version.saturating_add(1);
    let lineage_id = lineage_id_of(&head);
    let patch = params.get("revision").cloned().unwrap_or(json!({}));
    let new_id = params.get("new_claim_id").cloned().unwrap_or(Value::Null);

    let mut claim = merge_claim_fields(&head, &patch);
    if let Some(obj) = claim.as_object_mut() {
        obj.insert("id".into(), new_id);
        obj.insert("lineage_id".into(), lineage_id.clone());
        obj.insert("version".into(), json!(to_version));
        obj.insert("review_status".into(), json!("pending_review"));
        obj.insert("is_head".into(), json!(false));
        obj.insert("needs_revision".into(), json!(false));
        // Clear review metadata on the new pending version.
        obj.insert("reviewed_at".into(), Value::Null);
        obj.insert("reviewed_by".into(), Value::Null);
        obj.insert("rejection_reason".into(), Value::Null);
    }

    let actor = params.get("actor").cloned().unwrap_or(json!("unknown"));
    let reason = params.get("reason").cloned().unwrap_or(Value::Null);
    let audit = json!({
        "action": "revise",
        "actor": actor,
        "lineage_id": lineage_id,
        "claim_id": claim.get("id").cloned().unwrap_or(Value::Null),
        "from_version": from_version,
        "to_version": to_version,
        "reason": reason,
        "payload_digest": params.get("payload_digest").cloned().unwrap_or(Value::Null)
    });

    Ok(json!({
        "applied": true,
        "claim": claim,
        "prior_head_unchanged": true,
        "audit": audit
    }))
}

/// Rollback by copying a past version's payload into a new pending version (history preserved).
pub fn rollback_claim(_s: &mut Session, params: &Value) -> CmdResult {
    let reason = params
        .get("reason")
        .and_then(|v| v.as_str())
        .map(str::trim)
        .filter(|s| !s.is_empty());
    let Some(reason) = reason else {
        return Err(EngineError::Failed("reason required for rollback".into()));
    };

    let head = params.get("claim").cloned().unwrap_or(json!({}));
    let target = params
        .get("target_claim")
        .cloned()
        .unwrap_or_else(|| head.clone());
    if target.as_object().is_none() {
        return Err(EngineError::Failed(
            "target_claim (or claim) object required".into(),
        ));
    }

    let from_version = claim_version(&head);
    let restored_from = claim_version(&target);
    let to_version = from_version.saturating_add(1);
    let lineage_id = lineage_id_of(&head);
    if lineage_id_of(&target) != lineage_id && !lineage_id.is_null() {
        return Err(EngineError::Failed(
            "target_claim must share lineage_id".into(),
        ));
    }

    let new_id = params.get("new_claim_id").cloned().unwrap_or(Value::Null);

    let mut claim = target.clone();
    if let Some(obj) = claim.as_object_mut() {
        obj.insert("id".into(), new_id);
        obj.insert("lineage_id".into(), lineage_id.clone());
        obj.insert("version".into(), json!(to_version));
        obj.insert("review_status".into(), json!("pending_review"));
        obj.insert("is_head".into(), json!(false));
        obj.insert("needs_revision".into(), json!(false));
        obj.insert("reviewed_at".into(), Value::Null);
        obj.insert("reviewed_by".into(), Value::Null);
        obj.insert("rejection_reason".into(), Value::Null);
    }

    let actor = params.get("actor").cloned().unwrap_or(json!("unknown"));
    let audit = json!({
        "action": "rollback",
        "actor": actor,
        "lineage_id": lineage_id,
        "claim_id": claim.get("id").cloned().unwrap_or(Value::Null),
        "from_version": from_version,
        "to_version": to_version,
        "restored_from_version": restored_from,
        "reason": reason,
        "payload_digest": params.get("payload_digest").cloned().unwrap_or(Value::Null)
    });

    Ok(json!({
        "applied": true,
        "claim": claim,
        "prior_head_unchanged": true,
        "audit": audit
    }))
}

/// Pure JSON audit-append stub (persist is Web/Neo4j adapter responsibility).
pub fn append_audit(_s: &mut Session, params: &Value) -> CmdResult {
    let action = params.get("action").and_then(|v| v.as_str()).unwrap_or("");
    if action.is_empty() {
        return Err(EngineError::Failed("action required".into()));
    }
    let actor = params.get("actor").and_then(|v| v.as_str()).unwrap_or("");
    if actor.is_empty() {
        return Err(EngineError::Failed("actor required".into()));
    }
    let at = params.get("at").cloned().unwrap_or(Value::Null);
    let event = json!({
        "id": params.get("id").cloned().unwrap_or(Value::Null),
        "at": at,
        "actor": actor,
        "action": action,
        "lineage_id": params.get("lineage_id").cloned().unwrap_or(Value::Null),
        "claim_id": params.get("claim_id").cloned().unwrap_or(Value::Null),
        "source_id": params.get("source_id").cloned().unwrap_or(Value::Null),
        "from_version": params.get("from_version").cloned().unwrap_or(Value::Null),
        "to_version": params.get("to_version").cloned().unwrap_or(Value::Null),
        "reason": params.get("reason").cloned().unwrap_or(Value::Null),
        "payload_digest": params.get("payload_digest").cloned().unwrap_or(Value::Null)
    });
    Ok(json!({
        "appended": true,
        "event": event
    }))
}

#[cfg(test)]
mod curation_tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn duplicate_url_detected() {
        let mut s = Session::new("test");
        let r = check_duplicate(
            &mut s,
            &json!({
                "url": "https://Example.com/Path/?utm=1",
                "existing_normalized_urls": ["https://example.com/path"]
            }),
        )
        .unwrap();
        assert_eq!(r["duplicate"], true);
        assert_eq!(r["duplicate_level"], "exact_url");
    }

    #[test]
    fn duplicate_content_hash_level() {
        let mut s = Session::new("test");
        let r = check_duplicate(
            &mut s,
            &json!({
                "url": "https://example.com/new-path",
                "content_hash": "abc123",
                "existing_sources": [{
                    "id": "src-1",
                    "normalized_url": "https://example.com/old",
                    "content_hash": "abc123"
                }]
            }),
        )
        .unwrap();
        assert_eq!(r["duplicate_level"], "content_hash");
        assert_eq!(r["duplicate_of_source_id"], "src-1");
    }

    #[test]
    fn duplicate_possible_level() {
        let mut s = Session::new("test");
        let r = check_duplicate(
            &mut s,
            &json!({
                "url": "https://example.com/a",
                "existing_sources": [{
                    "id": "src-soft",
                    "normalized_url": "https://wire.example.com/a",
                    "possible": true
                }]
            }),
        )
        .unwrap();
        assert_eq!(r["duplicate_level"], "possible");
        assert_eq!(r["duplicate_of_source_id"], "src-soft");
    }

    #[test]
    fn classify_stub() {
        let mut s = Session::new("test");
        let r = classify_source_stub(&mut s, &json!({})).unwrap();
        assert_eq!(r["status"], "not_configured");
        assert_eq!(r["evidence_class"], "other");
    }

    #[test]
    fn extract_stub() {
        let mut s = Session::new("test");
        let r = extract_claims_stub(&mut s, &json!({})).unwrap();
        assert_eq!(r["status"], "not_configured");
    }

    #[test]
    fn approve_rejects_duplicate() {
        let mut s = Session::new("test");
        let err = approve_claim(
            &mut s,
            &json!({ "review_status": "pending_review", "duplicate": true }),
        );
        assert!(err.is_err());
    }

    #[test]
    fn conflict_keeps_both() {
        let mut s = Session::new("test");
        let r = detect_conflict(
            &mut s,
            &json!({
                "claim_a": {
                    "subject_ref": "KE",
                    "claim_type": "case_count",
                    "object_value": { "confirmed": 9 }
                },
                "claim_b": {
                    "subject_ref": "KE",
                    "claim_type": "case_count",
                    "object_value": { "confirmed": 11 }
                }
            }),
        )
        .unwrap();
        assert_eq!(r["conflict"], true);
        assert_eq!(r["display"], "show_both");
        assert_eq!(r["resolution_required"], true);
    }

    #[test]
    fn resolve_conflict_accepts_known_status() {
        let mut s = Session::new("test");
        let r = resolve_conflict(&mut s, &json!({ "status": "resolved_a" })).unwrap();
        assert_eq!(r["resolved"], true);
        assert_eq!(r["status"], "resolved_a");
        assert!(resolve_conflict(&mut s, &json!({ "status": "nope" })).is_err());
    }

    #[test]
    fn revise_claim_stub_pending() {
        let mut s = Session::new("test");
        let r = revise_claim(
            &mut s,
            &json!({
                "claim": {
                    "id": "c1",
                    "lineage_id": "L1",
                    "version": 1,
                    "claim_type": "case_count",
                    "subject_ref": "KE",
                    "object_value": { "confirmed": 9 },
                    "review_status": "approved",
                    "is_head": true
                },
                "revision": { "object_value": { "confirmed": 11 } },
                "new_claim_id": "c2",
                "actor": "curator@example.com",
                "reason": "official correction"
            }),
        )
        .unwrap();
        assert_eq!(r["applied"], true);
        assert_eq!(r["claim"]["version"], 2);
        assert_eq!(r["claim"]["review_status"], "pending_review");
        assert_eq!(r["claim"]["is_head"], false);
        assert_eq!(r["claim"]["object_value"]["confirmed"], 11);
        assert_eq!(r["audit"]["action"], "revise");
        assert_eq!(r["prior_head_unchanged"], true);
    }

    #[test]
    fn rollback_requires_reason() {
        let mut s = Session::new("test");
        let err = rollback_claim(
            &mut s,
            &json!({
                "claim": { "id": "c1", "lineage_id": "L1", "version": 2 },
                "target_claim": { "id": "c0", "lineage_id": "L1", "version": 1 }
            }),
        );
        assert!(err.is_err());
    }

    #[test]
    fn rollback_claim_stub() {
        let mut s = Session::new("test");
        let r = rollback_claim(
            &mut s,
            &json!({
                "claim": {
                    "id": "c2",
                    "lineage_id": "L1",
                    "version": 2,
                    "object_value": { "confirmed": 11 },
                    "review_status": "approved",
                    "is_head": true
                },
                "target_claim": {
                    "id": "c1",
                    "lineage_id": "L1",
                    "version": 1,
                    "object_value": { "confirmed": 9 },
                    "claim_type": "case_count"
                },
                "new_claim_id": "c3",
                "actor": "curator@example.com",
                "reason": "revert bad revision"
            }),
        )
        .unwrap();
        assert_eq!(r["claim"]["version"], 3);
        assert_eq!(r["claim"]["object_value"]["confirmed"], 9);
        assert_eq!(r["claim"]["review_status"], "pending_review");
        assert_eq!(r["audit"]["action"], "rollback");
        assert_eq!(r["audit"]["restored_from_version"], 1);
    }

    #[test]
    fn append_audit_stub() {
        let mut s = Session::new("test");
        let r = append_audit(
            &mut s,
            &json!({
                "id": "a1",
                "at": "2026-10-24T12:00:00.000Z",
                "actor": "curator@example.com",
                "action": "approve",
                "lineage_id": "L1",
                "claim_id": "c1",
                "from_version": 1,
                "to_version": 1
            }),
        )
        .unwrap();
        assert_eq!(r["appended"], true);
        assert_eq!(r["event"]["action"], "approve");
        assert!(append_audit(&mut s, &json!({ "actor": "x" })).is_err());
    }
}
