import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import os from "os"

export const dynamic = "force-dynamic"
export const revalidate = 0

const REFERRALS_FILE = path.join(os.tmpdir(), "ast_referrals_v2.json")
const CLAIMS_FILE = path.join(os.tmpdir(), "ast_claimed_emails_v2.json")

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

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
  "Pragma": "no-cache",
  "Expires": "0",
  "Surrogate-Control": "no-store",
}

export async function GET() {
  const map = new Map<string, number>()

  // 1. Read from disk
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

  // 2. Read from Upstash Redis if configured
  const redis = await getRedisClient()
  if (redis) {
    try {
      const redisRefs = (await redis.hgetall("ast_referrals_hash")) as Record<string, string | number> | null
      if (redisRefs && typeof redisRefs === "object") {
        for (const [em, rawVal] of Object.entries(redisRefs)) {
          const count = Number(rawVal) || 0
          map.set(em.toLowerCase().trim(), Math.max(map.get(em.toLowerCase().trim()) || 0, count))
        }
      }
    } catch {}
  }

  // Convert to sorted leaderboard
  const list = Array.from(map.entries())
    .map(([email, count]) => ({ email, count }))
    .sort((a, b) => b.count - a.count)

  return NextResponse.json(list, { headers: NO_CACHE_HEADERS })
}
