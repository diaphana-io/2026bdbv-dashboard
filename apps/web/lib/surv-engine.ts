/**
 * Thin JSON in/out bridge to surv_wasm → surv_engine.
 * No pipeline aggregation here — engine owns stages / health.
 *
 * Build the wasm package first: `npm run build:wasm` (repo root).
 */

type SurvWasmModule = {
  runCommandJson: (
    dataset: string,
    id: string,
    paramsJson: string,
  ) => string;
};

let cached: SurvWasmModule | null = null;

async function loadWasm(): Promise<SurvWasmModule> {
  if (cached) return cached;
  try {
    // Bundler target: wasm is imported synchronously from surv_wasm.js.
    const mod = (await import("./surv_wasm/surv_wasm.js")) as SurvWasmModule;
    if (typeof mod.runCommandJson !== "function") {
      throw new Error("runCommandJson export missing");
    }
    cached = mod;
    return mod;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "surv_wasm_load_failed";
    throw new Error(
      `surv_wasm unavailable (${message}). Run npm run build:wasm.`,
    );
  }
}

/** Run a surv_engine command; params/result are plain JSON values. */
export async function runCommand(
  id: string,
  params: unknown = {},
  dataset = "curate",
): Promise<unknown> {
  const mod = await loadWasm();
  const raw = mod.runCommandJson(dataset, id, JSON.stringify(params ?? {}));
  return JSON.parse(raw) as unknown;
}
