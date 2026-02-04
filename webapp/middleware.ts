import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js middleware. Currently allows all routes and logs access.
 * Later: block /app for unauthenticated users and redirect to /.
 */
export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Log access (dev only; remove or gate in production)
  if (process.env.NODE_ENV === "development") {
    console.log("[Lethe] Access:", path);
  }

  // Future: check auth (e.g. cookie/session) and redirect /app -> / if not authenticated
  // if (path.startsWith("/app") && !request.cookies.get("auth")) {
  //   return NextResponse.redirect(new URL("/", request.url));
  // }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/app", "/app/:path*"],
};
