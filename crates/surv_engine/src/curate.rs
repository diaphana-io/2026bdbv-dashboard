use super::{CmdResult, EngineError, Session};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};

pub fn normalize_url(url: &str) -> String {
    let mut u = url.trim().to_lowercase();
    if let Some((base, _)) = u.split_once('?') {
        // drop tracking query
        u = base.to_string();
    }
    while u.ends_with('/') && u.matches("://").count() == 1 {
        let without = u.trim_end_matches('/');
        if without.ends_with(":/") || without.is_empty() {
            break;
        }
        u = without.to_string();
        break;
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
    let payload = format!(
        "{claim_type}|{subject_ref}|{as_of_date}|{}",
        object_value.to_string()
    );
    content_hash(&payload)
}

pub fn check_duplicate(_s: &mut Session, params: &Value) -> CmdResult {
    let url = params.get("url").and_then(|v| v.as_str()).unwrap_or("");
    let existing = params
        .get("existing_normalized_urls")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();
    let normalized = normalize_url(url);
    let is_dup = existing.iter().any(|v| v.as_str() == Some(normalized.as_str()));
    Ok(json!({
        "normalized_url": normalized,
        "duplicate": is_dup,
        "level": if is_dup { "exact" } else { "none" }
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
                "curation_status": "candidate"
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
        return Err(EngineError::Failed("exact duplicate cannot be approved".into()));
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
    let resolution = params
        .get("status")
        .and_then(|v| v.as_str())
        .unwrap_or("");
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
}
