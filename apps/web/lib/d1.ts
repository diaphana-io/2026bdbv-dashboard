/**
 * D1 binding for Claim Curate SoT (env.DB).
 * Bound in cloudflare.config.ts by name (bdbv-curate / bdbv-curate-preview).
 * Returns null when unbound (Node, vitest, or missing binding).
 */
import { env } from "cloudflare:workers";

export function getDb(): D1Database | null {
  try {
    const db = (env as Partial<Cloudflare.Env>).DB;
    return db ?? null;
  } catch {
    return null;
  }
}
