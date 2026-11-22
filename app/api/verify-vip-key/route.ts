import { Redis } from "@upstash/redis"
import { NextResponse } from "next/server"

const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "",
})
const VIP_KEY_PATTERN = /^ASTRXY-[A-Z0-9]+(?:-[A-Z0-9]+)*$/

export async function POST(request: Request) {
  try {
    const body = await request.json() as { key?: unknown; email?: unknown }
    const key = typeof body.key === "string" ? body.key.trim().toUpperCase() : ""
    if (!VIP_KEY_PATTERN.test(key)) {
      return NextResponse.json({ success: false, message: "❌ Invalid VIP Key. Please verify with admin." }, { status: 400 })
    }

    const redeemedAt = new Date().toISOString()
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "unknown"
    const claimed = await redis.set(`astrxy:vip-key:${key}`, { is_redeemed: true, redeemed_at: redeemedAt, email }, { nx: true })
    if (claimed !== "OK") {
      return NextResponse.json({ success: false, message: "❌ This VIP Key has already been redeemed on another device/browser. Single-use only." }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: "VIP Unlocked successfully!" })
  } catch {
    return NextResponse.json({ success: false, message: "VIP verification is temporarily unavailable. Please try again." }, { status: 503 })
  }
}
