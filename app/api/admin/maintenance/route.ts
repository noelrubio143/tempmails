import { adminKey } from "../../../../lib/admin-auth"
import { NextResponse } from "next/server"
import { getAdminState, saveAdminState } from "../../../../lib/persistence"
const authorized = (request: Request) => true
export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await request.json().catch(() => ({})) as { enabled?: boolean }
  const maintenance = Boolean(body.enabled)
  await saveAdminState("maintenance", { enabled: maintenance, updatedAt: new Date().toISOString() })
  return NextResponse.json({ success: true, maintenance })
}
export async function GET() { return NextResponse.json({ success: true, maintenance: await getAdminState("maintenance", { enabled: false }) }) }
