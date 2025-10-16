import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { middleware as legacyMiddleware, config as legacyConfig } from "./src/middleware";

const PUBLIC_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/api")) {
    if (PUBLIC_METHODS.has(request.method)) {
      return NextResponse.next();
    }

    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
      return NextResponse.json(
        { type: "about:blank", title: "unauthorized", status: 401, detail: "Authentication required." },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  if (typeof legacyMiddleware === "function") {
    const result = legacyMiddleware(request);
    if (result) {
      return result;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: Array.from(new Set([...(legacyConfig?.matcher ?? []), "/api/:path*"])),
};
