//! Versioned curation pipeline registry + `sys.pipelineStatus`.
//!
//! Stage order / health decisions live here so Next only gathers open param bags
//! and renders `stages[]` / `llm[]` / `infra[]`. Count and adapter key names are
//! the contract for API bag fillers (see module-level keys below).

use super::{CmdResult, Session};
use serde_json::{json, Map, Value};

/// Bump when StageDef shape or v1 stage ids change in a breaking way.
pub const SPEC_VERSION: u32 = 1;

/// Count bag keys the Status API should fill (`params.counts`).
/// Unknown keys are ignored; missing keys yield `count: null`.
pub mod count_keys {
    pub const DISCOVER: &str = "discover";
    pub const INBOX: &str = "inbox";
    pub const PENDING_REVIEW: &str = "pending_review";
    pub const OPEN_CONFLICTS: &str = "open_conflicts";
}

/// Adapter bag keys (`params.adapters` / `params.llm_usage`).
pub mod adapter_keys {
    pub const CLASSIFY: &str = "classify";
    pub const EXTRACT: &str = "extract";
}

/// Gate keys (`params.gates` or top-level `extract_enabled` for v1).
pub mod gate_keys {
    pub const EXTRACT_ENABLED: &str = "extract_enabled";
}

/// Allowed stage / adapter / infra states.
const STATES: &[&str] = &["ok", "stub", "degraded", "not_configured"];

#[derive(Debug, Clone, Copy)]
pub struct StageDef {
    pub id: &'static str,
    pub label: &'static str,
    pub order: u32,
    /// Extensible: `"flow"` | `"adapter"` | `"gate"` | `"infra"`.
    pub kind: &'static str,
    pub count_key: Option<&'static str>,
    pub adapter_key: Option<&'static str>,
    pub href: Option<&'static str>,
    pub gate_key: Option<&'static str>,
}

/// Single source of truth for Status stage rows (v1).
pub static PIPELINE_SPEC: &[StageDef] = &[
    StageDef {
        id: "discover",
        label: "Discover",
        order: 1,
        kind: "flow",
        count_key: Some(count_keys::DISCOVER),
        adapter_key: None,
        href: None,
        gate_key: None,
    },
    StageDef {
        id: "inbox",
        label: "Inbox",
        order: 2,
        kind: "flow",
        count_key: Some(count_keys::INBOX),
        adapter_key: None,
        href: Some("/curate/inbox"),
        gate_key: None,
    },
    StageDef {
        id: "classify",
        label: "Classify",
        order: 3,
        kind: "adapter",
        count_key: None,
        adapter_key: Some(adapter_keys::CLASSIFY),
        href: None,
        gate_key: None,
    },
    StageDef {
        id: "extract",
        label: "Extract",
        order: 4,
        kind: "gate",
        count_key: None,
        adapter_key: Some(adapter_keys::EXTRACT),
        href: Some("/curate/extract"),
        gate_key: Some(gate_keys::EXTRACT_ENABLED),
    },
    StageDef {
        id: "review",
        label: "Review",
        order: 5,
        kind: "flow",
        count_key: Some(count_keys::PENDING_REVIEW),
        adapter_key: None,
        href: Some("/curate/review"),
        gate_key: None,
    },
    StageDef {
        id: "conflicts",
        label: "Conflicts",
        order: 6,
        kind: "flow",
        count_key: Some(count_keys::OPEN_CONFLICTS),
        adapter_key: None,
        href: Some("/curate/conflicts"),
        gate_key: None,
    },
];

/// Infra rows emitted when present under `params.infra` (order fixed for UI).
static INFRA_SPEC: &[(&str, &str)] = &[
    ("neo4j", "Neo4j"),
    ("r2", "R2"),
    ("d1", "D1"),
    ("discovery", "Discovery"),
];

fn normalize_state(raw: Option<&str>) -> &'static str {
    match raw {
        Some("ok") => "ok",
        Some("stub") => "stub",
        Some("degraded") => "degraded",
        Some("not_configured") => "not_configured",
        _ => "not_configured",
    }
}

fn bag_map<'a>(params: &'a Value, key: &str) -> Option<&'a Map<String, Value>> {
    params.get(key).and_then(|v| v.as_object())
}

fn lookup_count(counts: Option<&Map<String, Value>>, key: &str) -> Value {
    match counts.and_then(|m| m.get(key)) {
        Some(v) if v.is_number() => v.clone(),
        _ => Value::Null,
    }
}

fn lookup_adapter_state(adapters: Option<&Map<String, Value>>, key: &str) -> &'static str {
    let raw = adapters
        .and_then(|m| m.get(key))
        .and_then(|v| v.as_str());
    normalize_state(raw)
}

fn gate_enabled(params: &Value, gate_key: &str) -> Option<bool> {
    if let Some(v) = params
        .get("gates")
        .and_then(|g| g.get(gate_key))
        .and_then(|v| v.as_bool())
    {
        return Some(v);
    }
    // v1 convenience: top-level extract_enabled
    if gate_key == gate_keys::EXTRACT_ENABLED {
        return params.get("extract_enabled").and_then(|v| v.as_bool());
    }
    None
}

fn llm_usage_for(
    llm_usage: Option<&Map<String, Value>>,
    adapter_key: &str,
) -> (u64, u64, u64, Value) {
    let entry = llm_usage.and_then(|m| m.get(adapter_key));
    let calls = entry
        .and_then(|e| e.get("calls"))
        .and_then(|v| v.as_u64())
        .unwrap_or(0);
    let input_tokens = entry
        .and_then(|e| e.get("input_tokens"))
        .and_then(|v| v.as_u64())
        .unwrap_or(0);
    let output_tokens = entry
        .and_then(|e| e.get("output_tokens"))
        .and_then(|v| v.as_u64())
        .unwrap_or(0);
    let provider = entry
        .and_then(|e| e.get("provider"))
        .cloned()
        .unwrap_or(Value::Null);
    (calls, input_tokens, output_tokens, provider)
}

fn stage_status(def: &StageDef, params: &Value) -> Value {
    let counts = bag_map(params, "counts");
    let adapters = bag_map(params, "adapters");

    let count = def
        .count_key
        .map(|k| lookup_count(counts, k))
        .unwrap_or(Value::Null);

    let mut state = "ok";
    let mut note: Option<String> = None;

    if let Some(adapter_key) = def.adapter_key {
        state = lookup_adapter_state(adapters, adapter_key);
    }

    if let Some(gate_key) = def.gate_key {
        match gate_enabled(params, gate_key) {
            Some(false) => {
                state = "stub";
                note = Some("Gate closed".to_string());
            }
            Some(true) => {
                if state == "not_configured" || state == "stub" {
                    note = Some("Gate open; adapter not configured".to_string());
                } else {
                    note = Some("Gate open".to_string());
                }
            }
            None => {
                // Missing gate → treat as closed for safety on gate stages.
                state = "stub";
                note = Some("Gate not set".to_string());
            }
        }
    } else if def.adapter_key.is_some() && state == "not_configured" {
        note = Some("Adapter not configured".to_string());
    }

    // Flow stages without adapters are ok even when count is null.
    if def.adapter_key.is_none() && def.gate_key.is_none() {
        state = "ok";
    }

    if !STATES.contains(&state) {
        state = "not_configured";
    }

    let mut out = json!({
        "id": def.id,
        "label": def.label,
        "order": def.order,
        "kind": def.kind,
        "state": state,
        "count": count,
    });
    if let Some(href) = def.href {
        out["href"] = json!(href);
    }
    if let Some(n) = note {
        out["note"] = json!(n);
    }
    out
}

fn llm_rows(params: &Value) -> Vec<Value> {
    let adapters = bag_map(params, "adapters");
    let llm_usage = bag_map(params, "llm_usage");
    let mut rows = Vec::new();
    for def in PIPELINE_SPEC {
        let Some(adapter_key) = def.adapter_key else {
            continue;
        };
        let state = lookup_adapter_state(adapters, adapter_key);
        let (calls, input_tokens, output_tokens, provider) =
            if state == "not_configured" {
                (0, 0, 0, Value::Null)
            } else {
                llm_usage_for(llm_usage, adapter_key)
            };
        rows.push(json!({
            "id": def.id,
            "adapter_key": adapter_key,
            "label": def.label,
            "state": state,
            "calls": calls,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "provider": provider,
        }));
    }
    rows
}

fn infra_state_from_probe(probe: &Value) -> &'static str {
    let configured = probe
        .get("configured")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    if !configured {
        return "not_configured";
    }
    let ok = probe.get("ok").and_then(|v| v.as_bool()).unwrap_or(false);
    if ok {
        "ok"
    } else {
        "degraded"
    }
}

fn infra_rows(params: &Value) -> Vec<Value> {
    let infra = match bag_map(params, "infra") {
        Some(m) => m,
        None => return Vec::new(),
    };
    let mut rows = Vec::new();
    for (id, label) in INFRA_SPEC {
        let Some(probe) = infra.get(*id) else {
            continue;
        };
        let state = infra_state_from_probe(probe);
        let mut row = json!({
            "id": id,
            "label": label,
            "state": state,
            "configured": probe.get("configured").cloned().unwrap_or(json!(false)),
            "ok": probe.get("ok").cloned().unwrap_or(json!(false)),
        });
        if let Some(err) = probe.get("error") {
            row["error"] = err.clone();
        }
        if let Some(n) = probe.get("node_count") {
            row["node_count"] = n.clone();
        }
        if let Some(q) = probe.get("query_count") {
            row["query_count"] = q.clone();
        }
        if let Some(c) = probe.get("cron_configured") {
            row["cron_configured"] = c.clone();
        }
        rows.push(row);
    }
    rows
}

fn aggregate_ok(stages: &[Value], infra: &[Value]) -> bool {
    for s in stages {
        if s.get("state").and_then(|v| v.as_str()) == Some("degraded") {
            return false;
        }
    }
    for i in infra {
        if i.get("state").and_then(|v| v.as_str()) == Some("degraded") {
            return false;
        }
    }
    true
}

/// Build pipeline status from open param bags (no network I/O).
pub fn pipeline_status(_s: &mut Session, params: &Value) -> CmdResult {
    let mut stages: Vec<Value> = PIPELINE_SPEC
        .iter()
        .map(|def| stage_status(def, params))
        .collect();
    stages.sort_by_key(|s| s.get("order").and_then(|v| v.as_u64()).unwrap_or(0));

    let llm = llm_rows(params);
    let infra = infra_rows(params);
    let ok = aggregate_ok(&stages, &infra);

    Ok(json!({
        "spec_version": SPEC_VERSION,
        "ok": ok,
        "stages": stages,
        "llm": llm,
        "infra": infra,
    }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn run(params: Value) -> Value {
        let mut s = Session::new("test");
        pipeline_status(&mut s, &params).expect("pipeline_status")
    }

    #[test]
    fn registry_v1_ids_and_order() {
        let ids: Vec<&str> = PIPELINE_SPEC.iter().map(|d| d.id).collect();
        assert_eq!(
            ids,
            vec![
                "discover",
                "inbox",
                "classify",
                "extract",
                "review",
                "conflicts"
            ]
        );
        assert_eq!(PIPELINE_SPEC.len(), 6);
        for (i, def) in PIPELINE_SPEC.iter().enumerate() {
            assert_eq!(def.order as usize, i + 1);
        }
        let out = run(json!({}));
        assert_eq!(out["spec_version"], SPEC_VERSION);
        assert_eq!(out["stages"].as_array().map(|a| a.len()), Some(6));
        let stage_ids: Vec<&str> = out["stages"]
            .as_array()
            .expect("stages")
            .iter()
            .filter_map(|s| s.get("id").and_then(|v| v.as_str()))
            .collect();
        assert_eq!(
            stage_ids,
            vec![
                "discover",
                "inbox",
                "classify",
                "extract",
                "review",
                "conflicts"
            ]
        );
    }

    #[test]
    fn unknown_keys_ignored_missing_safe() {
        let out = run(json!({
            "counts": {
                "inbox": 3,
                "pending_review": 1,
                "open_conflicts": 2,
                "extra_unused": 99
            },
            "llm_usage": {
                "classify": { "calls": 5, "input_tokens": 10, "output_tokens": 2 },
                "ghost_adapter": { "calls": 99 }
            },
            "adapters": {
                "classify": "not_configured",
                "extract": "not_configured"
            },
            "extract_enabled": false
        }));
        let inbox = out["stages"]
            .as_array()
            .expect("stages")
            .iter()
            .find(|s| s["id"] == "inbox")
            .expect("inbox");
        assert_eq!(inbox["count"], 3);
        // discover missing → null, no panic
        let discover = out["stages"]
            .as_array()
            .expect("stages")
            .iter()
            .find(|s| s["id"] == "discover")
            .expect("discover");
        assert!(discover["count"].is_null());
        // ghost_adapter does not appear in llm rows
        let llm = out["llm"].as_array().expect("llm");
        assert!(llm.iter().all(|r| r["adapter_key"] != "ghost_adapter"));
        assert_eq!(llm.len(), 2);
    }

    #[test]
    fn neo4j_configured_down_degrades_overall() {
        let out = run(json!({
            "extract_enabled": false,
            "adapters": {
                "classify": "not_configured",
                "extract": "not_configured"
            },
            "infra": {
                "neo4j": {
                    "configured": true,
                    "ok": false,
                    "error": "timeout"
                }
            }
        }));
        assert_eq!(out["ok"], false);
        let neo = out["infra"]
            .as_array()
            .expect("infra")
            .iter()
            .find(|i| i["id"] == "neo4j")
            .expect("neo4j");
        assert_eq!(neo["state"], "degraded");
        assert_eq!(neo["configured"], true);
        assert_eq!(neo["ok"], false);
    }

    #[test]
    fn extract_gate_via_gate_key() {
        let closed = run(json!({
            "extract_enabled": false,
            "adapters": { "extract": "ok", "classify": "stub" }
        }));
        let extract = closed["stages"]
            .as_array()
            .expect("stages")
            .iter()
            .find(|s| s["id"] == "extract")
            .expect("extract");
        assert_eq!(extract["state"], "stub");
        assert_eq!(extract["note"], "Gate closed");

        let open = run(json!({
            "gates": { "extract_enabled": true },
            "adapters": { "extract": "not_configured", "classify": "not_configured" }
        }));
        let extract_open = open["stages"]
            .as_array()
            .expect("stages")
            .iter()
            .find(|s| s["id"] == "extract")
            .expect("extract");
        assert_eq!(extract_open["state"], "not_configured");
        assert!(
            extract_open["note"]
                .as_str()
                .unwrap_or("")
                .contains("Gate open")
        );
    }

    #[test]
    fn llm_zeros_when_not_configured() {
        let out = run(json!({
            "extract_enabled": false,
            "adapters": {
                "classify": "not_configured",
                "extract": "not_configured"
            },
            "llm_usage": {
                "classify": { "calls": 42, "input_tokens": 100, "output_tokens": 50 }
            }
        }));
        for row in out["llm"].as_array().expect("llm") {
            assert_eq!(row["state"], "not_configured");
            assert_eq!(row["calls"], 0);
            assert_eq!(row["input_tokens"], 0);
            assert_eq!(row["output_tokens"], 0);
        }
    }
}
