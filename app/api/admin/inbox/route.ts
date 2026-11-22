import { adminKey } from "../../../../lib/admin-auth"
import { NextResponse } from "next/server"
import { getMessages } from "../../../../lib/persistence"

const isAuthorized = (request: Request, body?: Record<string, unknown>) => {
  const incomingKey = request.headers.get("x-admin-key") || request.headers.get("authorization") || (typeof body?.adminKey === "string" ? body.adminKey : "")
  const supplied = incomingKey.replace(/^Bearer\s+/i, "")
  const master = adminKey()
  return supplied === master
}

const normalizeEmail = (value: unknown) => {
  const raw = typeof value === "string" ? value : ""
  const match = raw.match(/<([^>]+)>/)
  return (match ? match[1] : raw).toLowerCase().trim()
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const targetEmail = normalizeEmail(new URL(request.url).searchParams.get("targetEmail"))
  if (!targetEmail) return NextResponse.json({ error: "targetEmail is required" }, { status: 400 })
  return NextResponse.json({ success: true, mailbox: targetEmail, messages: await getMessages(targetEmail) })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as Record<string, unknown>
  if (!isAuthorized(request, body)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const targetEmail = normalizeEmail(body.targetEmail)
  if (!targetEmail) return NextResponse.json({ error: "targetEmail is required" }, { status: 400 })
  return NextResponse.json({ success: true, mailbox: targetEmail, messages: await getMessages(targetEmail) })
}

export const dynamic = "force-dynamic"
