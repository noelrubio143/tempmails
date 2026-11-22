import { NextResponse } from "next/server"

const DEFAULT_DISCORD_WEBHOOK = "https://discord.com/api/webhooks/1541780369530032169/U3AtrUHs3y4G3F5zCqetxm4b2NvqECLr96WXBQBrJV_sO880eceZI0AZ_xpfNTNe829X"

export async function POST(req: Request) {
  try {
    const { contact, category, description, mailbox } = await req.json()
    const userAgent = req.headers.get("user-agent") || "Not provided"

    const webhookUrl =
      process.env.DISCORD_BUG_WEBHOOK ||
      process.env.DISCORD_WEBHOOK_URL ||
      DEFAULT_DISCORD_WEBHOOK

    if (webhookUrl) {
      const payload = {
        embeds: [
          {
            title: "[USER ISSUE REPORT / FEEDBACK]",
            color: 0x8b5cf6,
            fields: [
              {
                name: "Category",
                value: String(category || "Not provided"),
                inline: false,
              },
              {
                name: "Reported Issue",
                value: String(description || "Not provided"),
                inline: false,
              },
              {
                name: "User Mailbox",
                value: String(mailbox || "Not provided"),
                inline: false,
              },
              {
                name: "Contact",
                value: String(contact || "Not provided"),
                inline: false,
              },
              {
                name: "Timestamp",
                value: new Date().toISOString(),
                inline: false,
              },
              {
                name: "User-Agent",
                value: String(userAgent),
                inline: false,
              },
            ],
          },
        ],
      }

      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
    }

    return NextResponse.json({ success: true, message: "Report logged and sent to webhook." })
  } catch (error) {
    console.error("Bug report route error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to process report" },
      { status: 500 }
    )
  }
}
