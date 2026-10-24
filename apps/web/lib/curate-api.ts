/** Shared validation for Curate API routes (mirrors surv_engine::curate). */

export const RESOLVE_STATUSES = [
  "resolved_a",
  "resolved_b",
  "resolved_neither",
] as const;

export type ResolveStatus = (typeof RESOLVE_STATUSES)[number];

export function isResolveStatus(value: unknown): value is ResolveStatus {
  return typeof value === "string" && (RESOLVE_STATUSES as readonly string[]).includes(value);
}

export function normalizeUrl(url: string): string {
  let u = url.trim().toLowerCase();
  const q = u.indexOf("?");
  if (q >= 0) u = u.slice(0, q);
  if (u.endsWith("/") && (u.match(/:\/\//g) ?? []).length === 1) {
    const without = u.replace(/\/+$/, "");
    if (!(without.endsWith(":/") || without.length === 0)) {
      u = without;
    }
  }
  return u;
}
