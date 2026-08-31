import { NextRequest, NextResponse } from "next/server";

const AUTH_COOKIE = "tradeos_auth";

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function POST(request: NextRequest) {
  const configuredPassword = process.env.Password;

  if (!configuredPassword) {
    return NextResponse.json({ error: "Password env var is not configured." }, { status: 500 });
  }

  const body = (await request.json().catch(() => null)) as { password?: string } | null;

  if (body?.password !== configuredPassword) {
    return NextResponse.json({ error: "Invalid password." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE, await sha256(configuredPassword), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}
