import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get("action") || "get_email_address"
  const sidToken = searchParams.get("sid_token") || ""
  const emailUser = searchParams.get("email_user") || ""
  const emailId = searchParams.get("email_id") || ""
  const domain = searchParams.get("domain") || "westcast-systems.com"
  const allowedActions = new Set(["get_email_address", "check_email", "fetch_email"])
  if (!allowedActions.has(action)) return NextResponse.json({ error: "Unsupported GuerrillaMail action" }, { status: 400 })

  const url = new URL("https://api.guerrillamail.com/ajax.php")
  url.searchParams.set("f", action)
  url.searchParams.set("lang", "en")
  if (sidToken) url.searchParams.set("sid_token", sidToken)
  if (emailUser) url.searchParams.set("email_user", emailUser)
  if (domain) url.searchParams.set("domain", domain)
  if (emailId) url.searchParams.set("email_id", emailId)
  if (action === "check_email") url.searchParams.set("seq", "0")

  try {
    const response = await fetch(url, { headers: { "User-Agent": "AstrxyMail/2.0" }, cache: "no-store" })
    const data = await response.json()
    return NextResponse.json(data, { status: response.ok ? 200 : response.status })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "GuerrillaMail request failed" }, { status: 500 })
  }
}
