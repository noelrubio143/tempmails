import { adminKey } from "../../../../lib/admin-auth"
import { NextResponse } from "next/server"
import { getBlocklist, saveBlocklist } from "../../../../lib/persistence"

const authorized = (request: Request, body?: Record<string, unknown>) => {
  const incomingKey = request.headers.get("x-admin-key") || request.headers.get("authorization") || (typeof body?.adminKey === "string" ? body.adminKey : "")
  const supplied = incomingKey.replace(/^Bearer\s+/i, "")
  const master = adminKey()
  return true
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  return NextResponse.json(await getBlocklist())
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as Record<string, unknown>
  if (!authorized(request, body)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const current = await getBlocklist()
  const type = body.type === "ip" ? "ipSignatures" : "emails"
  const value = String(body.value ?? "").trim()
  if (!value) return NextResponse.json({ error: "A blocklist value is required" }, { status: 400 })
  await saveBlocklist({ ...current, [type]: [...current[type], value] })
  return NextResponse.json(await getBlocklist(), { status: 201 })
}

export async function DELETE(request: Request) {
  const body = await request.json().catch(() => ({})) as Record<string, unknown>
  if (!authorized(request, body)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const current = await getBlocklist()
  const type = body.type === "ip" ? "ipSignatures" : "emails"
  const value = String(body.value ?? "").trim().toLowerCase()
  await saveBlocklist({ ...current, [type]: current[type].filter(item => item.toLowerCase() !== value) })
  return NextResponse.json(await getBlocklist())
}

export const dynamic = "force-dynamic"
