import { NextResponse } from "next/server"
import { isAdminRequest } from "../../../../lib/admin-auth"

export const dynamic = "force-dynamic"
export const revalidate = 0

interface GlobalBroadcastContainer {
  bannerText: string | null
}

const g = globalThis as unknown as {
  __ast_broadcast_container?: GlobalBroadcastContainer
  __ast_stats_registry?: { broadcastBanner: string | null }
}

if (!g.__ast_broadcast_container) {
  g.__ast_broadcast_container = {
    bannerText: null,
  }
}

const container = g.__ast_broadcast_container

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

export async function GET() {
  let current: string | null = null
  let redisQueried = false

  try {
    const redis = await getRedisClient()
    if (redis) {
      redisQueried = true
      const redisBanner = (await redis.get("ast_broadcast_banner")) as string | null
      if (
        typeof redisBanner === "string" &&
        redisBanner.trim().length > 0 &&
        redisBanner !== "__DISABLED__" &&
        redisBanner.toLowerCase() !== "off" &&
        redisBanner.toLowerCase() !== "clear" &&
        redisBanner.toLowerCase() !== "null"
      ) {
        current = redisBanner.trim()
        container.bannerText = current
        if (g.__ast_stats_registry) {
          g.__ast_stats_registry.broadcastBanner = current
        }
      } else {
        current = null
        container.bannerText = null
        if (g.__ast_stats_registry) {
          g.__ast_stats_registry.broadcastBanner = null
        }
      }
    }
  } catch {
    // Redis query failure: fall back to local in-memory
  }

  if (!redisQueried) {
    const inMem = container.bannerText ?? g.__ast_stats_registry?.broadcastBanner ?? null
    if (
      inMem &&
      inMem.trim().length > 0 &&
      inMem !== "__DISABLED__" &&
      inMem.toLowerCase() !== "off" &&
      inMem.toLowerCase() !== "clear" &&
      inMem.toLowerCase() !== "null"
    ) {
      current = inMem.trim()
    } else {
      current = null
    }
  }

  const isActive = Boolean(current && current.length > 0)

  return NextResponse.json(
    {
      banner: {
        active: isActive,
        text: isActive ? current : "",
      },
      timestamp: Date.now(),
    },
    { headers: NO_CACHE_HEADERS }
  )
}

export async function POST(req: Request) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401, headers: NO_CACHE_HEADERS })
  }
  try {
    const body = (await req.json().catch(() => ({}))) as { text?: string | null; active?: boolean }
    const rawText = (body.text || "").trim()
    const isOff =
      body.active === false ||
      !rawText ||
      rawText === "__DISABLED__" ||
      rawText.toLowerCase() === "off" ||
      rawText.toLowerCase() === "clear" ||
      rawText.toLowerCase() === "disable" ||
      rawText.toLowerCase() === "delete" ||
      rawText.toLowerCase() === "remove" ||
      rawText.toLowerCase() === "stop"

    if (isOff) {
      container.bannerText = null
      if (g.__ast_stats_registry) {
        g.__ast_stats_registry.broadcastBanner = null
      }
      try {
        const redis = await getRedisClient()
        if (redis) {
          await redis.del("ast_broadcast_banner").catch(() => null)
        }
      } catch {}
    } else {
      container.bannerText = rawText
      if (g.__ast_stats_registry) {
        g.__ast_stats_registry.broadcastBanner = rawText
      }
      try {
        const redis = await getRedisClient()
        if (redis) {
          await redis.set("ast_broadcast_banner", rawText).catch(() => null)
        }
      } catch {}
    }

    const current = container.bannerText
    const isActive = Boolean(
      current &&
      current.trim().length > 0 &&
      current !== "__DISABLED__" &&
      current.toLowerCase() !== "off" &&
      current.toLowerCase() !== "clear" &&
      current.toLowerCase() !== "null"
    )

    return NextResponse.json(
      {
        success: true,
        banner: {
          active: isActive,
          text: isActive ? current : "",
        },
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
