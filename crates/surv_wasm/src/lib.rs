//! WASM / Workers bindings for surv_engine commands.
#![deny(clippy::unwrap_used, clippy::expect_used, clippy::panic)]

use surv_engine::Session;
use wasm_bindgen::prelude::*;

/// Run a command by id with JSON params; returns JSON string.
///
/// Native / rlib callers use this directly. On `wasm32`, also exported via
/// wasm-bindgen for the Vite / Workers import path.
pub fn run_command_json(dataset: &str, id: &str, params_json: &str) -> Result<String, String> {
    let params: serde_json::Value = serde_json::from_str(params_json).map_err(|e| e.to_string())?;
    let mut session = Session::new(dataset);
    let value = session.run(id, &params).map_err(|e| e.to_string())?;
    serde_json::to_string(&value).map_err(|e| e.to_string())
}

/// wasm-bindgen export: same contract as [`run_command_json`].
#[wasm_bindgen(js_name = runCommandJson)]
pub fn run_command_json_wasm(
    dataset: &str,
    id: &str,
    params_json: &str,
) -> Result<String, JsValue> {
    run_command_json(dataset, id, params_json).map_err(|e| JsValue::from_str(&e))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wasm_ping() {
        let out = run_command_json("test", "sys.ping", "{}").expect("ping");
        assert!(out.contains("true"));
    }

    #[test]
    fn wasm_pipeline_status() {
        let out = run_command_json(
            "test",
            "sys.pipelineStatus",
            r#"{"extract_enabled":false,"adapters":{"classify":"not_configured","extract":"not_configured"}}"#,
        )
        .expect("pipelineStatus");
        assert!(out.contains("spec_version"));
        assert!(out.contains("stages"));
    }
}
