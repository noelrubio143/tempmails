/**
 * Astrxy Sovereign Sync Engine (AstrxySyncEngine.ts)
 * -------------------------------------------------------------
 * 1. Synchronized Presence & Online Users between Site Header & Fleet Chat.
 * 2. Synchronized Staff & Moderator Roster between Admin Inspector & Fleet Chat Mod Panel.
 * 3. Cross-Device Real-Time Email Inbox Synchronization (Mobile & PC Multi-device).
 */

export interface SyncPresenceUser {
  id: string
  name: string
  email?: string
  role?: "admin" | "moderator" | "staff" | "member" | "visitor"
  channel?: string
  device?: "mobile" | "pc"
  lastSeen: number
}

export interface SyncStaffMember {
  id: string
  name: string
  email: string
  role: "admin" | "master" | "moderator" | "staff"
  status: "active" | "online" | "idle"
  addedAt: number
}

// Default sovereign staff matching Master Admin & Fleet Chat specifications
export const DEFAULT_SYNC_STAFF: SyncStaffMember[] = [
  {
    id: "staff_master_astrxy",
    name: "astrxy",
    email: "astrxy@beezelbub.com",
    role: "master",
    status: "online",
    addedAt: 1772000000000,
  },
]

class AstrxySyncEngineService {
  private broadcastChan: BroadcastChannel | null = null
  private listeners: Set<() => void> = new Set()

  constructor() {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        this.broadcastChan = new BroadcastChannel("astrxy_sync_bus")
        this.broadcastChan.onmessage = () => {
          this.notifyListeners()
        }
      } catch {}
    }
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }

  private notifyListeners() {
    this.listeners.forEach((cb) => {
      try {
        cb()
      } catch {}
    })
  }

  // --- 1. ONLINE USERS & PRESENCE SYNC (SITE HEADER <-> FLEET CHAT) ---
  public getSynchronizedOnlinePresence(
    siteVisitorCount: number,
    chatUsers: any[]
  ): { count: number; users: SyncPresenceUser[] } {
    const map = new Map<string, SyncPresenceUser>()
    const now = Date.now()

    // Add chat users
    if (Array.isArray(chatUsers)) {
      for (const u of chatUsers) {
        if (!u) continue
        const id = u.id || u.clientId || u.name || String(Math.random())
        map.set(id, {
          id,
          name: u.name || u.username || (u.email ? u.email.split("@")[0] : "Fleet Member"),
          email: u.email,
          role: u.role || (u.email === "astrxy@beezelbub.com" ? "admin" : "member"),
          channel: u.channel || "Public",
          lastSeen: u.lastSeen || now,
        })
      }
    }

    // Ensure Master Admin is present if logged in
    const isAdmin = typeof window !== "undefined" && window.localStorage.getItem("is_admin") === "true"
    if (isAdmin && !map.has("admin_astrxy")) {
      map.set("admin_astrxy", {
        id: "admin_astrxy",
        name: "astrxy (Master Admin)",
        email: "astrxy@beezelbub.com",
        role: "admin",
        channel: "Staff",
        lastSeen: now,
      })
    }

    const userList = Array.from(map.values())
    // Synchronize count: whichever is higher or active
    const finalCount = Math.max(siteVisitorCount || 1, userList.length, 1)

    return {
      count: finalCount,
      users: userList,
    }
  }

  // --- 2. STAFF & MODERATOR SYNC (ADMIN INSPECTOR <-> FLEET CHAT MOD PANEL) ---
  public getSynchronizedStaff(): SyncStaffMember[] {
    if (typeof window === "undefined") return DEFAULT_SYNC_STAFF
    try {
      const stored = window.localStorage.getItem("ast_global_staff_roster")
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch {}
    return DEFAULT_SYNC_STAFF
  }

  public saveSynchronizedStaff(staff: SyncStaffMember[]): void {
    if (typeof window === "undefined") return
    try {
      window.localStorage.setItem("ast_global_staff_roster", JSON.stringify(staff))
      if (this.broadcastChan) {
        this.broadcastChan.postMessage({ type: "STAFF_UPDATED", staff })
      }
      this.notifyListeners()
    } catch {}
  }

  // --- 3. MULTI-DEVICE INBOX EMAIL SYNCHRONIZATION ---
  public async syncCrossDeviceInbox(email: string): Promise<any[]> {
    const cleanEmail = (email || "").toLowerCase().trim()
    if (!cleanEmail) return []

    const t = Date.now()
    try {
      // 1. Fetch from server API with multi-endpoint fallback
      const [res0, res1] = await Promise.allSettled([
        fetch(`/api/inbox?email=${encodeURIComponent(cleanEmail)}&mailbox=${encodeURIComponent(cleanEmail)}&t=${t}`, {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
        }),
        fetch(`/api/get-messages?email=${encodeURIComponent(cleanEmail)}&mailbox=${encodeURIComponent(cleanEmail)}&t=${t}`, {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        }),
      ])

      let messages: any[] = []
      if (res0.status === "fulfilled" && res0.value.ok) {
        const data0 = await res0.value.json().catch(() => ({}))
        if (Array.isArray(data0.messages) && data0.messages.length > 0) {
          messages = data0.messages
        }
      }

      if (messages.length === 0 && res1.status === "fulfilled" && res1.value.ok) {
        const data1 = await res1.value.json().catch(() => ({}))
        if (Array.isArray(data1.messages) && data1.messages.length > 0) {
          messages = data1.messages
        }
      }

      // 2. Cross-tab & local storage cache synchronization
      if (typeof window !== "undefined") {
        if (messages.length > 0) {
          window.localStorage.setItem(`ast_inbox_${cleanEmail}`, JSON.stringify(messages.slice(0, 50)))
        } else {
          const cached = window.localStorage.getItem(`ast_inbox_${cleanEmail}`)
          if (cached) {
            const parsed = JSON.parse(cached)
            if (Array.isArray(parsed) && parsed.length > 0) messages = parsed
          }
        }
      }

      return messages
    } catch {
      return []
    }
  }

  // Dispatch outgoing email to server store so other devices receive it instantly
  public async broadcastEmailToServer(to: string, from: string, subject: string, body: string, html?: string): Promise<boolean> {
    try {
      const res = await fetch("/api/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send",
          to,
          from,
          subject,
          body,
          html,
          timestamp: Date.now(),
        }),
      })
      if (res.ok && this.broadcastChan) {
        this.broadcastChan.postMessage({ type: "NEW_EMAIL_RECEIVED", to })
      }
      return res.ok
    } catch {
      return false
    }
  }
}

export const AstrxySyncEngine = new AstrxySyncEngineService()
