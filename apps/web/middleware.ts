import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAccessEnforced, isAccessProtectedPath, verifyAccessJwt } from "./lib/access";

/**
 * Staging/production gates:
 * - Cloudflare Access at the edge protects /curate (+ /api/curate) — preferred.
 * - When CF_ACCESS_TEAM_DOMAIN + CF_ACCESS_AUD are set, this middleware
 *   validates Cf-Access-Jwt-Assertion as defense in depth.
 * - Production never serves Extract-enabled Curate until GitHub #2 / MATT-310 closes.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const appEnv = process.env.APP_ENV ?? "staging";
  const extractEnabled = process.env.EXTRACT_ENABLED === "true";

  if (appEnv === "production" && extractEnabled && isAccessProtectedPath(pathname)) {
    return new NextResponse("Extract disabled in production until specification is approved", {
      status: 503,
    });
  }

  const accessEnv = {
    teamDomain: process.env.CF_ACCESS_TEAM_DOMAIN,
    audience: process.env.CF_ACCESS_AUD,
  };

  if (isAccessEnforced(accessEnv) && isAccessProtectedPath(pathname)) {
    const token = request.headers.get("cf-access-jwt-assertion");
    const err = await verifyAccessJwt(token, accessEnv);
    if (err) {
      return new NextResponse(err, {
        status: 401,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }
  }

  const res = NextResponse.next();
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("X-Frame-Options", "DENY");
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
