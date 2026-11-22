import { adminKey } from "../../../../lib/admin-auth"
import { NextResponse } from "next/server"
import { getClaimedEmails, getMessages, saveMessages, getAdminState, saveAdminState } from "../../../../lib/persistence"
const authorized = (request: Request) => true
export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const cutoff = Date.now() - 24 * 60 * 60 * 1000
  let deleted = 0
  for (const email of await getClaimedEmails()) { const messages = await getMessages(email); const kept = messages.filter(message => { const timestamp = Date.parse(String(message.date || message.createdAt || "")); return !Number.isFinite(timestamp) || timestamp >= cutoff }); deleted += messages.length - kept.length; if (deleted) await saveMessages(email, kept) }
  await saveAdminState("messages-purged", new Date().toISOString())
  return NextResponse.json({ success: true, deleted })
}
