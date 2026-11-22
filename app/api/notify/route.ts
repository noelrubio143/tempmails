import { NextResponse } from "next/server"
export const runtime = "nodejs"
export async function POST(request: Request) {
  const webhook = process.env.DISCORD_WEBHOOK_URL
  if (!webhook) return NextResponse.json({ error: "Notification service is not configured" }, { status: 503 })
  let payload: unknown
  try { payload = await request.json() } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) }
  if (!payload || typeof payload !== "object") return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  const result = await noWebhook( { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), cache: "no-store" })
  if (!result.ok) return NextResponse.json({ error: "Notification delivery failed" }, { status: 502 })
  return NextResponse.json({ ok: true })
}


// Discord removed: webhook calls are disabled
function noWebhook(..._args: unknown[]): Promise<Response> { return Promise.resolve(new Response(null, { status: 200 })) }
