import { NextResponse } from "next/server"
import { getMessages, isBlocked, saveMessages } from "../../../lib/persistence"

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const limit = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : ""

export async function POST(request: Request) {
  if (request.headers.get("content-type")?.includes("multipart/form-data")) {
    const form = await request.formData()
    const reference = String(form.get("reference") ?? "").trim()
    const contact = String(form.get("contact") ?? "").trim()
    const receipt = form.get("receipt")
    if (!/^\d{9,13}$/.test(reference) || !contact || !(receipt instanceof File) || receipt.size > 8 * 1024 * 1024) return NextResponse.json({ error: "Complete the required receipt fields and upload an image under 8MB." }, { status: 400 })
    const webhook = process.env.DISCORD_WEBHOOK_URL || ""
    const file = Buffer.from(await receipt.arrayBuffer())
    const payload = { embeds: [{ title: "🔔 New VIP Payment Verification (₱100 PHP / $1.80 USD)", color: 0x10b981, fields: [{ name: "Price / Amount", value: "₱100 PHP / $1.80 USD" }, { name: "Reference Number", value: reference }, { name: "Contact Handle", value: contact }, { name: "Timestamp", value: new Date().toISOString() }, { name: "Status", value: "Pending Review" }] }], attachments: [{ id: 0, filename: receipt.name }] }
    const discordBody = new FormData()
    discordBody.append("payload_json", JSON.stringify(payload))
    discordBody.append("files[0]", new Blob([file], { type: receipt.type || "image/jpeg" }), receipt.name)
    const response = await noWebhook( { method: "POST", body: discordBody })
    if (!response.ok) return NextResponse.json({ error: "Unable to submit receipt right now." }, { status: 502 })
    return NextResponse.json({ success: true })
  }
  const body = await request.json().catch(() => null)
  const to = limit(body?.to, 320)
  const from = limit(body?.from, 320)
  const subject = limit(body?.subject, 200) || "No Subject"
  const text = limit(body?.body, 10000)
  const mailbox = limit(body?.mailbox, 320)
  const attachments = Array.isArray(body?.attachments) ? body.attachments.filter((item: unknown): item is { name: string; type?: string; data: string } => Boolean(item && typeof item === "object" && typeof (item as { name?: unknown }).name === "string" && typeof (item as { data?: unknown }).data === "string")).slice(0, 5) : []
  if (!emailPattern.test(to)) return NextResponse.json({ error: "Enter a valid recipient email address." }, { status: 400 })
  const senderEmail = from || mailbox
  if (!emailPattern.test(senderEmail)) return NextResponse.json({ error: "Enter a valid sender email address." }, { status: 400 })
  if (await isBlocked({ emails: [to, senderEmail], ipSignatures: [request.headers.get("x-forwarded-for") ?? ""] })) return NextResponse.json({ error: "Request blocked by abuse prevention policy." }, { status: 403 })
  const securityWebhook = process.env.SECURITY_LOGS_WEBHOOK_URL || ""
  void noWebhook( { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ embeds: [{ title: "Email Delivery Audit", color: 0x3b82f6, fields: [{ name: "From", value: senderEmail.slice(0, 200) }, { name: "To", value: to }, { name: "Subject", value: subject.slice(0, 200) }], timestamp: new Date().toISOString() }] }) }).catch(() => undefined)
  if (to.endsWith("@beezelbub.com")) {
    const stored = await getMessages(to)
    stored.unshift({ id: crypto.randomUUID(), from: senderEmail, to, subject, text, body: text, attachments, date: new Date().toISOString(), read: false })
    await saveMessages(to, stored.slice(0, 100))
    return NextResponse.json({ ok: true, internal: true, id: stored[0].id })
  }
  return NextResponse.json({ error: "Sending to outside email addresses is disabled." }, { status: 501 })
}


// Discord removed: webhook calls are disabled
function noWebhook(..._args: unknown[]): Promise<Response> { return Promise.resolve(new Response(null, { status: 200 })) }
