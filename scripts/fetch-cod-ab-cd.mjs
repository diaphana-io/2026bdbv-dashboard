#!/usr/bin/env node
/**
 * Fetch DRC COD-AB (HDX) admin1–3 GeoJSON, simplify, and write map-static files:
 *   apps/web/data/cd_provinces.json
 *   apps/web/data/cd_territories.json
 *   apps/web/data/cd_health_zones.json
 *
 * Source: https://data.humdata.org/dataset/cod-ab-cod
 * Attribution: © OCHA / COD-AB
 *
 * Usage: node scripts/fetch-cod-ab-cd.mjs
 * Optional: COD_AB_CACHE_DIR=... to reuse an already-extracted zip.
 */
import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { Readable } from "node:stream";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "apps", "web", "data");
const HDX_GEOJSON_ZIP =
  "https://data.humdata.org/dataset/f42132b9-8cc6-4201-b020-9259c56e8868/resource/97260e2b-65b1-41e3-aef2-fb0e6874e406/download/cod_admin_boundaries.geojson.zip";
const UA = "2026bdbv-dashboard/1.0 (COD-AB fetch; +https://github.com/diaphana-io/2026bdbv-dashboard)";

/** Douglas–Peucker tolerance (degrees). Tuned for few-MB total map GeoJSON. */
const TOLERANCE = {
  adm1: 0.02,
  adm2: 0.012,
  adm3: 0.008,
};

const LEVELS = [
  {
    src: "cod_admin1.geojson",
    out: "cd_provinces.json",
    level: "adm1",
    mapProps: (p) => ({
      adm1_pcode: String(p.adm1_pcode ?? ""),
      name: String(p.adm1_name ?? ""),
      admin0_iso: "CD",
    }),
  },
  {
    src: "cod_admin2.geojson",
    out: "cd_territories.json",
    level: "adm2",
    mapProps: (p) => ({
      adm2_pcode: String(p.adm2_pcode ?? ""),
      name: String(p.adm2_name ?? ""),
      adm1_pcode: String(p.adm1_pcode ?? ""),
      admin0_iso: "CD",
    }),
  },
  {
    src: "cod_admin3.geojson",
    out: "cd_health_zones.json",
    level: "adm3",
    mapProps: (p) => ({
      adm3_pcode: String(p.adm3_pcode ?? ""),
      name: String(p.adm3_name ?? ""),
      adm2_pcode: String(p.adm2_pcode ?? ""),
      adm1_pcode: String(p.adm1_pcode ?? ""),
      admin0_iso: "CD",
    }),
  },
];

function dist2(a, b, p) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  if (dx === 0 && dy === 0) {
    const ex = p[0] - a[0];
    const ey = p[1] - a[1];
    return ex * ex + ey * ey;
  }
  const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy);
  const u = Math.max(0, Math.min(1, t));
  const x = a[0] + u * dx;
  const y = a[1] + u * dy;
  const ex = p[0] - x;
  const ey = p[1] - y;
  return ex * ex + ey * ey;
}

function douglasPeucker(points, sqTol) {
  if (points.length <= 2) return points;
  let maxD = 0;
  let idx = 0;
  const end = points.length - 1;
  for (let i = 1; i < end; i++) {
    const d = dist2(points[0], points[end], points[i]);
    if (d > maxD) {
      idx = i;
      maxD = d;
    }
  }
  if (maxD > sqTol) {
    const left = douglasPeucker(points.slice(0, idx + 1), sqTol);
    const right = douglasPeucker(points.slice(idx), sqTol);
    return left.slice(0, -1).concat(right);
  }
  return [points[0], points[end]];
}

function simplifyRing(ring, tolerance) {
  if (!Array.isArray(ring) || ring.length < 4) return ring;
  const closed =
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1];
  const pts = closed ? ring.slice(0, -1) : ring.slice();
  if (pts.length < 3) return ring;
  const simplified = douglasPeucker(pts, tolerance * tolerance);
  if (simplified.length < 3) {
    return [pts[0], pts[Math.floor(pts.length / 2)], pts[pts.length - 1], pts[0]];
  }
  if (
    simplified[0][0] !== simplified[simplified.length - 1][0] ||
    simplified[0][1] !== simplified[simplified.length - 1][1]
  ) {
    simplified.push(simplified[0]);
  }
  return simplified;
}

function simplifyCoords(coords, type, tolerance) {
  if (type === "Polygon") {
    return coords.map((ring) => simplifyRing(ring, tolerance));
  }
  if (type === "MultiPolygon") {
    return coords.map((poly) =>
      poly.map((ring) => simplifyRing(ring, tolerance)),
    );
  }
  return coords;
}

async function download(url, dest) {
  console.log(`Downloading ${url}`);
  const res = await fetch(url, { headers: { "user-agent": UA } });
  if (!res.ok || !res.body) {
    throw new Error(`Download failed: ${res.status} ${res.statusText}`);
  }
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
  console.log(`Saved ${dest}`);
}

function unzipWithPowerShell(zipPath, destDir) {
  mkdirSync(destDir, { recursive: true });
  execFileSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-Command",
      `Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${destDir.replace(/'/g, "''")}' -Force`,
    ],
    { stdio: "inherit" },
  );
}

function processLevel(extractDir, spec) {
  const srcPath = join(extractDir, spec.src);
  if (!existsSync(srcPath)) {
    throw new Error(`Missing ${spec.src} in extract dir`);
  }
  console.log(`Processing ${spec.src} → ${spec.out}`);
  const raw = JSON.parse(readFileSync(srcPath, "utf8"));
  const tolerance = TOLERANCE[spec.level];
  const features = (raw.features ?? []).map((f) => {
    const geom = f.geometry;
    return {
      type: "Feature",
      properties: spec.mapProps(f.properties ?? {}),
      geometry: geom
        ? {
            type: geom.type,
            coordinates: simplifyCoords(geom.coordinates, geom.type, tolerance),
          }
        : null,
    };
  });
  const collection = { type: "FeatureCollection", features };
  const outPath = join(outDir, spec.out);
  writeFileSync(outPath, JSON.stringify(collection));
  const kb = Math.round(Buffer.byteLength(JSON.stringify(collection)) / 1024);
  console.log(`  ${features.length} features, ~${kb} KB → ${outPath}`);
  return kb;
}

function writeSourceMemo() {
  const memo = `# COD-AB (DRC) map boundaries

Source: [COD-AB COD](https://data.humdata.org/dataset/cod-ab-cod) (OCHA).
Files: \`cd_provinces.json\` (adm1), \`cd_territories.json\` (adm2), \`cd_health_zones.json\` (adm3).
Regenerate: \`node scripts/fetch-cod-ab-cd.mjs\`
Attribution: © OCHA / COD-AB — required on the map via \`view.attribution\`.
`;
  writeFileSync(join(outDir, "SOURCE-cod-ab.md"), memo);
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  const cacheDir = process.env.COD_AB_CACHE_DIR?.trim();
  let extractDir = cacheDir;

  if (!extractDir || !existsSync(join(extractDir, "cod_admin1.geojson"))) {
    const work = join(tmpdir(), `cod-ab-cd-${Date.now()}`);
    mkdirSync(work, { recursive: true });
    const zipPath = join(work, "cod_admin_boundaries.geojson.zip");
    extractDir = join(work, "extract");
    try {
      await download(HDX_GEOJSON_ZIP, zipPath);
      unzipWithPowerShell(zipPath, extractDir);
    } catch (err) {
      // Prefer a pre-extracted TEMP cache from a prior run on Windows.
      const fallback = join(tmpdir(), "cod-ab-cd");
      if (existsSync(join(fallback, "cod_admin1.geojson"))) {
        console.warn(`Download/unzip failed (${err.message}); using ${fallback}`);
        extractDir = fallback;
      } else {
        throw err;
      }
    }
  } else {
    console.log(`Using cache ${extractDir}`);
  }

  let totalKb = 0;
  for (const spec of LEVELS) {
    totalKb += processLevel(extractDir, spec);
  }
  writeSourceMemo();
  console.log(`Done. Total ~${totalKb} KB (target: a few MB).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
