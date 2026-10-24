//! WASM / Workers bindings for surv_engine commands.
#![deny(clippy::unwrap_used, clippy::expect_used, clippy::panic)]

use surv_engine::Session;

/// Run a command by id with JSON params; returns JSON string.
pub fn run_command_json(dataset: &str, id: &str, params_json: &str) -> Result<String, String> {
    let params: serde_json::Value =
        serde_json::from_str(params_json).map_err(|e| e.to_string())?;
    let mut session = Session::new(dataset);
    let value = session.run(id, &params).map_err(|e| e.to_string())?;
    serde_json::to_string(&value).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wasm_ping() {
        let out = run_command_json("test", "sys.ping", "{}").unwrap();
        assert!(out.contains("true"));
    }
}
