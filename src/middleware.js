// src/middleware.js
import { NextResponse } from "next/server";

export function middleware(req) {
  const token = req.cookies.get("authToken"); // optional — you can later store token here
  const url = req.nextUrl.clone();

  // protect all /discover routes
  if (url.pathname.startsWith("/discover") && !token) {
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/discover/:path*"],
};
