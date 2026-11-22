import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import os from "os"

export const dynamic = "force-dynamic"
export const revalidate = 0

const REFERRALS_FILE = path.join(os.tmpdir(), "ast_referrals_v2.json")

const loadPersistedReferrals = (): Map<string, number> => {
  const map = new Map<string, number>()
  try {
    if (fs.existsSync(REFERRALS_FILE)) {
      const content = fs.readFileSync(REFERRALS_FILE, "utf-8")
      const list = JSON.parse(content) as Array<{ email: string; count: number }>
      if (Array.isArray(list)) {
        for (const item of list) {
          if (item && item.email) {
            map.set(item.email.toLowerCase().trim(), item.count || 0)
          }
        }
      }
    }
  } catch {}
  return map
}

const savePersistedReferrals = (map: Map<string, number>) => {
  try {
    const list = Array.from(map.entries()).map(([email, count]) => ({ email, count }))
    fs.writeFileSync(REFERRALS_FILE, JSON.stringify(list), "utf-8")
  } catch {}
}

const getRedisClient = async (): Promise<any> => null // Upstash removed

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
  "Pragma": "no-cache",
  "Expires": "0",
  "Surrogate-Control": "no-store",
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const email = (searchParams.get("email") || "").toLowerCase().trim()

  const map = loadPersistedReferrals()
  const redis = await getRedisClient()

  if (redis && email) {
    try {
      const val = await redis.hget("ast_referrals_hash", email)
      if (val !== null && val !== undefined) {
        const count = Number(val) || 0
        map.set(email, count)
      }
    } catch {}
  }

  const count = email ? (map.get(email) || 0) : 0

  return NextResponse.json(
    {
      email,
      count,
      referralCount: count,
      redisConnected: Boolean(redis),
    },
    { headers: NO_CACHE_HEADERS }
  )
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      refEmail?: string
      referrer?: string
      email?: string
    }

    const email = (body.refEmail || body.referrer || body.email || "").toLowerCase().trim()
    if (!email) {
      return NextResponse.json({ success: false, error: "Referrer email required" }, { status: 400, headers: NO_CACHE_HEADERS })
    }

    const map = loadPersistedReferrals()
    const redis = await getRedisClient()

    let current = map.get(email) || 0
    if (redis) {
      try {
        const val = await redis.hget("ast_referrals_hash", email)
        if (val !== null && val !== undefined) {
          current = Math.max(current, Number(val) || 0)
        }
      } catch {}
    }

    const newCount = current + 1
    map.set(email, newCount)
    savePersistedReferrals(map)

    if (redis) {
      await redis.hset("ast_referrals_hash", { [email]: newCount }).catch(() => null)
    }

    return NextResponse.json(
      {
        success: true,
        email,
        count: newCount,
        message: `Registered real referral for ${email}. Total: ${newCount}`,
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
