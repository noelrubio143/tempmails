import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import os from "os"

export const dynamic = "force-dynamic"
export const revalidate = 0

interface ClaimedEntry {
  email: string
  claimedAt: number
  keyMasked?: string
  key?: string
}

const CLAIMS_FILE = path.join(os.tmpdir(), "ast_claimed_emails_v2.json")
const MESSAGES_FILE = path.join(os.tmpdir(), "ast_inbox_messages_v2.json")

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
  "Pragma": "no-cache",
  "Expires": "0",
}

const getRedisClient = async (): Promise<any> => null // Upstash removed

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { key?: string; email?: string }
    const rawKey = (body.key || body.email || "").trim()

    if (!rawKey) {
      return NextResponse.json(
        { success: false, error: "Enter a Secret Key or PIN to restore." },
        { status: 400, headers: NO_CACHE_HEADERS }
      )
    }

    const lowerKey = rawKey.toLowerCase()
    const redis = await getRedisClient()
    let foundEmail: string | null = null

    // 1. Direct email address passed in restore input
    if (lowerKey.includes("@")) {
      foundEmail = lowerKey
    }

    // 2. Check Redis for claimed email or key mapping
    if (!foundEmail && redis) {
      try {
        // Direct key-to-email mapping
        const mapped = (await redis.get(`ast_key_email:${lowerKey}`)) as string | null
        if (mapped) foundEmail = mapped.toLowerCase()

        // Check claimed emails hash
        if (!foundEmail) {
          const allClaims = (await redis.hgetall("ast_claimed_emails")) as Record<string, string | ClaimedEntry> | null
          if (allClaims && typeof allClaims === "object") {
            for (const [em, val] of Object.entries(allClaims)) {
              try {
                const parsed = typeof val === "string" ? JSON.parse(val) : (val as ClaimedEntry)
                if (parsed?.key && parsed.key.toLowerCase() === lowerKey) {
                  foundEmail = em.toLowerCase()
                  break
                }
              } catch {}
            }
          }
        }
      } catch {}
    }

    // 3. Check local disk claims
    if (!foundEmail && fs.existsSync(CLAIMS_FILE)) {
      try {
        const content = fs.readFileSync(CLAIMS_FILE, "utf-8")
        const list = JSON.parse(content) as ClaimedEntry[]
        if (Array.isArray(list)) {
          for (const item of list) {
            if (item.key && item.key.toLowerCase() === lowerKey) {
              foundEmail = item.email.toLowerCase()
              break
            }
          }
        }
      } catch {}
    }

    // 4. If key matches local pattern like ast-... or local-..., allow recovery
    if (!foundEmail && (lowerKey.startsWith("ast-") || lowerKey.startsWith("local-") || lowerKey.startsWith("pin-"))) {
      // Key is a recognized format
      foundEmail = `recovered_${lowerKey.slice(0, 10).replace(/[^a-z0-9]/g, "")}@beezelbub.com`
    }

    if (!foundEmail) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid restore key",
          message: "No mailbox found for this key. Check the PIN in your Saved Vault.",
        },
        { status: 404, headers: NO_CACHE_HEADERS }
      )
    }

    // Fetch messages for this mailbox
    let messageList: any[] = []
    if (redis) {
      try {
        const [r1, r2] = await Promise.all([
          redis.lrange(`ast_messages:${foundEmail}`, 0, 50) as Promise<any[] | null>,
          redis.lrange(`messages:${foundEmail}`, 0, 50) as Promise<any[] | null>,
        ])
        const combined = [...(r1 || []), ...(r2 || [])]
        const seen = new Set<string>()
        for (const item of combined) {
          try {
            const parsed = typeof item === "string" ? JSON.parse(item) : item
            if (parsed && parsed.id && !seen.has(parsed.id)) {
              seen.add(parsed.id)
              messageList.push(parsed)
            }
          } catch {}
        }
      } catch {}
    }

    if (messageList.length === 0 && fs.existsSync(MESSAGES_FILE)) {
      try {
        const content = fs.readFileSync(MESSAGES_FILE, "utf-8")
        const parsed = JSON.parse(content) as Record<string, any[]>
        if (parsed && parsed[foundEmail]) {
          messageList = parsed[foundEmail]
        }
      } catch {}
    }

    return NextResponse.json(
      {
        success: true,
        email: foundEmail,
        mailbox: {
          email: foundEmail,
          secretKey: rawKey,
        },
        messages: messageList,
      },
      { headers: NO_CACHE_HEADERS }
    )
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Restore error" },
      { status: 500, headers: NO_CACHE_HEADERS }
    )
  }
}
