import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import type { OutputAsset, OutputChunk, Plugin } from "vite";

/**
 * Navara classic workers resolve WASM next to the worker script with a
 * hyphen-hashed name (`navara_wasm_worker_bg-HASH.wasm`). Vinext emits the
 * same bytes as `navara_wasm_worker_bg.HASH.wasm` (dot hash). In production
 * the hyphen URL 404s → vector tessellation + label fonts die, while the
 * main-thread ellipsoid/raster still paints (gray globe / blurry satellite).
 *
 * Local `vite dev` serves unhashed package files, so this never shows up.
 *
 * Emit aliases in `generateBundle` (not `writeBundle`) so Cloudflare/vinext
 * asset relocation still includes them.
 */
const WASM_REF =
  /(navara_wasm(?:_api|_worker|_font_worker)?_bg)[-.]([A-Za-z0-9_-]{6,})\.wasm/g;

const PKG_WASM: Record<string, string> = {
  navara_wasm_font_worker_bg:
    "@navaramap/engine-font-worker/navara_wasm_font_worker_bg.wasm",
  navara_wasm_worker_bg:
    "@navaramap/engine-worker/navara_wasm_worker_bg.wasm",
  navara_wasm_bg: "@navaramap/engine/navara_wasm_bg.wasm",
  navara_wasm_api_bg: "@navaramap/engine-api/navara_wasm_api_bg.wasm",
};

function resolvePkgWasm(specifier: string, from: string): string | null {
  try {
    return createRequire(from).resolve(specifier);
  } catch {
    return null;
  }
}

function collectRefs(text: string, into: Set<string>) {
  for (const m of text.matchAll(WASM_REF)) {
    into.add(`${m[1]}-${m[2]}.wasm`);
    into.add(`${m[1]}.${m[2]}.wasm`);
  }
}

function assetSourceBytes(
  source: string | Uint8Array,
): Uint8Array {
  if (typeof source === "string") {
    return new TextEncoder().encode(source);
  }
  return source;
}

export function navaraWorkerWasmPlugin(): Plugin {
  let root = process.cwd();

  return {
    name: "navara-worker-wasm",
    apply: "build",
    configResolved(config) {
      root = config.root;
    },
    generateBundle(_options, bundle) {
      const requireFrom = path.join(root, "package.json");
      const refs = new Set<string>();
      /** basename → asset fileName in this bundle */
      const emittedByBase = new Map<string, string>();

      for (const [fileName, item] of Object.entries(bundle)) {
        if (item.type === "chunk") {
          collectRefs((item as OutputChunk).code, refs);
        } else if (item.type === "asset") {
          const asset = item as OutputAsset;
          if (typeof asset.source === "string") {
            collectRefs(asset.source, refs);
          } else if (
            fileName.endsWith(".js") &&
            asset.source instanceof Uint8Array
          ) {
            collectRefs(
              Buffer.from(asset.source).toString("utf8"),
              refs,
            );
          }
        }

        const base = path.basename(fileName);
        if (base.endsWith(".wasm")) {
          emittedByBase.set(base, fileName);
          collectRefs(base, refs);
        }
      }

      if (refs.size === 0 && emittedByBase.size === 0) return;

      for (const ref of refs) {
        if ([...emittedByBase.keys()].includes(ref)) continue;
        // Already emitted under some directory prefix?
        if ([...emittedByBase.values()].some((f) => f.endsWith(`/${ref}`))) {
          continue;
        }

        const stemMatch = ref.match(
          /^(navara_wasm(?:_api|_worker|_font_worker)?_bg)[-.]([A-Za-z0-9_-]+)\.wasm$/,
        );
        if (!stemMatch) continue;
        const stem = stemMatch[1]!;
        const hash = stemMatch[2]!;
        const dotName = `${stem}.${hash}.wasm`;
        const hyphenName = `${stem}-${hash}.wasm`;

        // Prefer bytes already in this bundle (dot or hyphen sibling).
        let source: Uint8Array | null = null;
        for (const candidate of [dotName, hyphenName]) {
          const existing = emittedByBase.get(candidate);
          if (!existing) continue;
          const asset = bundle[existing];
          if (asset?.type === "asset") {
            source = assetSourceBytes(asset.source);
            break;
          }
        }

        if (!source) {
          const pkgSpec = PKG_WASM[stem];
          const pkgPath = pkgSpec
            ? resolvePkgWasm(pkgSpec, requireFrom)
            : null;
          if (pkgPath && fs.existsSync(pkgPath)) {
            source = fs.readFileSync(pkgPath);
          }
        }

        if (!source) {
          this.warn(`[navara-worker-wasm] could not resolve ${ref}`);
          continue;
        }

        // Place next to other media assets when possible.
        const sample = [...emittedByBase.values()][0];
        const dir = sample?.includes("/")
          ? sample.slice(0, sample.lastIndexOf("/") + 1)
          : "media/";

        for (const name of [dotName, hyphenName]) {
          if (emittedByBase.has(name)) continue;
          if (
            [...emittedByBase.values()].some((f) => f.endsWith(`/${name}`))
          ) {
            continue;
          }
          const fileName = `${dir}${name}`;
          this.emitFile({
            type: "asset",
            fileName,
            source,
          });
          emittedByBase.set(name, fileName);
          this.info(`[navara-worker-wasm] emit ${fileName}`);
        }
      }
    },
  };
}
