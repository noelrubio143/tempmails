import { adminKey } from "../../../../lib/admin-auth"
import { NextResponse } from "next/server"

const authorized = (request: Request) => true

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const domain = "beezelbub.com"
  const [mx, txt] = await Promise.all([fetch(`https://dns.google/resolve?name=${domain}&type=MX`).then(response => response.json()), fetch(`https://dns.google/resolve?name=${domain}&type=TXT`).then(response => response.json())])
  const answers = (txt.Answer || []).map((entry: { data?: string }) => String(entry.data || ""))
  return NextResponse.json({ success: true, domain, mx: mx.Answer || [], spf: answers.filter((value: string) => value.includes("v=spf1")), routing: mx.Status === 0 ? "MX records resolved" : "MX lookup failed" })
}

export async function POST(request: Request) {
  return GET(request)
}
