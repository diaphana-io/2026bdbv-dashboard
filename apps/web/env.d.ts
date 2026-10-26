/**
 * Worker bindings for apps/web (`cloudflare.config.ts`).
 * Claim Curate SoT: `DB` is either `bdbv-curate` (production) or
 * `bdbv-curate-preview` (Workers Preview / test), selected via `isPreview`.
 *
 * Minimal D1 surfaces used by Curate reads; Workers runtime provides the
 * full binding. Vite CF plugin / `.cloudflare/types` may augment later.
 */

interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
  meta: Record<string, unknown>;
  error?: string;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  all<T = unknown>(): Promise<D1Result<T>>;
  run(): Promise<D1Result>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch?<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec?(query: string): Promise<D1Result>;
}

declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
  }
}

interface Env extends Cloudflare.Env {}

declare module "cloudflare:workers" {
  export const env: Cloudflare.Env;
}
