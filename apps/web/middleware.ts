import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  accessLoginRedirectUrl,
  isAccessEnforced,
  isAccessProtectedPath,
  verifyAccessJwt,
} from "./lib/access";
import {
  CURATE_PUBLIC_ORIGIN,
  shouldStripCurateFromApp,
} from "./lib/curate-surface";
import {
  CURATE_DATA_SOURCE_COOKIE,
  CURATE_DATA_SOURCE_HEADER,
  parseCurateDataSource,
} from "./lib/curate-data-source";

/**
 * Staging/production gates:
 * - Cloudflare Access at the edge protects private `/curate` (other Worker).
 * - Map Worker strip: redirect legacy `/curate` UI → `/curate` Worker; 404
 *   nested `/api/curate` mutate (B2 / B7).
 * - When CF_ACCESS_* are set, validate JWT as defense in depth on leftover paths.
 * - Production never serves Extract-enabled Curate until GitHub #2 / MATT-310.
 * - Never touch Neo4j here (Map Bolt timeout / JSON fallback in lib/neo4j.ts + lib/data.ts).
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const appEnv = process.env.APP_ENV ?? "staging";
  const extractEnabled = process.env.EXTRACT_ENABLED === "true";

  if (shouldStripCurateFromApp()) {
    if (pathname === "/api/curate" || pathname.startsWith("/api/curate/")) {
      return new NextResponse("Curate APIs are served by the /curate Worker", {
        status: 404,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }
    if (pathname === "/curate" || pathname.startsWith("/curate/")) {
      const suffix =
        pathname === "/curate" ? "" : pathname.slice("/curate".length);
      const target = new URL(
        `/curate${suffix}${request.nextUrl.search}`,
        CURATE_PUBLIC_ORIGIN,
      );
      return NextResponse.redirect(target, 308);
    }
  }

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
      const wantsHtml =
        request.method === "GET" || request.method === "HEAD";
      const accept = request.headers.get("accept") ?? "";
      if (wantsHtml && accept.includes("text/html")) {
        const login = accessLoginRedirectUrl(request.url, accessEnv);
        if (login) return NextResponse.redirect(login, 302);
      }
      return new NextResponse(err, {
        status: 401,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }
  }

  const requestHeaders = new Headers(request.headers);
  if (isAccessProtectedPath(pathname)) {
    const preferred = parseCurateDataSource(
      request.cookies.get(CURATE_DATA_SOURCE_COOKIE)?.value,
    );
    if (preferred) {
      requestHeaders.set(CURATE_DATA_SOURCE_HEADER, preferred);
    }
  }

  const res = NextResponse.next({
    request: { headers: requestHeaders },
  });
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("X-Frame-Options", "DENY");
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
