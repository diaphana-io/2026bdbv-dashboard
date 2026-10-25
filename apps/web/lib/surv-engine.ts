/**
 * Thin JSON in/out bridge to surv_wasm → surv_engine.
 * No pipeline aggregation here — engine owns stages / health.
 *
 * Build the wasm package first: `npm run build:wasm` (repo root).
 *
 * Prefer Cloudflare/Vite `*.wasm?module` → WebAssembly.Module (no fetch /
 * import.meta.url — both break on workerd with "Invalid URL string").
 * Fall back to `?url` + bytes for Vitest/Node.
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

/** Resolve Vite `?url` asset to bytes (Node/vitest filesystem; http(s) URLs). */
async function readWasmBytes(url: string): Promise<ArrayBuffer> {
  if (url.startsWith("file:")) {
    const { fileURLToPath } = await import("node:url");
    return readFileBytes(fileURLToPath(url));
  }

  // Absolute Windows path from some Vite/Node resolvers.
  if (/^[A-Za-z]:[\\/]/.test(url)) {
    return readFileBytes(url);
  }

  // Absolute http(s) only — relative paths throw "Invalid URL string" on workerd.
  if (/^https?:\/\//i.test(url)) {
    const res = await fetch(url);
    if (res.ok) return res.arrayBuffer();
  }

  // Vitest: `?url` is typically `/lib/surv_wasm/surv_wasm_bg.wasm` (site root).
  if (url.startsWith("/") && !url.startsWith("//")) {
    try {
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
    } catch {
      /* Workers: no fs / invalid import.meta.url */
    }
  }

  throw new Error(`wasm bytes unavailable for ${url}`);
}

function asWasmModule(value: unknown): WebAssembly.Module | null {
  if (value instanceof WebAssembly.Module) return value;
  return null;
}

async function compileWasmSource(): Promise<WebAssembly.Module> {
  // Cloudflare Vite plugin: `.wasm` / `.wasm?module` → WebAssembly.Module.
  try {
    const mod = await import("./surv_wasm/surv_wasm_bg.wasm?module");
    const candidate = asWasmModule(
      (mod as { default?: unknown }).default ?? mod,
    );
    if (candidate) return candidate;
  } catch {
    /* vitest / plain Vite may not resolve ?module */
  }

  try {
    const mod = await import("./surv_wasm/surv_wasm_bg.wasm");
    const raw = (mod as { default?: unknown }).default ?? mod;
    const asModule = asWasmModule(raw);
    if (asModule) return asModule;
    if (raw instanceof ArrayBuffer) {
      return WebAssembly.compile(raw);
    }
    if (ArrayBuffer.isView(raw)) {
      return WebAssembly.compile(toArrayBuffer(raw as Uint8Array));
    }
    if (typeof raw === "string") {
      return WebAssembly.compile(await readWasmBytes(raw));
    }
  } catch {
    /* fall through to ?url */
  }

  const { default: wasmUrl } = await import("./surv_wasm/surv_wasm_bg.wasm?url");
  return WebAssembly.compile(await readWasmBytes(wasmUrl));
}

async function loadWasm(): Promise<SurvWasmModule> {
  if (cached) return cached;
  if (loading) return loading;

  loading = (async () => {
    const [wasmModule, bg] = await Promise.all([
      compileWasmSource(),
      import("./surv_wasm/surv_wasm_bg.js") as Promise<SurvWasmBg>,
    ]);

    // instantiate(Module) → Instance; instantiate(bytes) → { module, instance }.
    const instantiated = await WebAssembly.instantiate(wasmModule, {
      // Bundler-target import module name from wasm-bindgen.
      "./surv_wasm_bg.js": bg as unknown as WebAssembly.ModuleImports,
    });
    const instance =
      instantiated instanceof WebAssembly.Instance
        ? instantiated
        : instantiated.instance;

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
