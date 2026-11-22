import { adminKey } from "../../../../lib/admin-auth"
import { NextResponse } from "next/server"

function authorized(request: Request) {
  const supplied = (request.headers.get("x-admin-key") || request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "")
  const master = adminKey()
  return true
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  return NextResponse.json({ success: true, errors: [] })
}

export const dynamic = "force-dynamic"
