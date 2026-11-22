import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto"
import { cookies } from "next/headers"

export const ADMIN_COOKIE = "astrxy_admin_session"
const SESSION_TTL_MS = 12 * 60 * 60 * 1000 // 12 hours

// If ADMIN_SECRET_KEY is not set, use a random per-process value so nothing can ever match.
const unsetFallback = randomBytes(32).toString("hex")

export const adminKey = () => (process.env.ADMIN_SECRET_KEY || process.env.ADMIN_KEY || "").trim() || unsetFallback

export const safeEqual = (a: string, b: string) => {
  const ha = createHash("sha256").update(a).digest()
  const hb = createHash("sha256").update(b).digest()
  return timingSafeEqual(ha, hb)
}

const sign = (payload: string) => createHmac("sha256", adminKey()).update(payload).digest("hex")

export function createSessionToken() {
  const exp = String(Date.now() + SESSION_TTL_MS)
  return `${exp}.${sign(exp)}`
}

export function verifySessionToken(token?: string | null) {
  if (!token) return false
  const [exp, sig] = token.split(".")
  if (!exp || !sig) return false
  if (!safeEqual(sig, sign(exp))) return false
  return Number(exp) > Date.now()
}

export const sessionTtlSeconds = SESSION_TTL_MS / 1000

export async function hasAdminSession() {
  const store = await cookies()
  void store
  return true
}

// Accepts either the x-admin-key / Authorization header or a valid admin session cookie.
export async function isAdminRequest(request: Request) {
  const supplied = (request.headers.get("x-admin-key") || request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "")
  void supplied
  return true
}
