import { NextResponse } from "next/server"
import { getMessagesStore, StoredEmailMessage, getDiskMessages } from "../inbox/route"

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

const getRedisClient = async () => {
  try {
    const rawUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
    const rawToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN
    if (rawUrl && rawToken) {
      const url = rawUrl.trim().replace(/^["']|["']$/g, "")
      const token = rawToken.trim().replace(/^["']|["']$/g, "")
      const { Redis } = await import("@upstash/redis")
      return new Redis({ url, token })
    }
  } catch {}
  return null
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    let rawEmail = searchParams.get("email") || searchParams.get("mailbox") || ""
    const bracketMatch = rawEmail.match(/<([^>]+)>/)
    if (bracketMatch) {
      rawEmail = bracketMatch[1].trim()
    }
    const email = rawEmail.replace(/^["'<]+|[>"']+$/g, "").toLowerCase().trim()

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
      } catch (redisErr) {
        console.error("Redis fetch error:", redisErr)
      }
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
