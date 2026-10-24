/** Prefix app-relative paths when APP_BASE_PATH / NEXT_PUBLIC_APP_BASE_PATH is set. */
export function withBasePath(path: string): string {
  const base =
    process.env.NEXT_PUBLIC_APP_BASE_PATH || process.env.APP_BASE_PATH || "";
  if (!base) return path;
  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}
