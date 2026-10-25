/**
 * Thin JSON in/out bridge to surv_wasm → surv_engine.
 * No pipeline aggregation here — engine owns stages / health.
 *
 * Build the wasm package first: `npm run build:wasm` (repo root).
 *
 * Loads via `surv_wasm_bg.wasm?url` + WebAssembly.instantiate so vinext/Workers
 * RSC builds never pull bundler-target `import * as wasm from "*.wasm"` through
 * vite-plugin-top-level-await (SWC printSync crash).
 */

type SurvWasmBg = {
  __wbg_set_wasm: (val: WebAssembly.Exports) => void;
  runCommandJson: (
    dataset: string,
    id: string,
    paramsJson: string,
  ) => string;
};

type SurvWasmModule = Pick<SurvWasmBg, "runCommandJson">;

let cached: SurvWasmModule | null = null;
let loading: Promise<SurvWasmModule> | null = null;

function toArrayBuffer(buf: Uint8Array): ArrayBuffer {
  return buf.buffer.slice(
    buf.byteOffset,
    buf.byteOffset + buf.byteLength,
  ) as ArrayBuffer;
}

async function readFileBytes(path: string): Promise<ArrayBuffer> {
  const { readFile } = await import("node:fs/promises");
  const buf = await readFile(path);
  return toArrayBuffer(buf);
}

/** Resolve Vite `?url` asset to bytes (Workers fetch, Node/vitest filesystem). */
async function readWasmBytes(url: string): Promise<ArrayBuffer> {
  if (url.startsWith("file:")) {
    const { fileURLToPath } = await import("node:url");
    return readFileBytes(fileURLToPath(url));
  }

  // Absolute Windows path from some Vite/Node resolvers.
  if (/^[A-Za-z]:[\\/]/.test(url)) {
    return readFileBytes(url);
  }

  // Prefer fetch (Workers / browser / http(s) asset URLs).
  try {
    const res = await fetch(url);
    if (res.ok) return res.arrayBuffer();
  } catch {
    /* Node often cannot fetch Vite's absolute `/lib/...` paths */
  }

  // Vitest: `?url` is typically `/lib/surv_wasm/surv_wasm_bg.wasm` (site root).
  if (url.startsWith("/") && !url.startsWith("//")) {
    const { join } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const rel = url.replace(/^\/+/, "");
    const here = fileURLToPath(new URL(".", import.meta.url));
    const candidates = [
      join(process.cwd(), rel),
      join(here, "surv_wasm", "surv_wasm_bg.wasm"),
      join(process.cwd(), "apps", "web", rel),
    ];
    for (const path of candidates) {
      try {
        return await readFileBytes(path);
      } catch {
        /* try next */
      }
    }
  }

  throw new Error(`wasm bytes unavailable for ${url}`);
}

async function loadWasm(): Promise<SurvWasmModule> {
  if (cached) return cached;
  if (loading) return loading;

  loading = (async () => {
    const [{ default: wasmUrl }, bg] = await Promise.all([
      import("./surv_wasm/surv_wasm_bg.wasm?url"),
      import("./surv_wasm/surv_wasm_bg.js") as Promise<SurvWasmBg>,
    ]);

    const bytes = await readWasmBytes(wasmUrl);
    const { instance } = await WebAssembly.instantiate(bytes, {
      // Bundler-target import module name from wasm-bindgen.
      "./surv_wasm_bg.js": bg as unknown as WebAssembly.ModuleImports,
    });

    bg.__wbg_set_wasm(instance.exports);
    const start = instance.exports.__wbindgen_start as (() => void) | undefined;
    start?.();

    if (typeof bg.runCommandJson !== "function") {
      throw new Error("runCommandJson export missing");
    }
    cached = { runCommandJson: bg.runCommandJson.bind(bg) };
    return cached;
  })();

  try {
    return await loading;
  } catch (err) {
    loading = null;
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
