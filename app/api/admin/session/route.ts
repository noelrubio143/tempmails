import { NextResponse } from "next/server"
export const runtime = "nodejs"
export async function POST(request: Request) {
  const expected = process.env.ADMIN_MASTER_KEY
  if (!expected) return NextResponse.json({ error: "Admin auth is not configured" }, { status: 503 })
  let body: { key?: string }
  try { body = await request.json() } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) }
  if (!body.key || body.key.length > 256 || body.key !== expected) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
  const response = NextResponse.json({ success: true, admin: true })
  response.cookies.set("astrxy_admin_session", "authenticated", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 28800 })
  return response
}
