import { NextResponse } from "next/server"
import { getMessagesStore, StoredEmailMessage, getDiskMessages, saveDiskMessage, deleteDiskMessages } from "../inbox/route"

export const dynamic = "force-dynamic"
export const revalidate = 0

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
  "Pragma": "no-cache",
  "Expires": "0",
  "Surrogate-Control": "no-store",
}

const getRedisClient = async (): Promise<any> => null // Upstash removed

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const rawEmail = searchParams.get("email") || searchParams.get("mailbox") || ""
    const email = rawEmail.toLowerCase().trim()

    if (!email) {
      return NextResponse.json({ success: false, messages: [], error: "Email query required" }, { status: 400, headers: NO_CACHE_HEADERS })
    }

    const msgStore = getMessagesStore()
    const memoryMsgs = msgStore.get(email) || []
    const diskMsgs = getDiskMessages(email)
    const redis = await getRedisClient()

    let combined: StoredEmailMessage[] = []
    const seen = new Set<string>()

    const addItem = (m: StoredEmailMessage) => {
      if (m && m.id && !seen.has(m.id)) {
        seen.add(m.id)
        combined.push(m)
      }
    }

    for (const m of diskMsgs) addItem(m)
    for (const m of memoryMsgs) addItem(m)

    if (redis) {
      try {
        const [r0, r1, r2] = await Promise.all([
          redis.lrange(`inbox:${email}`, 0, 50) as Promise<Array<string | StoredEmailMessage> | null>,
          redis.lrange(`ast_messages:${email}`, 0, 50) as Promise<Array<string | StoredEmailMessage> | null>,
          redis.lrange(`messages:${email}`, 0, 50) as Promise<Array<string | StoredEmailMessage> | null>,
        ])

        const addItems = (items: Array<string | StoredEmailMessage> | null) => {
          if (!Array.isArray(items)) return
          for (const item of items) {
            try {
              const parsed = typeof item === "string" ? JSON.parse(item) : item
              if (parsed && parsed.id) addItem(parsed)
            } catch {}
          }
        }

        addItems(r0)
        addItems(r1)
        addItems(r2)
      } catch {}
    }

    combined.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))

    return NextResponse.json(
      {
        success: true,
        email,
        total: combined.length,
        messages: combined,
      },
      { headers: NO_CACHE_HEADERS }
    )
  } catch (error) {
    return NextResponse.json(
      { success: false, messages: [], error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500, headers: NO_CACHE_HEADERS }
    )
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      to?: string
      from?: string
      subject?: string
      body?: string
      html?: string
      attachments?: unknown[]
    }

    const recipient = (body.to || "").toLowerCase().trim()
    if (!recipient) {
      return NextResponse.json({ success: false, error: "Recipient email (to) required" }, { status: 400, headers: NO_CACHE_HEADERS })
    }

    const now = Date.now()
    const rawFrom = body.from || "Inbound Service"
    let cleanSender = rawFrom
    let senderName = rawFrom
    const senderMatch = rawFrom.match(/^"?([^"<]+)"?\s*<([^>]+)>$/)
    if (senderMatch) {
      senderName = senderMatch[1].trim()
      cleanSender = senderMatch[2].trim()
    } else if (rawFrom.includes("@")) {
      const atIdx = rawFrom.indexOf("@")
      senderName = rawFrom.slice(0, atIdx)
    }

    const messageRecord: StoredEmailMessage = {
      id: `msg_${now}_${Math.random().toString(36).slice(2, 7)}`,
      to: recipient,
      recipient: recipient,
      from: cleanSender,
      sender: cleanSender,
      senderName: senderName,
      subject: body.subject || "(No Subject)",
      body: body.body || "",
      html: body.html || (body.body?.includes("<html") ? body.body : undefined),
      date: new Date(now).toISOString(),
      time: new Date(now).toISOString(),
      timestamp: now,
      attachments: Array.isArray(body.attachments) ? body.attachments : undefined,
    }

    const msgStore = getMessagesStore()
    const existing = msgStore.get(recipient) || []
    msgStore.set(recipient, [messageRecord, ...existing].slice(0, 50))
    saveDiskMessage(recipient, messageRecord)

    const redis = await getRedisClient()
    if (redis) {
      try {
        await Promise.all([
          redis.lpush(`ast_messages:${recipient}`, JSON.stringify(messageRecord)),
          redis.lpush(`messages:${recipient}`, JSON.stringify(messageRecord)),
          redis.set(`ast_latest_msg:${recipient}`, JSON.stringify(messageRecord)),
          redis.incr("ast_stat_messages_received"),
        ])
      } catch {}
    }

    return NextResponse.json(
      {
        success: true,
        status: "delivered",
        messageId: messageRecord.id,
        to: recipient,
        subject: messageRecord.subject,
      },
      { headers: NO_CACHE_HEADERS }
    )
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500, headers: NO_CACHE_HEADERS }
    )
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    const rawMailbox = searchParams.get("mailbox") || searchParams.get("email") || ""
    const mailbox = rawMailbox.toLowerCase().trim()

    if (!mailbox) {
      return NextResponse.json({ success: false, error: "Mailbox required" }, { status: 400, headers: NO_CACHE_HEADERS })
    }

    const msgStore = getMessagesStore()
    const existing = msgStore.get(mailbox) || []

    deleteDiskMessages(mailbox, id || undefined)

    if (id) {
      const filtered = existing.filter((m) => m.id !== id)
      msgStore.set(mailbox, filtered)
    } else {
      msgStore.set(mailbox, [])
    }

    const redis = await getRedisClient()
    if (redis) {
      try {
        if (!id) {
          await Promise.all([
            redis.del(`ast_messages:${mailbox}`),
            redis.del(`messages:${mailbox}`),
            redis.del(`ast_latest_msg:${mailbox}`),
          ])
        }
      } catch {}
    }

    return NextResponse.json({ success: true, deleted: true, id: id || "all", mailbox }, { headers: NO_CACHE_HEADERS })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500, headers: NO_CACHE_HEADERS }
    )
  }
}
