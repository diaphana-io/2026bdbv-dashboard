//! L4 Session + CommandSpec registry (RustGIS-inspired).
#![deny(clippy::unwrap_used, clippy::expect_used, clippy::panic)]

use serde_json::{json, Value};
use thiserror::Error;

pub mod commands;
pub mod curate;
pub mod pipeline;

#[derive(Debug, Error)]
pub enum EngineError {
    #[error("unknown command: {0}")]
    UnknownCommand(String),
    #[error("command failed: {0}")]
    Failed(String),
}

pub type CmdResult = Result<Value, EngineError>;

pub struct CommandSpec {
    pub id: &'static str,
    pub mutates: bool,
    pub run: fn(&mut Session, &Value) -> CmdResult,
}

pub struct Session {
    pub dataset: String,
}

impl Session {
    pub fn new(dataset: impl Into<String>) -> Self {
        Self {
            dataset: dataset.into(),
        }
    }

    pub fn run(&mut self, id: &str, params: &Value) -> CmdResult {
        let cmd = commands::REGISTRY
            .iter()
            .find(|c| c.id == id)
            .ok_or_else(|| EngineError::UnknownCommand(id.to_string()))?;
        (cmd.run)(self, params)
    }
}

fn cmd_ping(_s: &mut Session, _p: &Value) -> CmdResult {
    Ok(json!({ "ok": true }))
}

pub(crate) fn gp_count_points(_s: &mut Session, params: &Value) -> CmdResult {
    use surv_analysis::count_points_in_admins;
    use surv_data::Feature;
    let points: Vec<Feature> =
        serde_json::from_value(params.get("points").cloned().unwrap_or_else(|| json!([])))
            .map_err(|e| EngineError::Failed(e.to_string()))?;
    let admins: Vec<Feature> =
        serde_json::from_value(params.get("admins").cloned().unwrap_or_else(|| json!([])))
            .map_err(|e| EngineError::Failed(e.to_string()))?;
    let counts = count_points_in_admins(&points, &admins);
    Ok(json!({ "counts": counts }))
}

pub(crate) fn epi_followup(_s: &mut Session, params: &Value) -> CmdResult {
    let last = params
        .get("last_contact_at")
        .and_then(|v| v.as_str())
        .ok_or_else(|| EngineError::Failed("last_contact_at required".into()))?;
    let days = params
        .get("incubation_max_days")
        .and_then(|v| v.as_u64())
        .unwrap_or(21) as u32;
    let w = surv_epi::followup_window(last, days)
        .ok_or_else(|| EngineError::Failed("invalid date".into()))?;
    serde_json::to_value(w).map_err(|e| EngineError::Failed(e.to_string()))
}

pub(crate) fn export_geojson(_s: &mut Session, params: &Value) -> CmdResult {
    use surv_analysis::count_points_in_admins;
    use surv_data::Feature;
    let points: Vec<Feature> =
        serde_json::from_value(params.get("points").cloned().unwrap_or_else(|| json!([])))
            .map_err(|e| EngineError::Failed(e.to_string()))?;
    let admins: Vec<Feature> =
        serde_json::from_value(params.get("admins").cloned().unwrap_or_else(|| json!([])))
            .map_err(|e| EngineError::Failed(e.to_string()))?;
    let counts = count_points_in_admins(&points, &admins);
    let mut features = Vec::new();
    for admin in &admins {
        let count = counts
            .iter()
            .find(|c| c.admin_id == admin.id)
            .map(|c| c.count)
            .unwrap_or(0);
        features.push(json!({
            "type": "Feature",
            "id": admin.id,
            "properties": {
                "admin_id": admin.id,
                "case_count": count
            },
            "geometry": admin.geometry
        }));
    }
    Ok(json!({
        "type": "FeatureCollection",
        "features": features
    }))
}

pub(crate) fn epi_curve(_s: &mut Session, params: &Value) -> CmdResult {
    let rows = params
        .get("events")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();
    let mut pairs = Vec::new();
    for r in rows {
        let date = r
            .get("date")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let class = r
            .get("classification")
            .and_then(|v| v.as_str())
            .unwrap_or("suspected")
            .to_string();
        if !date.is_empty() {
            pairs.push((date, class));
        }
    }
    let buckets = surv_epi::bucket_onset(&pairs);
    Ok(json!({ "buckets": buckets }))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ping_works() {
        let mut s = Session::new("test");
        let v = s.run("sys.ping", &json!({})).unwrap();
        assert_eq!(v["ok"], true);
    }

    #[test]
    fn curate_commands_registered() {
        let mut s = Session::new("test");
        assert_eq!(
            s.run("curate.classifySource", &json!({})).unwrap()["evidence_class"],
            "other"
        );
        assert_eq!(
            s.run(
                "curate.checkDuplicate",
                &json!({ "url": "https://a.example/", "existing_normalized_urls": [] })
            )
            .unwrap()["duplicate_level"],
            "none"
        );
        assert!(s
            .run(
                "curate.appendAudit",
                &json!({ "action": "approve", "actor": "t@example.com" })
            )
            .unwrap()["appended"]
            .as_bool()
            .unwrap_or(false));
    }

    #[test]
    fn followup_command() {
        let mut s = Session::new("test");
        let v = s
            .run(
                "epi.followupWindows",
                &json!({ "last_contact_at": "2026-10-03", "incubation_max_days": 21 }),
            )
            .unwrap();
        assert_eq!(v["window_end"], "2026-10-24");
    }

    #[test]
    fn export_geojson_command() {
        let mut s = Session::new("test");
        let v = s
            .run(
                "export.geojson",
                &json!({
                    "points": [{
                        "id": "c1",
                        "properties": {},
                        "geometry": { "type": "Point", "coordinates": [36.82, -1.29] }
                    }],
                    "admins": [{
                        "id": "ke-nairobi",
                        "properties": {},
                        "geometry": {
                            "type": "Polygon",
                            "coordinates": [[[36.6,-1.4],[37.0,-1.4],[37.0,-1.1],[36.6,-1.1],[36.6,-1.4]]]
                        }
                    }]
                }),
            )
            .unwrap();
        assert_eq!(v["type"], "FeatureCollection");
        assert_eq!(v["features"][0]["properties"]["case_count"], 1);
    }
}
