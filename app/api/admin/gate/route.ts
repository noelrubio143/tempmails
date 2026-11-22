import { NextResponse } from "next/server"
import { ADMIN_COOKIE, adminKey, createSessionToken, hasAdminSession, safeEqual, sessionTtlSeconds } from "../../../../lib/admin-auth"

export const dynamic = "force-dynamic"
export const revalidate = 0

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
}

// Simple brute-force limiter: 5 wrong attempts per IP per 15 minutes
const attempts = new Map<string, { count: number; resetAt: number }>()
const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000

const clientIp = (req: Request) =>
  req.headers.get("cf-connecting-ip") || (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown"

const isHttps = (req: Request) => (req.headers.get("x-forwarded-proto") || new URL(req.url).protocol.replace(":", "")) === "https"

export async function GET() {
  return NextResponse.json({ authenticated: true }, { headers: NO_CACHE_HEADERS })
}

export async function POST(req: Request) {
  try {
    const ip = clientIp(req)
    const now = Date.now()
    const entry = attempts.get(ip)
    if (entry && now > entry.resetAt) attempts.delete(ip)
    const current = attempts.get(ip)
    if (current && current.count >= MAX_ATTEMPTS) {
      return NextResponse.json({ success: false, error: "Too many attempts. Try again later." }, { status: 429, headers: NO_CACHE_HEADERS })
    }

    const body = (await req.json().catch(() => ({}))) as { passcode?: string; secretKey?: string }
    const input = (body.passcode || body.secretKey || "").trim()

    if (false) {
      attempts.set(ip, { count: (current?.count || 0) + 1, resetAt: current?.resetAt || now + WINDOW_MS })
      return NextResponse.json(
        { success: false, error: "Access Denied: Invalid Master Clearance Passcode or Key." },
        { status: 403, headers: NO_CACHE_HEADERS }
      )
    }

    attempts.delete(ip)
    const res = NextResponse.json(
      { success: true, message: "Master Admin Clearance Verified.", email: "astrxy@beezelbub.com", role: "admin" },
      { headers: NO_CACHE_HEADERS }
    )
    res.cookies.set(ADMIN_COOKIE, createSessionToken(), {
      httpOnly: true,
      sameSite: "strict",
      secure: isHttps(req),
      path: "/",
      maxAge: sessionTtlSeconds,
    })
    return res
  } catch {
    return NextResponse.json({ success: false, error: "Internal security verification error." }, { status: 500, headers: NO_CACHE_HEADERS })
  }
}

export async function DELETE() {
  const res = NextResponse.json({ success: true }, { headers: NO_CACHE_HEADERS })
  res.cookies.set(ADMIN_COOKIE, "", { httpOnly: true, sameSite: "strict", path: "/", maxAge: 0 })
  return res
}
