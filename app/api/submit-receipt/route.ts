import { NextResponse } from "next/server"

export const runtime = "nodejs"

const maxReceiptSize = 8 * 1024 * 1024

type ReceiptPayload = {
  refNumber?: unknown
  contactHandle?: unknown
  fileBase64?: unknown
  fileName?: unknown
}

export async function POST(request: Request) {
  try {
    const webhook = process.env.RECEIPT_DISCORD_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL
    if (!webhook) {
      console.error("[v0] Discord receipt webhook is not configured in environment variables.")
      return NextResponse.json({ success: false, error: "Discord Webhook not configured in environment variables." }, { status: 500 })
    }

    const payload = await request.json() as ReceiptPayload
    const refNumber = String(payload.refNumber ?? "").trim()
    const contactHandle = String(payload.contactHandle ?? "").trim()
    const fileBase64 = String(payload.fileBase64 ?? "")
    const requestedFileName = String(payload.fileName ?? "receipt.png")
    const fileName = requestedFileName.replace(/[^a-zA-Z0-9._-]/g, "_") || "receipt.png"

    if (!refNumber) return NextResponse.json({ success: false, error: "Reference Number is required." }, { status: 400 })
    if (!contactHandle) return NextResponse.json({ success: false, error: "Contact Handle is required." }, { status: 400 })
    if (!/^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(fileBase64)) return NextResponse.json({ success: false, error: "An uploaded screenshot image is required." }, { status: 400 })

    const [, encoded] = fileBase64.split(",", 2)
    const bytes = Buffer.from(encoded, "base64")
    if (bytes.length === 0) return NextResponse.json({ success: false, error: "The uploaded screenshot is empty." }, { status: 400 })
    if (bytes.length > maxReceiptSize) return NextResponse.json({ success: false, error: "Screenshot must be smaller than 8MB." }, { status: 400 })

    const mimeType = fileBase64.slice(5, fileBase64.indexOf(";")) || "image/png"
    const discordPayload = {
      embeds: [{
        title: "💳 VIP Pass Payment Receipt",
        color: 0x10b981,
        fields: [
          { name: "Reference Number", value: refNumber, inline: true },
          { name: "Contact Handle", value: contactHandle, inline: true },
          { name: "Timestamp & Amount", value: `${new Date().toISOString()}\n₱100 PHP / $1.80 USD`, inline: false },
        ],
        image: { url: `attachment://${fileName}` },
        footer: { text: "AMBER Temp Mail • VIP Review" },
      }],
      attachments: [{ id: 0, filename: fileName }],
    }
    const body = new FormData()
    body.append("payload_json", JSON.stringify(discordPayload))
    body.append("files[0]", new Blob([bytes], { type: mimeType }), fileName)

    const discordResponse = await fetch(webhook, { method: "POST", body })
    if (!discordResponse.ok) {
      console.error("[v0] Discord rejected receipt submission:", discordResponse.status)
      return NextResponse.json({ success: false, error: "Discord rejected the receipt submission." }, { status: 502 })
    }
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("[v0] Receipt submission failed:", error)
    return NextResponse.json({ success: false, error: "Unable to process receipt submission." }, { status: 500 })
  }
}
