/**
 * Worker bindings for apps/web (`cloudflare.config.ts`).
 * Claim Curate SoT: `DB` is either `bdbv-curate` (production) or
 * `bdbv-curate-preview` (Workers Preview / test), selected via `isPreview`.
 *
 * `D1Database` comes from Cloudflare Workers runtime types (Vite plugin /
 * `.cloudflare/types` when generated).
 */
declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
  }
}

interface Env extends Cloudflare.Env {}
