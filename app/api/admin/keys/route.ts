import { adminKey } from "../../../../lib/admin-auth"
import { NextResponse } from "next/server"
import { getActiveSecretKeys } from "../../../../lib/persistence"

const authorized = (request: Request) => {
  const incoming = request.headers.get("x-admin-key") || request.headers.get("authorization") || ""
  const key = incoming.replace(/^Bearer\s+/i, "")
  return key === (adminKey())
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const keys = await getActiveSecretKeys()
  return NextResponse.json({ success: true, activeVipKeys: keys.map((key, index) => ({ key, status: "available", index: index + 1 })) })
}
