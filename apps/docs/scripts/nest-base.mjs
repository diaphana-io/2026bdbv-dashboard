/**
 * Astro `base: '/docs'` rewrites asset/page URLs but leaves files at dist root.
 * Cloudflare Pages serves this project as the hostname origin, so nest output
 * under dist/docs/ so /docs and /docs/* resolve correctly.
 */
import { cpSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const staging = mkdtempSync(join(tmpdir(), 'bdbv-docs-'));

cpSync(dist, staging, { recursive: true });
rmSync(dist, { recursive: true, force: true });
mkdirSync(join(dist, 'docs'), { recursive: true });
cpSync(staging, join(dist, 'docs'), { recursive: true });
rmSync(staging, { recursive: true, force: true });

console.log('Nested dist under docs/ for Pages path serving');
