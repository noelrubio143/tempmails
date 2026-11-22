import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
const MAIL_TM = "https://api.mail.tm"
const ONE_SECOND_MAIL = "https://www.1secmail.com/api/v1/"
const otpPattern = /(?:code|pin|verification|code is|is:?)\s*([0-9]{4,8})/i
const genericPattern = /\b([0-9A-Z]{4,8}|[0-9]{4,8})\b/

type MailMessage = { id: string; from?: { address?: string; name?: string }; subject?: string; intro?: string; createdAt?: string; text?: string; html?: string | string[] }
const extractOtp = (value: string) => value.match(otpPattern)?.[1] ?? value.match(genericPattern)?.[1] ?? null
const textFromHtml = (value: string) => value.replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()

async function mailTm(token: string) {
  const response = await fetch(`${MAIL_TM}/messages`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
  if (!response.ok) throw new Error("Mail.tm unavailable")
  const list = await response.json() as { "hydra:member"?: MailMessage[] }
  const messages = await Promise.all((list["hydra:member"] ?? []).slice(0, 25).map(async item => {
    const detailResponse = await fetch(`${MAIL_TM}/messages/${item.id}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
    const detail = detailResponse.ok ? await detailResponse.json() as MailMessage : item
    const content = `${detail.text ?? ""} ${Array.isArray(detail.html) ? detail.html.join(" ") : detail.html ?? ""}`
    const preview = textFromHtml(detail.text || (Array.isArray(detail.html) ? detail.html.join(" ") : detail.html || detail.intro || ""))
    return { id: detail.id, sender: detail.from?.address || detail.from?.name || "Unknown sender", subject: detail.subject || "No subject", preview: preview.slice(0, 500), time: detail.createdAt || new Date().toISOString(), otp: extractOtp(content), provider: "mail.tm" }
  }))
  return messages
}

async function oneSecMail(login: string, domain: string) {
  const response = await fetch(`${ONE_SECOND_MAIL}?action=getMessages&login=${encodeURIComponent(login)}&domain=${encodeURIComponent(domain)}`, { cache: "no-store" })
  if (!response.ok) throw new Error("Fallback mailbox unavailable")
  const list = await response.json() as Array<{ id: number; from: string; subject: string; date: string }>
  return Promise.all(list.map(async item => ({ id: String(item.id), sender: item.from, subject: item.subject, preview: item.subject, time: item.date, otp: null, provider: "1secmail" })))
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { token?: string; fallbackLogin?: string; fallbackDomain?: string } | null
  try {
    if (!body?.token) throw new Error("Missing mailbox token")
    return NextResponse.json({ provider: "mail.tm", messages: await mailTm(body.token) })
  } catch {
    if (body?.fallbackLogin && body.fallbackDomain) {
      try { return NextResponse.json({ provider: "1secmail", messages: await oneSecMail(body.fallbackLogin, body.fallbackDomain) }) } catch { /* return below */ }
    }
    return NextResponse.json({ provider: "mail.tm", messages: [] }, { status: 200 })
  }
}
