import { NextResponse } from "next/server"

// In-memory sliding window request tracker
const ipBuckets = new Map()

// Purge expired rate-limiting buckets every 60 seconds
let lastCleanup = Date.now()
const cleanupExpiredBuckets = (now) => {
  if (now - lastCleanup < 60000) return
  lastCleanup = now
  for (const [ip, bucket] of ipBuckets.entries()) {
    if (now > bucket.resetTime) {
      ipBuckets.delete(ip)
    }
  }
}

// Known malicious automated attack tools & mass flooders
const MALICIOUS_ATTACK_TOOLS =
  /(?:sqlmap|nikto|dirbuster|masscan|zgrab|gobuster|censys|shodan|burpcollaborator|acunetix|havij)/i

export function middleware(request) {
  const now = Date.now()
  cleanupExpiredBuckets(now)

  // 1. Extract real client IP
  const forwardedFor = request.headers.get("x-forwarded-for")
  const realIp =
    request.headers.get("cf-connecting-ip") ||
    (forwardedFor ? forwardedFor.split(",")[0].trim() : null) ||
    request.headers.get("x-real-ip") ||
    "127.0.0.1"

  // 2. Automated Attack Scanner Shield
  const userAgent = request.headers.get("user-agent") || ""
  if (userAgent && MALICIOUS_ATTACK_TOOLS.test(userAgent)) {
    return new NextResponse("Forbidden (Malicious Automated Tool Detected)", {
      status: 403,
      headers: { "Content-Type": "text/plain" },
    })
  }

  // 3. Generous Anti-DDoS Rate-Limiting Policy (120 req / 10s per IP)
  const maxRequests = 120
  const windowMs = 10000

  let bucket = ipBuckets.get(realIp)
  if (!bucket || now > bucket.resetTime) {
    bucket = { count: 1, resetTime: now + windowMs }
    ipBuckets.set(realIp, bucket)
  } else {
    bucket.count += 1
  }

  // 4. DDoS Flood Threshold Breached -> Drop with HTTP 429
  if (bucket.count > maxRequests) {
    const retryAfter = Math.max(1, Math.ceil((bucket.resetTime - now) / 1000))
    return new NextResponse(
      JSON.stringify({
        error: "Too Many Requests",
        message: "Astrxy Anti-DDoS Shield: Request rate limit exceeded. Please slow down.",
        retryAfter,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(maxRequests),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(bucket.resetTime),
          "X-DDoS-Shield": "Active",
        },
      }
    )
  }

  // 5. Forward request with HTTP security headers
  const response = NextResponse.next()

  response.headers.set("X-Frame-Options", "SAMEORIGIN")
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("X-XSS-Protection", "1; mode=block")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  response.headers.set("X-DDoS-Protection", "Astrxy-Shield-v2.0")

  return response
}

// Target ONLY API routes to protect backend and never block web pages
export const config = {
  matcher: ["/api/:path*"],
}
