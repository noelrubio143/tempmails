import { adminKey, safeEqual } from "../../../../lib/admin-auth"
import { NextRequest, NextResponse } from "next/server"

declare global {
  var globalVipGrants: Map<string, number> | undefined
  var globalRevokedKeys: Set<string> | undefined
}

if (!globalThis.globalVipGrants) {
  globalThis.globalVipGrants = new Map<string, number>()
}
if (!globalThis.globalRevokedKeys) {
  globalThis.globalRevokedKeys = new Set<string>()
}

export async function POST(req: NextRequest) {
  try {
    const supplied = req.headers.get("x-admin-key") || ""
    if (!supplied || !safeEqual(supplied, adminKey())) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 })
    }

    const body = await req.json()
    const { action, target, days, email } = body

    if (action === "grant") {
      const targetEmail = decodeURIComponent(String(target || email || "")).trim().toLowerCase()
      if (!targetEmail) {
        return NextResponse.json({ error: "Target email is required" }, { status: 400 })
      }

      const rawDuration = String(days || "30").trim().toLowerCase()
      let durationMs = 30 * 24 * 60 * 60 * 1000

      const match = rawDuration.match(/^(\d+(?:\.\d+)?)\s*(s|sec|m|min|h|hr|d|day)?$/)
      if (match) {
        const val = parseFloat(match[1])
        const unit = match[2] || "d"
        if (unit.startsWith("s")) durationMs = val * 1000
        else if (unit.startsWith("m")) durationMs = val * 60 * 1000
        else if (unit.startsWith("h")) durationMs = val * 60 * 60 * 1000
        else durationMs = val * 24 * 60 * 60 * 1000
      }

      const expiresAt = Date.now() + durationMs
      globalThis.globalVipGrants.set(targetEmail, expiresAt)

      return NextResponse.json({
        success: true,
        message: `✓ Granted VIP to ${targetEmail} for ${rawDuration}`,
        expiresAt,
      })
    }

    if (action === "revokevip") {
      const keyOrEmail = decodeURIComponent(String(target || email || "")).trim().toLowerCase()
      globalThis.globalRevokedKeys.add(keyOrEmail.toUpperCase())
      globalThis.globalVipGrants.delete(keyOrEmail)

      return NextResponse.json({
        success: true,
        message: `✓ VIP access for "${keyOrEmail}" has been revoked.`,
      })
    }

    return NextResponse.json({ success: true, message: `Command ${action} executed` })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
