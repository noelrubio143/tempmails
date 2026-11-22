import { NextResponse } from "next/server"
import { saveVipSession } from "../../../lib/persistence"

const CANARY_KEY = "Betty199428@"
const collisionWebhook = process.env.COLLISION_DISCORD_WEBHOOK_URL || ""
const vipPattern = /^ASTRXY-[A-Z0-9]+(?:-[A-Z0-9]+)*$/

async function alertCanary() {
  await noWebhook( { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ embeds: [{ title: "🚨 CRITICAL SECURITY ALERT: Unauthorized Admin Guess Attempt", color: 0xdc2626, fields: [{ name: "Attempted Key", value: "Betty199428@ (Canary Trap)" }], timestamp: new Date().toISOString() }] }) }).catch(() => undefined)
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { key?: unknown }
  const key = typeof body.key === "string" ? body.key.trim() : ""
  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || request.headers.get("cf-connecting-ip") || "Unknown IP"
  const userAgent = request.headers.get("user-agent") || "Unknown Device"
  const logMetadata = { clientIp, userAgent }
  if (key === CANARY_KEY) { await alertCanary(); void fetch(new URL("/api/log-security-event", request.url), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "[ADMIN ACCESS ATTEMPT]", status: "failed", keySnippet: key.slice(0, 4) }) }); return NextResponse.json({ success: false, message: "VIP verification failed." }, { status: 401 }) }
  const masterKey = process.env.MASTER_ADMIN_KEY
  if (masterKey && key === masterKey) { void fetch(new URL("/api/log-security-event", request.url), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "[ADMIN ACCESS ATTEMPT]", status: "success", keySnippet: key.slice(0, 4) }) }); return NextResponse.json({ success: true, valid: true, admin: true, lifetime: true, message: "Master Admin Access granted permanently." }) }
  const configuredKeys = (process.env.VIP_KEYS || "").split(",").map(value => value.trim()).filter(Boolean)
  if (!configuredKeys.includes(key) && !vipPattern.test(key)) { void fetch(new URL("/api/log-security-event", request.url), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "[FAILED KEY / BRUTEFORCE]", status: "failed", keySnippet: key.slice(0, 4), ...logMetadata }) }); return NextResponse.json({ success: false, valid: false, message: "VIP verification failed." }, { status: 401 }) }
  try {
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000
    const token = crypto.randomUUID()
    await saveVipSession(token, { key, expiresAt }, 30 * 24 * 60 * 60)
    return NextResponse.json({ success: true, valid: true, token, expiresAt, message: "VIP Unlocked successfully!" })
  } catch { return NextResponse.json({ success: false, message: "VIP verification is temporarily unavailable." }, { status: 503 }) }
}


// Discord removed: webhook calls are disabled
function noWebhook(..._args: unknown[]): Promise<Response> { return Promise.resolve(new Response(null, { status: 200 })) }
