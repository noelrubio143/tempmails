import { NextRequest, NextResponse } from "next/server"

const FALLBACK_WEBHOOK = ""

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null) as { type?: string; status?: string; keySnippet?: string; details?: string; clientIp?: string; userAgent?: string } | null
  if (!payload?.type) return NextResponse.json({ success: false, error: "Security event type is required." }, { status: 400 })
  const webhook = process.env.SECURITY_LOGS_WEBHOOK_URL || FALLBACK_WEBHOOK
  const forwarded = typeof payload.clientIp === "string" ? payload.clientIp : request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || request.headers.get("cf-connecting-ip") || "Unknown IP"
  const userAgent = typeof payload.userAgent === "string" ? payload.userAgent : request.headers.get("user-agent") || "Unknown Device"
  const failed = payload.status === "failed" || payload.type.toLowerCase().includes("failed") || payload.type.toLowerCase().includes("collision")
  const color = failed ? 0xef4444 : payload.type.toLowerCase().includes("collision") ? 0xf59e0b : 0x22c55e
  await noWebhook( { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ embeds: [{ title: payload.type, color, fields: [{ name: "Status", value: payload.status || "logged" }, { name: "Key", value: payload.keySnippet || "redacted" }, { name: "Client IP", value: forwarded }, { name: "User Agent", value: userAgent.slice(0, 500) }, ...(payload.details ? [{ name: "Details", value: payload.details.slice(0, 1000) }] : [])], timestamp: new Date().toISOString() }] }) }).catch(() => undefined)
  return NextResponse.json({ success: true })
}


// Discord removed: webhook calls are disabled
function noWebhook(..._args: unknown[]): Promise<Response> { return Promise.resolve(new Response(null, { status: 200 })) }
