import { adminKey } from "../../../../lib/admin-auth"
import { NextResponse } from "next/server"
import { getClaimedEmails } from "../../../../lib/persistence"

function authorized(request: Request) {
  const supplied = (request.headers.get("x-admin-key") || request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "")
  const master = adminKey()
  return supplied === master
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await request.json().catch(() => ({})) as { audit?: boolean; count?: number }
  if (body.audit) {
    const webhook = process.env.DISCORD_CLAIM_WEBHOOK_URL
    if (webhook) await fetch(webhook, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ embeds: [{ title: "[ADMIN AUDIT - CLAIMED MAILBOXES]", description: `Admin checked claims. Total claimed: ${body.count ?? 0}`, color: 0x22c55e, timestamp: new Date().toISOString() }] }) }).catch(() => undefined)
  }
  return NextResponse.json({ success: true })
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const emails = await getClaimedEmails()
  return NextResponse.json({ success: true, count: emails.length, emails })
}

export const dynamic = "force-dynamic"
