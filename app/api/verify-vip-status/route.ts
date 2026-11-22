import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import os from "os"

export const dynamic = "force-dynamic"
export const revalidate = 0

export interface VipRecord {
  email: string
  expiresAt: number
  plan: string
  grantedAt: number
  grantedBy: string
}

interface GlobalVipRegistry {
  vips: Map<string, VipRecord>
}

const VIPS_FILE = path.join(os.tmpdir(), "ast_vips_registry_v2.json")

const loadPersistedVips = (): Map<string, VipRecord> => {
  const map = new Map<string, VipRecord>()

  // Master Admin & Founder permanent access
  map.set("astrxy@beezelbub.com", {
    email: "astrxy@beezelbub.com",
    expiresAt: Date.now() + 86400000 * 365 * 10,
    plan: "👑 Master Admin Access (Permanent Lifetime)",
    grantedAt: Date.now() - 86400000 * 30,
    grantedBy: "System Root",
  })

  try {
    if (fs.existsSync(VIPS_FILE)) {
      const content = fs.readFileSync(VIPS_FILE, "utf-8")
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

const savePersistedVips = (map: Map<string, VipRecord>) => {
  try {
    const list = Array.from(map.values())
    fs.writeFileSync(VIPS_FILE, JSON.stringify(list), "utf-8")
  } catch {}
}

const getRedisClient = async (): Promise<any> => null // Upstash removed

const g = globalThis as unknown as { __ast_vip_registry?: GlobalVipRegistry }

if (!g.__ast_vip_registry) {
  g.__ast_vip_registry = {
    vips: loadPersistedVips(),
  }
}

const registry = g.__ast_vip_registry

const getVipsMap = async (): Promise<Map<string, VipRecord>> => {
  const diskMap = loadPersistedVips()
  for (const [k, v] of diskMap.entries()) {
    registry.vips.set(k, v)
  }

  const redis = await getRedisClient()
  if (redis) {
    try {
      const redisVips = (await redis.hgetall("ast_vips_hash")) as Record<string, string | VipRecord> | null
      if (redisVips && typeof redisVips === "object") {
        for (const [em, rawVal] of Object.entries(redisVips)) {
          try {
            const parsed = typeof rawVal === "string" ? JSON.parse(rawVal) : rawVal
            if (parsed && parsed.email) {
              registry.vips.set(parsed.email.toLowerCase().trim(), parsed)
            }
          } catch {}
        }
      }
    } catch {}
  }

  return registry.vips
}

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
  "Pragma": "no-cache",
  "Expires": "0",
  "Surrogate-Control": "no-store",
}

// GET: Check VIP status for a specific email or list all active VIPs
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const email = (searchParams.get("email") || "").toLowerCase().trim()
  const listAll = searchParams.get("all") === "true"

  const now = Date.now()
  const vipsMap = await getVipsMap()

  // Clean up expired VIPs (except permanent ones)
  for (const [key, record] of vipsMap.entries()) {
    if (record.expiresAt < now) {
      vipsMap.delete(key)
    }
  }

  if (listAll) {
    const list = Array.from(vipsMap.values()).map((v) => {
      const remainingMs = Math.max(0, v.expiresAt - now)
      const days = Math.floor(remainingMs / (1000 * 60 * 60 * 24))
      const hours = Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const mins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60))
      const isPerm = v.plan.toLowerCase().includes("permanent") || v.plan.toLowerCase().includes("lifetime") || days > 365

      return {
        email: v.email,
        plan: v.plan,
        expiresAt: v.expiresAt,
        grantedAt: v.grantedAt,
        grantedBy: v.grantedBy,
        formattedExpiry: isPerm ? "Permanent Lifetime" : new Date(v.expiresAt).toLocaleString(),
        remainingTime: isPerm ? "Permanent Lifetime" : days > 0 ? `${days}d ${hours}h remaining` : `${hours}h ${mins}m remaining`,
      }
    })

    return NextResponse.json(
      {
        totalVips: list.length,
        vips: list,
        timestamp: now,
      },
      { headers: NO_CACHE_HEADERS }
    )
  }

  if (!email) {
    return NextResponse.json({ vip: false, error: "Missing email parameter" }, { headers: NO_CACHE_HEADERS })
  }

  const record = vipsMap.get(email)
  if (record && record.expiresAt > now) {
    const remainingMs = record.expiresAt - now
    const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24))
    return NextResponse.json(
      {
        vip: true,
        isVip: true,
        plan: record.plan,
        expiresAt: record.expiresAt,
        remainingDays,
        grantedAt: record.grantedAt,
        grantedBy: record.grantedBy,
      },
      { headers: NO_CACHE_HEADERS }
    )
  }

  return NextResponse.json(
    {
      vip: false,
      isVip: false,
      email,
      message: "Free standard disposable mailbox tier",
    },
    { headers: NO_CACHE_HEADERS }
  )
}

// POST: Admin Grant or Revoke VIP
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      action?: "grant" | "revoke"
      email?: string
      duration?: string
      customExpiryMs?: number
      plan?: string
      grantedBy?: string
    }

    const email = (body.email || "").toLowerCase().trim()
    if (!email) {
      return NextResponse.json({ success: false, error: "Email is required" }, { status: 400, headers: NO_CACHE_HEADERS })
    }

    const now = Date.now()
    const vipsMap = await getVipsMap()
    const redis = await getRedisClient()

    // 1. REVOKE VIP
    if (body.action === "revoke") {
      const existed = vipsMap.delete(email)
      savePersistedVips(vipsMap)
      if (redis) {
        await redis.hdel("ast_vips_hash", email).catch(() => null)
      }

      return NextResponse.json(
        {
          success: true,
          message: existed ? `Revoked VIP for ${email}` : `No active VIP found for ${email}`,
          email,
          vip: false,
        },
        { headers: NO_CACHE_HEADERS }
      )
    }

    // 2. GRANT VIP with Robust Duration Parsing
    const rawDur = (body.duration || "30d").trim().toLowerCase()
    const cleanDur = rawDur.replace(/\s+/g, "")
    const isPerm = cleanDur === "perm" || cleanDur === "permanent" || cleanDur === "lifetime" || cleanDur === "forever"

    let durationMs = 30 * 86400 * 1000 // default 30 days
    let formattedLabel = "30-Day VIP Pass"

    if (isPerm) {
      durationMs = 365 * 10 * 86400 * 1000
      formattedLabel = "Permanent Lifetime VIP"
    } else {
      // Match number and optional unit (default unit: DAYS)
      const match = cleanDur.match(/^(\d+)([a-z]+)?$/i)
      if (match) {
        const num = parseInt(match[1], 10) || 30
        const unit = (match[2] || "d").toLowerCase()

        if (unit.startsWith("s") && !unit.startsWith("sec")) {
          durationMs = num * 1000
          formattedLabel = `${num}-Second VIP Pass`
        } else if (unit.startsWith("sec")) {
          durationMs = num * 1000
          formattedLabel = `${num}-Second VIP Pass`
        } else if (unit.startsWith("m") && !unit.startsWith("mo")) {
          durationMs = num * 60 * 1000
          formattedLabel = `${num}-Minute VIP Pass`
        } else if (unit.startsWith("h")) {
          durationMs = num * 3600 * 1000
          formattedLabel = `${num}-Hour VIP Pass`
        } else if (unit.startsWith("w")) {
          durationMs = num * 7 * 86400 * 1000
          formattedLabel = `${num}-Week VIP Pass`
        } else if (unit.startsWith("mo")) {
          durationMs = num * 30 * 86400 * 1000
          formattedLabel = `${num}-Month VIP Pass`
        } else if (unit.startsWith("y")) {
          durationMs = num * 365 * 86400 * 1000
          formattedLabel = `${num}-Year VIP Pass`
        } else {
          // Default: days (e.g. "60" -> 60 days, "60days" -> 60 days, "60d" -> 60 days)
          durationMs = num * 86400 * 1000
          formattedLabel = `${num}-Day VIP Pass`
        }
      }
    }

    const expiresAt = body.customExpiryMs || (now + durationMs)
    const planName = body.plan || (isPerm ? "👑 Permanent VIP Pass (Admin Grant)" : `✨ ${formattedLabel} (Admin Grant)`)

    const record: VipRecord = {
      email,
      expiresAt,
      plan: planName,
      grantedAt: now,
      grantedBy: body.grantedBy || "Master Admin",
    }

    vipsMap.set(email, record)
    savePersistedVips(vipsMap)

    if (redis) {
      await redis.hset("ast_vips_hash", { [email]: JSON.stringify(record) }).catch(() => null)
    }

    return NextResponse.json(
      {
        success: true,
        message: `Successfully granted ${formattedLabel} to ${email}`,
        email,
        vip: true,
        expiresAt,
        plan: planName,
        redisSaved: Boolean(redis),
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
