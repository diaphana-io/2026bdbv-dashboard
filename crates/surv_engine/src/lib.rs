//! L4 Session + CommandSpec registry (RustGIS-inspired).
#![deny(clippy::unwrap_used, clippy::expect_used, clippy::panic)]

use serde_json::{json, Value};
use thiserror::Error;

pub mod commands;
pub mod curate;

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
    let points: Vec<Feature> = serde_json::from_value(
        params.get("points").cloned().unwrap_or_else(|| json!([])),
    )
    .map_err(|e| EngineError::Failed(e.to_string()))?;
    let admins: Vec<Feature> = serde_json::from_value(
        params.get("admins").cloned().unwrap_or_else(|| json!([])),
    )
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
    Ok(serde_json::to_value(w).map_err(|e| EngineError::Failed(e.to_string()))?)
}

pub(crate) fn epi_curve(_s: &mut Session, params: &Value) -> CmdResult {
    let rows = params
        .get("events")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();
    let mut pairs = Vec::new();
    for r in rows {
        let date = r.get("date").and_then(|v| v.as_str()).unwrap_or("").to_string();
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
}
