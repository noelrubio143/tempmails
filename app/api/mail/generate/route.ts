import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
const API = "https://api.mail.tm"
const randomPart = () => Math.random().toString(36).slice(2, 12)
const apiHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization", "Content-Type": "application/json" }
export function OPTIONS() { return new NextResponse(null, { status: 204, headers: apiHeaders }) }

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { username?: string; domain?: string }
  try {
    const domainsResponse = await fetch(`${API}/domains?page=1`, { cache: "no-store" })
    if (!domainsResponse.ok) throw new Error("Mail service domains unavailable")
    const domains = await domainsResponse.json() as { "hydra:member"?: Array<{ domain: string }> }
    const availableDomains = domains["hydra:member"]?.map(item => item.domain) ?? []
    const domain = body.domain && availableDomains.includes(body.domain) ? body.domain : availableDomains[0]
    if (!domain) throw new Error("No Mail.tm domain available")
    const username = body.username?.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 32)
    const address = `${username || randomPart()}@${domain}`
    const password = `${randomPart()}-${randomPart()}!`
    const accountResponse = await fetch(`${API}/accounts`, { method: "POST", headers: { "Content-Type": "application/ld+json" }, body: JSON.stringify({ address, password }) })
    if (!accountResponse.ok) throw new Error("Unable to create mailbox")
    const tokenResponse = await fetch(`${API}/token`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ address, password }) })
    if (!tokenResponse.ok) throw new Error("Unable to authenticate mailbox")
    const tokenData = await tokenResponse.json() as { token: string }
    return NextResponse.json({ provider: "mail.tm", address, password, token: tokenData.token }, { headers: apiHeaders })
  } catch (error) {
    const login = randomPart()
    const domain = "1secmail.com"
    return NextResponse.json({ provider: "1secmail", address: `${login}@${domain}`, password: "", token: "", fallbackLogin: login, fallbackDomain: domain, warning: error instanceof Error ? error.message : "Mail.tm unavailable" })
  }
}
