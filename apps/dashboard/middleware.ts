import { NextRequest, NextResponse } from "next/server";

const AUTH_COOKIE = "tradeos_auth";

function isPublicPath(pathname: string) {
  return (
    pathname === "/login" ||
    pathname === "/favicon.svg" ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/auth/")
  );
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function isAuthenticated(request: NextRequest) {
  const password = process.env.Password;
  if (!password) return false;

  const expected = await sha256(password);
  return request.cookies.get(AUTH_COOKIE)?.value === expected;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) return NextResponse.next();
  if (await isAuthenticated(request)) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!.*\\..*).*)", "/api/:path*"],
};
