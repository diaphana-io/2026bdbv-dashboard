import { createRemoteJWKSet, jwtVerify } from "jose";

/**
 * Paths that must sit behind Cloudflare Access on the Map Worker
 * (pathname without APP_BASE_PATH).
 *
 * Legacy nested `/curate` + `/api/curate` — middleware strips/404s these first;
 * Access remains defense in depth if strip is off locally.
 * Live Curate Access lives on private `bdbv-curate-app`.
 */
export function isAccessProtectedPath(pathname: string): boolean {
  return (
    pathname === "/curate" ||
    pathname.startsWith("/curate/") ||
    pathname === "/api/curate" ||
    pathname.startsWith("/api/curate/")
  );
}

export type AccessEnv = {
  teamDomain?: string | null;
  audience?: string | null;
};

/** Enforce when both team domain and AUD are configured (staging/production). */
export function isAccessEnforced(env: AccessEnv): boolean {
  return Boolean(env.teamDomain?.trim() && env.audience?.trim());
}

function normalizeTeamDomain(teamDomain: string): string {
  const trimmed = teamDomain.trim().replace(/\/+$/, "");
  if (trimmed.startsWith("https://") || trimmed.startsWith("http://")) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

/**
 * Browser login URL when edge Access did not intercept (e.g. new Worker preview
 * before the Access app lists that Worker). APIs should still 401.
 */
export function accessLoginRedirectUrl(
  requestUrl: string,
  env: AccessEnv,
): string | null {
  const teamDomain = env.teamDomain?.trim();
  if (!teamDomain) return null;
  const issuer = normalizeTeamDomain(teamDomain);
  const target = new URL(requestUrl);
  const login = new URL(`${issuer}/cdn-cgi/access/login/${target.host}`);
  login.searchParams.set(
    "redirect_url",
    `${target.pathname}${target.search}`,
  );
  return login.toString();
}

/**
 * Validate Cf-Access-Jwt-Assertion against the team JWKS.
 * Returns null when valid; otherwise an error message.
 */
export async function verifyAccessJwt(
  token: string | null | undefined,
  env: AccessEnv,
): Promise<string | null> {
  if (!token) return "Missing Cloudflare Access token";
  const teamDomain = env.teamDomain?.trim();
  const audience = env.audience?.trim();
  if (!teamDomain || !audience) return "Access is not configured";

  const issuer = normalizeTeamDomain(teamDomain);
  const JWKS = createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`));

  try {
    await jwtVerify(token, JWKS, {
      issuer,
      audience,
    });
    return null;
  } catch {
    return "Invalid Cloudflare Access token";
  }
}
