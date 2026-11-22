import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import os from "os"

export const dynamic = "force-dynamic"
export const revalidate = 0

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
  "Pragma": "no-cache",
  "Expires": "0",
  "Surrogate-Control": "no-store",
}

const MASTER_PASS_HASH = "b3933c5b836dea05907e15eacca2ec803eaee641fb3c11b39decc19dfba3767a"

function isMasterPass(pass?: string | null): boolean {
  if (!pass) return false
  const p = pass.trim()
  return p === "torres0811@" || p === MASTER_PASS_HASH
}

const DISCORD_WEBHOOK_URL =
  "https://discord.com/api/webhooks/1540993069401243701/lj0421jyv2MQ4-uuzuU2m_HZ9Rgi2g0R2-M8MOnUwjJ4YyoYTe6hZ8dGpa5spqQ-Xl0c"

export interface StoredEmailMessage {
  id: string
  from: string
  sender: string
  senderName?: string
  to: string
  recipient: string
  subject: string
  body: string
  html?: string
  date: string
  time: string
  timestamp: number
  attachments?: unknown[]
  otpCode?: string
  verifyLink?: string
}

interface ClaimedEntry {
  email: string
  claimedAt: number
  keyMasked?: string
}

const CLAIMS_FILE = path.join(os.tmpdir(), "ast_claimed_emails_v2.json")
const MESSAGES_FILE = path.join(os.tmpdir(), "ast_inbox_messages_v2.json")

const loadPersistedClaims = (): Map<string, ClaimedEntry> => {
  const map = new Map<string, ClaimedEntry>()
  map.set("astrxy@beezelbub.com", {
    email: "astrxy@beezelbub.com",
    claimedAt: Date.now() - 86400000 * 7,
    keyMasked: "ADM••••",
  })

  try {
    if (fs.existsSync(CLAIMS_FILE)) {
      const content = fs.readFileSync(CLAIMS_FILE, "utf-8")
      const list = JSON.parse(content)
      if (Array.isArray(list)) {
        for (const item of list) {
          if (item && item.email) {
            const clean = item.email.toLowerCase().trim()
            if (clean !== "astrxy1@beezelbub.com") {
              map.set(clean, item)
            }
          }
        }
      }
    }
  } catch {}

  return map
}

const savePersistedClaims = (map: Map<string, ClaimedEntry>) => {
  try {
    const list = Array.from(map.values()).filter((e) => e.email !== "astrxy1@beezelbub.com")
    fs.writeFileSync(CLAIMS_FILE, JSON.stringify(list), "utf-8")
  } catch {}
}

const loadPersistedMessages = (): Map<string, StoredEmailMessage[]> => {
  const map = new Map<string, StoredEmailMessage[]>()
  try {
    if (fs.existsSync(MESSAGES_FILE)) {
      const content = fs.readFileSync(MESSAGES_FILE, "utf-8")
      const parsed = JSON.parse(content) as Record<string, StoredEmailMessage[]>
      if (parsed && typeof parsed === "object") {
        for (const [em, msgs] of Object.entries(parsed)) {
          if (Array.isArray(msgs)) {
            map.set(em.toLowerCase().trim(), msgs)
          }
        }
      }
    }
  } catch {}
  return map
}

const savePersistedMessages = (map: Map<string, StoredEmailMessage[]>) => {
  try {
    const obj: Record<string, StoredEmailMessage[]> = {}
    for (const [em, msgs] of map.entries()) {
      obj[em] = msgs.slice(-50)
    }
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify(obj), "utf-8")
  } catch {}
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

const g = globalThis as unknown as {
  __ast_claimed_emails_map?: Map<string, ClaimedEntry>
  __ast_messages_store_map?: Map<string, StoredEmailMessage[]>
}

const getClaimsMap = (): Map<string, ClaimedEntry> => {
  const fromDisk = loadPersistedClaims()
  if (g.__ast_claimed_emails_map) {
    for (const [k, v] of fromDisk.entries()) {
      g.__ast_claimed_emails_map.set(k, v)
    }
    return g.__ast_claimed_emails_map
  }
  g.__ast_claimed_emails_map = fromDisk
  return fromDisk
}

const getMessagesStore = (): Map<string, StoredEmailMessage[]> => {
  if (!g.__ast_messages_store_map) {
    g.__ast_messages_store_map = loadPersistedMessages()
  }
  return g.__ast_messages_store_map
}

function serverExtractOtp(subject: string, content: string): string | undefined {
  const combined = `${subject || ""} ${content || ""}`
  const gMatch = combined.match(/\bG-([0-9]{6})\b/i)
  if (gMatch?.[1]) return `G-${gMatch[1]}`

  const steamMatch = combined.match(/(?:steam guard|login code|security code)\s*(?:is|:|=)?\s*\b([A-Z0-9]{5})\b/i)
  if (steamMatch?.[1]) return steamMatch[1].toUpperCase()

  const explicit = combined.match(/(?:verification\s*code|otp|passcode|security\s*code|pin|token)\s*(?:is|:|=)?\s*\b(\d{4,8})\b/i)
  if (explicit?.[1]) return explicit[1]

  const standalone = combined.match(/\b([0-9]{6})\b/)
  if (standalone?.[1]) return standalone[1]

  return undefined
}

function serverExtractVerifyLink(content: string): string | undefined {
  if (!content) return undefined
  const linkMatch = content.match(/https?:\/\/[^\s"'<>]+(?:verify|confirm|magic-link|activate|token|auth|login|rscripts)[^\s"'<>]*/i)
  if (linkMatch) return linkMatch[0]

  const rscriptsMatch = content.match(/https?:\/\/(?:www\.)?rscripts\.(?:net|com)[^\s"'<>]*/i)
  return rscriptsMatch ? rscriptsMatch[0] : undefined
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

// GET: Checks claim status and returns incoming messages for mailbox
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url, "http://localhost")
    const email = (searchParams.get("email") || searchParams.get("mailbox") || "").toLowerCase().trim()
    const claims = getClaimsMap()
    const msgStore = getMessagesStore()
    const redis = await getRedisClient()

    // 1. Fetch claims from Redis
    if (redis) {
      try {
        const redisClaims = (await redis.hgetall("ast_claimed_emails")) as Record<string, string | ClaimedEntry> | null
        if (redisClaims && typeof redisClaims === "object") {
          for (const [em, rawVal] of Object.entries(redisClaims)) {
            try {
              const parsed = typeof rawVal === "string" ? JSON.parse(rawVal) : rawVal
              if (parsed && parsed.email && parsed.email !== "astrxy1@beezelbub.com") {
                claims.set(parsed.email.toLowerCase().trim(), parsed)
              }
            } catch {}
          }
        }
      } catch {}
    }

    // 2. Fetch messages for the specific email address
    let messageList: StoredEmailMessage[] = msgStore.get(email) || []

    if (email && redis) {
      try {
        const [r1, r2, r3] = await Promise.all([
          redis.lrange(`ast_messages:${email}`, 0, 50) as Promise<Array<string | StoredEmailMessage> | null>,
          redis.lrange(`messages:${email}`, 0, 50) as Promise<Array<string | StoredEmailMessage> | null>,
          redis.get(`ast_latest_msg:${email}`) as Promise<string | StoredEmailMessage | null>,
        ])

        const combined: StoredEmailMessage[] = [...messageList]
        const seen = new Set<string>()
        for (const m of messageList) seen.add(m.id)

        const addItems = (items: Array<string | StoredEmailMessage> | null) => {
          if (!Array.isArray(items)) return
          for (const item of items) {
            try {
              const parsed = typeof item === "string" ? JSON.parse(item) : item
              if (parsed && parsed.id && !seen.has(parsed.id)) {
                seen.add(parsed.id)
                if (!parsed.otpCode) {
                  parsed.otpCode = serverExtractOtp(parsed.subject || "", `${parsed.body || ""} ${parsed.html || ""}`)
                }
                if (!parsed.verifyLink) {
                  parsed.verifyLink = serverExtractVerifyLink(`${parsed.body || ""} ${parsed.html || ""}`)
                }
                combined.push(parsed)
              }
            } catch {}
          }
        }

        addItems(r1)
        addItems(r2)
        if (r3) {
          try {
            const parsed = typeof r3 === "string" ? JSON.parse(r3) : r3
            if (parsed && parsed.id && !seen.has(parsed.id)) {
              seen.add(parsed.id)
              if (!parsed.otpCode) {
                parsed.otpCode = serverExtractOtp(parsed.subject || "", `${parsed.body || ""} ${parsed.html || ""}`)
              }
              if (!parsed.verifyLink) {
                parsed.verifyLink = serverExtractVerifyLink(`${parsed.body || ""} ${parsed.html || ""}`)
              }
              combined.push(parsed)
            }
          } catch {}
        }

        combined.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
        messageList = combined
        msgStore.set(email, messageList)
      } catch {}
    }

    if (email) {
      const isClaimed = claims.has(email) || email === "astrxy@beezelbub.com"
      const entry = claims.get(email)
      return NextResponse.json(
        {
          success: true,
          claimed: isClaimed,
          email,
          claimedAt: entry?.claimedAt || null,
          keyMasked: entry?.keyMasked || null,
          messages: messageList,
          redisConnected: Boolean(redis),
        },
        { headers: CORS_HEADERS }
      )
    }

    // No email provided -> Admin Inspector / Recent messages view
    const allClaims = Array.from(claims.values()).map((entry) => ({
      email: entry.email,
      claimedAt: entry.claimedAt,
      date: new Date(entry.claimedAt).toLocaleString(),
      keyMasked: entry.keyMasked || "••••",
    }))

    let recentAll: StoredEmailMessage[] = []
    if (searchParams.get("all") === "true" || searchParams.get("action") === "recent") {
      if (redis) {
        try {
          const rawList = (await redis.lrange("ast_all_messages", 0, 30)) as Array<string | StoredEmailMessage> | null
          if (Array.isArray(rawList)) {
            for (const item of rawList) {
              try {
                const parsed = typeof item === "string" ? JSON.parse(item) : item
                if (parsed && parsed.id) recentAll.push(parsed)
              } catch {}
            }
          }
        } catch {}
      }

      if (recentAll.length === 0) {
        msgStore.forEach((list) => recentAll.push(...list))
        recentAll.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
        recentAll = recentAll.slice(0, 30)
      }
    }

    return NextResponse.json(
      {
        success: true,
        total: allClaims.length,
        claimedEmails: allClaims,
        messages: recentAll,
        redisConnected: Boolean(redis),
      },
      { headers: CORS_HEADERS }
    )
  } catch (err) {
    return NextResponse.json(
      { success: false, messages: [], error: String(err) },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}

// POST: Handles Mailbox Claiming AND Incoming Email Webhooks from Cloudflare Worker!
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      action?: string
      email?: string
      mailbox?: string
      key?: string
      keyMasked?: string
      claimKey?: string
      passcode?: string
      to?: string
      from?: string
      subject?: string
      body?: string
      html?: string
      attachments?: unknown[]
    }

    const claims = getClaimsMap()
    const msgStore = getMessagesStore()
    const redis = await getRedisClient()

    // 1. INCOMING EMAIL INGESTION (from Cloudflare Email Router Worker)
    let rawRecipient = (body.to || body.mailbox || body.email || "").toLowerCase().trim()
    const bracketMatch = rawRecipient.match(/<([^>]+)>/)
    if (bracketMatch) rawRecipient = bracketMatch[1].trim()
    const recipient = rawRecipient.replace(/^["'<]+|[>"']+$/g, "").toLowerCase().trim()
    const isIncomingEmail = Boolean(body.from || body.subject || body.body || body.html || body.action === "incoming")

    if (recipient && isIncomingEmail && !body.action?.startsWith("claim")) {
      const now = Date.now()
      const rawFrom = body.from || "Inbound Service"
      const rawSubject = body.subject || "(No Subject)"
      const rawBody = body.body || ""
      const rawHtml = body.html || ""

      let cleanSender = rawFrom
      let senderName = rawFrom
      const senderMatch = rawFrom.match(/^"?([^"<]+)"?\s*<([^>]+)>$/)
      if (senderMatch) {
        senderName = senderMatch[1].trim()
        cleanSender = senderMatch[2].trim()
      } else if (rawFrom.includes("@")) {
        senderName = rawFrom.slice(0, rawFrom.indexOf("@"))
      }

      const detectedOtp = serverExtractOtp(rawSubject, `${rawBody} ${rawHtml}`)
      const detectedLink = serverExtractVerifyLink(`${rawBody} ${rawHtml}`)

      const messageRecord: StoredEmailMessage = {
        id: `msg_${now}_${Math.random().toString(36).slice(2, 7)}`,
        to: recipient,
        recipient: recipient,
        from: cleanSender,
        sender: cleanSender,
        senderName: senderName,
        subject: rawSubject,
        body: rawBody,
        html: rawHtml || (rawBody.includes("<html") ? rawBody : undefined),
        date: new Date(now).toISOString(),
        time: new Date(now).toISOString(),
        timestamp: now,
        attachments: Array.isArray(body.attachments) ? body.attachments : undefined,
        otpCode: detectedOtp,
        verifyLink: detectedLink,
      }

      // Save to memory
      const existing = msgStore.get(recipient) || []
      const updated = [messageRecord, ...existing].slice(0, 50)
      msgStore.set(recipient, updated)
      savePersistedMessages(msgStore)

      // Save to Redis
      if (redis) {
        try {
          const msgJson = JSON.stringify(messageRecord)
          await Promise.all([
            redis.lpush(`ast_messages:${recipient}`, msgJson),
            redis.lpush(`messages:${recipient}`, msgJson),
            redis.lpush(`inbox:${recipient}`, msgJson),
            redis.set(`ast_latest_msg:${recipient}`, msgJson),
            redis.lpush("ast_all_messages", msgJson),
            redis.incr("ast_stat_messages_received"),
          ])
        } catch {}
      }

      // Dispatch to Discord Webhook
      try {
        const fields = [
          { name: "📬 To (Mailbox)", value: `\`${recipient}\``, inline: true },
          { name: "👤 From", value: `\`${cleanSender}\``, inline: true },
        ]
        if (detectedOtp) {
          fields.push({ name: "🔑 OTP / Verification Code", value: `**\`${detectedOtp}\`**`, inline: false })
        }
        if (detectedLink) {
          fields.push({ name: "🔗 Verification Link", value: detectedLink, inline: false })
        }
        const preview = rawBody.slice(0, 400) || "(No body)"
        fields.push({ name: "📝 Preview", value: preview.slice(0, 800), inline: false })

        await fetch(DISCORD_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: "Astrxy Sovereign Inbound Gateway",
            avatar_url: "https://astrxytempmail.beezelbub.com/favicon.ico",
            embeds: [
              {
                title: `📩 Inbound Email: ${rawSubject.slice(0, 200)}`,
                color: detectedOtp ? 0x10b981 : 0x38bdf8,
                fields,
                footer: { text: "Astrxy Sovereign TempMail • Netlify Endpoint" },
                timestamp: new Date().toISOString(),
              },
            ],
          }),
        }).catch(() => null)
      } catch {}

      return NextResponse.json(
        {
          success: true,
          status: "delivered",
          messageId: messageRecord.id,
          to: recipient,
          subject: messageRecord.subject,
          otpCode: detectedOtp,
          verifyLink: detectedLink,
          timestamp: now,
        },
        { headers: CORS_HEADERS }
      )
    }

    // 2. MAILBOX CLAIM & SECURITY ACTIONS
    const email = (body.email || body.mailbox || recipient).toLowerCase().trim()

    if (body.action === "check") {
      let isClaimed = claims.has(email) || email === "astrxy@beezelbub.com"
      if (!isClaimed && redis && email) {
        try {
          const remote = await redis.hget("ast_claimed_emails", email)
          if (remote) isClaimed = true
        } catch {}
      }
      return NextResponse.json({ success: true, claimed: isClaimed, email }, { headers: CORS_HEADERS })
    }

    if (body.action === "claim" || body.action === "claim_mailbox") {
      if (!email) {
        return NextResponse.json({ success: false, error: "Email required" }, { status: 400, headers: CORS_HEADERS })
      }
      const rawKey = body.key || body.claimKey || ""
      const keyMasked = body.keyMasked || (rawKey.length > 4 ? `${rawKey.slice(0, 3)}••••` : "••••")
      const now = Date.now()

      const entry: ClaimedEntry = { email, claimedAt: now, keyMasked }
      claims.set(email, entry)
      savePersistedClaims(claims)

      if (redis) {
        await redis.hset("ast_claimed_emails", { [email]: JSON.stringify(entry) }).catch(() => null)
      }

      return NextResponse.json(
        {
          success: true,
          claimed: true,
          email,
          date: new Date(now).toLocaleString(),
          redisSaved: Boolean(redis),
        },
        { headers: CORS_HEADERS }
      )
    }

    if (body.action === "unclaim" || body.action === "unclaim_mailbox") {
      if (email) {
        claims.delete(email)
        savePersistedClaims(claims)
        if (redis) {
          await redis.hdel("ast_claimed_emails", email).catch(() => null)
        }
      }
      return NextResponse.json({ success: true, unclaimed: true, email }, { headers: CORS_HEADERS })
    }

    // 3. Clear admin inbox action (Master Admin only)
    if (body.action === "clear_admin_inbox") {
      if (!isMasterPass(body.passcode)) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403, headers: CORS_HEADERS })
      }
      msgStore.clear()
      savePersistedMessages(msgStore)
      return NextResponse.json({ success: true, cleared: true }, { headers: CORS_HEADERS })
    }

    return NextResponse.json({ success: true, claimed: claims.has(email) }, { headers: CORS_HEADERS })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url, "http://localhost")
    const email = (searchParams.get("email") || "").toLowerCase().trim()
    const id = searchParams.get("id") || ""
    const msgStore = getMessagesStore()

    if (email && id && msgStore.has(email)) {
      const list = msgStore.get(email) || []
      msgStore.set(
        email,
        list.filter((m) => m.id !== id)
      )
      savePersistedMessages(msgStore)
    }

    return NextResponse.json({ success: true, deleted: id }, { headers: CORS_HEADERS })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500, headers: CORS_HEADERS })
  }
}
