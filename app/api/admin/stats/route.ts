import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import os from "os"

export const dynamic = "force-dynamic"
export const revalidate = 0

// Global state container attached to globalThis (Works on Edge, Node, and Serverless)
interface ClaimedEntry {
  email: string
  claimedAt: number
  keyMasked?: string
}

const CLAIMS_FILE = path.join(os.tmpdir(), "ast_claimed_emails_v2.json")

const loadPersistedClaims = (): Map<string, ClaimedEntry> => {
  const map = new Map<string, ClaimedEntry>()
  map.set("astrxy@beezelbub.com", {
    email: "astrxy@beezelbub.com",
    claimedAt: Date.now() - 86400000 * 7,
    keyMasked: "ADM••••",
  })
  map.set("astrxy1@beezelbub.com", {
    email: "astrxy1@beezelbub.com",
    claimedAt: Date.now() - 86400000 * 2,
    keyMasked: "MOD••••",
  })

  try {
    if (fs.existsSync(CLAIMS_FILE)) {
      const content = fs.readFileSync(CLAIMS_FILE, "utf-8")
      const list = JSON.parse(content)
      if (Array.isArray(list)) {
        for (const item of list) {
          if (item && item.email) {
            map.set(item.email.toLowerCase().trim(), item)
          }
        }
      }
    }
  } catch {}

  return map
}

const savePersistedClaims = (map: Map<string, ClaimedEntry>) => {
  try {
    const list = Array.from(map.values())
    fs.writeFileSync(CLAIMS_FILE, JSON.stringify(list), "utf-8")
  } catch {}
}

const getRedisClient = async () => {
  try {
    const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
    const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN
    if (url && token) {
      const { Redis } = await import("@upstash/redis")
      return new Redis({ url, token })
    }
  } catch {}
  return null
}

interface BlockedEntry {
  target: string
  type: "email" | "domain"
  reason: string
  timestamp: string
  actor: string
}

interface GlobalStatsRegistry {
  sessions: Map<string, number>
  adminSessions: Map<string, number>
  modSessions: Map<string, number>
  inboxesCreated: number
  messagesReceived: number
  broadcastBanner: string | null
  totalVisitors: number
  uniqueVisitors: Set<string>
  claimedEmails: Map<string, ClaimedEntry>
  globalBlocklist: Map<string, BlockedEntry>
  moderators: Set<string>
  lockdown: boolean
  slowmodeSeconds: number
}

const g = globalThis as unknown as { __ast_stats_registry?: GlobalStatsRegistry }

if (!g.__ast_stats_registry) {
  const initialClaims = loadPersistedClaims()
  initialClaims.set("astrxy@beezelbub.com", {
    email: "astrxy@beezelbub.com",
    claimedAt: Date.now() - 86400000 * 7,
    keyMasked: "ADM••••",
  })
  initialClaims.set("astrxy1@beezelbub.com", {
    email: "astrxy1@beezelbub.com",
    claimedAt: Date.now() - 86400000 * 2,
    keyMasked: "MOD••••",
  })

  const initialBlocks = new Map<string, BlockedEntry>()
  initialBlocks.set("spammer@tempmail.ninja", {
    target: "spammer@tempmail.ninja",
    type: "email",
    reason: "Known malicious phishing payload distributor",
    timestamp: "Permanent",
    actor: "Master Admin",
  })

  const initialMods = new Set<string>(["astrxy1@beezelbub.com"])

  g.__ast_stats_registry = {
    sessions: new Map<string, number>(),
    adminSessions: new Map<string, number>(),
    modSessions: new Map<string, number>(),
    inboxesCreated: 42,
    messagesReceived: 18,
    broadcastBanner: null,
    totalVisitors: 320,
    uniqueVisitors: new Set<string>(),
    claimedEmails: initialClaims,
    globalBlocklist: initialBlocks,
    moderators: initialMods,
    lockdown: false,
    slowmodeSeconds: 0,
  }
}

const registry = g.__ast_stats_registry

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
  "Pragma": "no-cache",
  "Expires": "0",
  "Surrogate-Control": "no-store",
}

// Purge sessions inactive for > 25 seconds
const purgeInactiveSessions = (now = Date.now()) => {
  for (const [id, lastSeen] of registry.sessions.entries()) {
    if (now - lastSeen > 25000) registry.sessions.delete(id)
  }
  for (const [id, lastSeen] of registry.adminSessions.entries()) {
    if (now - lastSeen > 25000) registry.adminSessions.delete(id)
  }
  for (const [id, lastSeen] of registry.modSessions.entries()) {
    if (now - lastSeen > 25000) registry.modSessions.delete(id)
  }
}

export async function GET() {
  const now = Date.now()
  purgeInactiveSessions(now)

  // 1. Merge any claims written by other worker processes or /api/inbox
  const freshFromDisk = loadPersistedClaims()
  for (const [k, v] of freshFromDisk.entries()) {
    registry.claimedEmails.set(k, v)
  }

  // 2. Multi-region Upstash Redis sync across all devices and visitors globally
  const redis = await getRedisClient()
  if (redis) {
    try {
      const redisClaims = (await redis.hgetall("ast_claimed_emails")) as Record<string, string | ClaimedEntry> | null
      if (redisClaims && typeof redisClaims === "object") {
        for (const [em, rawVal] of Object.entries(redisClaims)) {
          try {
            const parsed = typeof rawVal === "string" ? JSON.parse(rawVal) : rawVal
            if (parsed && parsed.email) {
              registry.claimedEmails.set(parsed.email.toLowerCase().trim(), parsed)
            }
          } catch {}
        }
      }

      const redisBanner = (await redis.get("ast_broadcast_banner")) as string | null
      if (redisBanner) {
        registry.broadcastBanner = redisBanner
      }
    } catch {}
  }

  const claimedList = Array.from(registry.claimedEmails.values()).map((entry) => ({
    email: entry.email,
    claimedAt: entry.claimedAt,
    date: new Date(entry.claimedAt).toLocaleString(),
    keyMasked: entry.keyMasked || "••••",
  }))

  const blockedList = Array.from(registry.globalBlocklist.values())
  const moderatorsList = Array.from(registry.moderators)

  const bc = (globalThis as unknown as { __ast_broadcast_container?: { bannerText: string | null } }).__ast_broadcast_container
  const currentBroadcast = bc?.bannerText ?? registry.broadcastBanner
  const isBroadcastActive = Boolean(
    currentBroadcast &&
    currentBroadcast.trim().length > 0 &&
    currentBroadcast !== "__DISABLED__" &&
    currentBroadcast.toLowerCase() !== "off" &&
    currentBroadcast.toLowerCase() !== "clear"
  )

  return NextResponse.json(
    {
      activeVisitors: Math.max(1, registry.sessions.size),
      totalVisitors: registry.totalVisitors,
      totalInboxes: registry.inboxesCreated,
      totalMessages: registry.messagesReceived,
      totalClaimed: registry.claimedEmails.size,
      claimedEmails: claimedList,
      blockedList,
      moderators: moderatorsList,
      lockdown: registry.lockdown,
      slowmodeSeconds: registry.slowmodeSeconds,
      broadcastBanner: isBroadcastActive ? currentBroadcast!.trim() : null,
      adminOnline: registry.adminSessions.size > 0,
      modOnline: registry.modSessions.size > 0,
      redisConnected: Boolean(redis),
      timestamp: now,
      provider: redis ? "upstash-redis-multi-region" : "edge-server-realtime",
    },
    { headers: NO_CACHE_HEADERS }
  )
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      clientId?: string
      mailbox?: string
      email?: string
      target?: string
      type?: "email" | "domain"
      reason?: string
      actor?: string
      isAdmin?: boolean
      isModerator?: boolean
      action?:
        | "create_inbox"
        | "receive_message"
        | "heartbeat"
        | "set_broadcast"
        | "admin_logout"
        | "mod_logout"
        | "claim_mailbox"
        | "unclaim_mailbox"
        | "block"
        | "unblock"
        | "set_moderator"
        | "remove_moderator"
        | "set_lockdown"
        | "set_slowmode"
        | "wipe_inbox"
      bannerText?: string | null
      keyMasked?: string
      count?: number
      lockdown?: boolean
      slowmodeSeconds?: number
    }

    const now = Date.now()

    // 1. Record visitor presence heartbeat
    if (body.clientId && typeof body.clientId === "string") {
      registry.sessions.set(body.clientId, now)
      if (!registry.uniqueVisitors.has(body.clientId)) {
        registry.uniqueVisitors.add(body.clientId)
        registry.totalVisitors += 1
      }
    }

    // 2. Track Master Admin live session or logout
    if (body.action === "admin_logout" || body.isAdmin === false) {
      if (body.clientId) registry.adminSessions.delete(body.clientId)
      else registry.adminSessions.clear()
    } else if (body.isAdmin && body.clientId) {
      registry.adminSessions.set(body.clientId, now)
    }

    // 3. Track Staff Moderator online presence or logout
    if (body.action === "mod_logout" || body.isModerator === false) {
      if (body.clientId) registry.modSessions.delete(body.clientId)
    } else if (body.isModerator && body.clientId) {
      registry.modSessions.set(body.clientId, now)
    }

    // 4. Increment real mailbox creation counter
    if (body.action === "create_inbox") {
      registry.inboxesCreated += Number(body.count) || 1
    }

    // 5. Increment real received message counter
    if (body.action === "receive_message") {
      registry.messagesReceived += Number(body.count) || 1
    }

    // 6. Real-time Claim Mailbox registration (Server-side)
    if ((body.action === "claim_mailbox" || body.action === "claim") && (body.email || body.mailbox)) {
      const email = (body.email || body.mailbox || "").toLowerCase().trim()
      if (email) {
        const entry: ClaimedEntry = {
          email,
          claimedAt: now,
          keyMasked: body.keyMasked || "••••",
        }
        registry.claimedEmails.set(email, entry)
        savePersistedClaims(registry.claimedEmails)

        const redis = await getRedisClient()
        if (redis) {
          await redis.hset("ast_claimed_emails", { [email]: JSON.stringify(entry) }).catch(() => null)
        }
      }
    }

    // 7. Real-time Unclaim Mailbox
    if ((body.action === "unclaim_mailbox" || body.action === "unclaim") && (body.email || body.mailbox)) {
      const email = (body.email || body.mailbox || "").toLowerCase().trim()
      if (email) {
        registry.claimedEmails.delete(email)
        savePersistedClaims(registry.claimedEmails)

        const redis = await getRedisClient()
        if (redis) {
          await redis.hdel("ast_claimed_emails", email).catch(() => null)
        }
      }
    }

    // 8. Real-time Global Block
    if (body.action === "block" && body.target) {
      const target = body.target.toLowerCase().trim()
      registry.globalBlocklist.set(target, {
        target,
        type: body.type || (target.includes("@") ? "email" : "domain"),
        reason: body.reason || "Banned by administrator",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        actor: body.actor || "Staff",
      })
    }

    // 9. Real-time Global Unblock
    if (body.action === "unblock" && body.target) {
      const target = body.target.toLowerCase().trim()
      registry.globalBlocklist.delete(target)
    }

    // 10. Real-time Moderator assignment
    if (body.action === "set_moderator" && (body.email || body.target)) {
      const target = (body.email || body.target || "").toLowerCase().trim()
      if (target) registry.moderators.add(target)
    }

    // 11. Real-time Moderator removal
    if (body.action === "remove_moderator" && (body.email || body.target)) {
      const target = (body.email || body.target || "").toLowerCase().trim()
      if (target) registry.moderators.delete(target)
    }

    // 12. Real-time Lockdown Mode
    if (body.action === "set_lockdown") {
      registry.lockdown = Boolean(body.lockdown)
    }

    // 13. Real-time Slowmode
    if (body.action === "set_slowmode" && typeof body.slowmodeSeconds === "number") {
      registry.slowmodeSeconds = Math.max(0, body.slowmodeSeconds)
    }

    // 14. Update global broadcast banner
    if (body.action === "set_broadcast") {
      const bannerRaw = (body.bannerText || "").trim()
      const isOff =
        !bannerRaw ||
        bannerRaw === "__DISABLED__" ||
        bannerRaw.toLowerCase() === "off" ||
        bannerRaw.toLowerCase() === "clear" ||
        bannerRaw.toLowerCase() === "disable" ||
        bannerRaw.toLowerCase() === "delete" ||
        bannerRaw.toLowerCase() === "remove" ||
        bannerRaw.toLowerCase() === "stop"

      if (isOff) {
        registry.broadcastBanner = "__DISABLED__"
        const bc = (globalThis as unknown as { __ast_broadcast_container?: { bannerText: string | null } }).__ast_broadcast_container
        if (bc) bc.bannerText = "__DISABLED__"
        const redis = await getRedisClient()
        if (redis) {
          await redis.del("ast_broadcast_banner").catch(() => null)
        }
      } else {
        registry.broadcastBanner = bannerRaw
        const bc = (globalThis as unknown as { __ast_broadcast_container?: { bannerText: string | null } }).__ast_broadcast_container
        if (bc) bc.bannerText = bannerRaw
        else (globalThis as unknown as { __ast_broadcast_container?: { bannerText: string | null } }).__ast_broadcast_container = { bannerText: bannerRaw }
        const redis = await getRedisClient()
        if (redis) {
          await redis.set("ast_broadcast_banner", bannerRaw).catch(() => null)
        }
      }
    }

    purgeInactiveSessions(now)

    const claimedList = Array.from(registry.claimedEmails.values()).map((entry) => ({
      email: entry.email,
      claimedAt: entry.claimedAt,
      date: new Date(entry.claimedAt).toLocaleString(),
      keyMasked: entry.keyMasked || "••••",
    }))

    const blockedList = Array.from(registry.globalBlocklist.values())
    const moderatorsList = Array.from(registry.moderators)

    const bcPost = (globalThis as unknown as { __ast_broadcast_container?: { bannerText: string | null } }).__ast_broadcast_container
    const activeBroadcast = bcPost?.bannerText ?? registry.broadcastBanner

    return NextResponse.json(
      {
        success: true,
        activeVisitors: Math.max(1, registry.sessions.size),
        totalVisitors: registry.totalVisitors,
        totalInboxes: registry.inboxesCreated,
        totalMessages: registry.messagesReceived,
        totalClaimed: registry.claimedEmails.size,
        claimedEmails: claimedList,
        blockedList,
        moderators: moderatorsList,
        lockdown: registry.lockdown,
        slowmodeSeconds: registry.slowmodeSeconds,
        broadcastBanner: activeBroadcast,
        adminOnline: registry.adminSessions.size > 0,
        modOnline: registry.modSessions.size > 0,
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
