import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Staging/production gate notes:
 * - Cloudflare Access should protect /curate at the edge (preferred).
 * - This middleware enforces APP_ENV=production + EXTRACT_ENABLED≠true messaging only.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const appEnv = process.env.APP_ENV ?? "staging";
  const extractEnabled = process.env.EXTRACT_ENABLED === "true";

  if (appEnv === "production" && extractEnabled && pathname.startsWith("/curate")) {
    // Hard stop: do not allow Extract-enabled production until issue resolved.
    return new NextResponse("Extract disabled in production until specification is approved", {
      status: 503,
    });
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
