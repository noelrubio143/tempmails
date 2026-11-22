import { adminKey } from "../../../../lib/admin-auth"
import { NextResponse } from "next/server"
import { deleteMailbox, deleteMessages } from "../../../../lib/persistence"

const authorized = (request: Request, body?: Record<string, unknown>) => {
  const incomingKey = request.headers.get("x-admin-key") || request.headers.get("authorization") || (typeof body?.adminKey === "string" ? body.adminKey : "")
  const supplied = incomingKey.replace(/^Bearer\s+/i, "")
  const master = adminKey()
  return supplied === master
}

const normalize = (value: unknown) => {
  const raw = typeof value === "string" ? value : ""
  const match = raw.match(/<([^>]+)>/)
  return (match ? match[1] : raw).toLowerCase().trim()
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as Record<string, unknown>
  if (!authorized(request, body)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const email = normalize(body.targetEmail)
  if (!email) return NextResponse.json({ error: "targetEmail is required" }, { status: 400 })
  await deleteMailbox(email)
  await deleteMessages(email)
  return NextResponse.json({ success: true, mailbox: email })
}

export const dynamic = "force-dynamic"
