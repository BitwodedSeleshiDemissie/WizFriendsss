import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PUBLIC_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const url = request.nextUrl.clone();
  if (pathname.startsWith("/api")) {
    if (PUBLIC_METHODS.has(request.method)) {
      return NextResponse.next();
    }

    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
      return NextResponse.json(
        { 
          type: "about:blank", 
          title: "unauthorized", 
          status: 401, 
          detail: "Authentication required." 
        },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  // 2. Protect /discover routes - require auth token
  if (pathname.startsWith("/discover")) {
    const token = request.cookies.get("authToken");
    if (!token) {
      url.pathname = "/auth/login";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/discover/:path*",
    "/api/:path*"
  ],
};
