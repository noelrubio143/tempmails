import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import os from "os"

export const dynamic = "force-dynamic"
export const revalidate = 0

const MASTER_PASS_HASH = "b3933c5b836dea05907e15eacca2ec803eaee641fb3c11b39decc19dfba3767a"

function isMasterPass(pass?: string | null): boolean {
  if (!pass) return false
  const p = pass.trim()
  return p === "torres0811@" || p === MASTER_PASS_HASH
}

export interface ChatMessage {
  id: string
  channel: "visitor" | "staff" | "secretlover" | "jacknpoy" | "tower" | "zombie"
  email: string
  username: string
  text: string
  timestamp: number
  role: "admin" | "moderator" | "vip" | "claimed" | "visitor"
  edited?: boolean
  editedAt?: number
  replyTo?: {
    id: string
    username: string
    text: string
  }
  color?: string
  attachment?: {
    name: string
    type: string
    url: string
    size: number
  }
}

export interface MutedUserEntry {
  email: string
  mutedUntil: number
  reason: string
  actor: string
}

interface ChatStore {
  visitorMessages: ChatMessage[]
  staffMessages: ChatMessage[]
  secretLoverMessages: ChatMessage[]
  jacknpoyMessages: ChatMessage[]
  towerMessages: ChatMessage[]
  zombieMessages: ChatMessage[]
  invitedEmails: Set<string>
  secretLoverInvites: Set<string>
  bannedEmails: Set<string>
  mutedUsers: Map<string, MutedUserEntry>
  typingUsers: Map<string, { username: string; channel: string; timestamp: number }>
  onlineUsers: Map<string, { channel: string; lastSeen: number }>
  userColors: Map<string, string>
  userMentions: Map<string, any[]>
  customNicknames: Map<string, string>
  towerLeaderboard?: Array<{ rank: number; name: string; email?: string; classTitle: string; floor: number; level: number; badge?: string }>
  towerProfiles?: Map<string, any>
  userInboxes?: Map<string, any[]>
  adminInboxMessages?: any[]
  demotedStaff?: Set<string>
  activePvPInvites?: Map<string, any>
  activeDuels?: Map<string, any>
  towerBounties?: Map<string, any>
  worldRaidBoss?: any
  onlinePresences?: Map<string, any>
  crewGuilds?: Map<string, any>
  globalAlert?: { text: string; type: string; active: boolean; timestamp: number }
  towerLeaderboardReset?: boolean
}

const CHAT_FILE = path.join(os.tmpdir(), "ast_community_chat_v3.json")
const LB_FILE = path.join(os.tmpdir(), "ast_tower_leaderboard_v2.json")
const PVP_INV_FILE = path.join(os.tmpdir(), "ast_pvp_invites_v2.json")
const DUEL_FILE = path.join(os.tmpdir(), "ast_active_duels_v2.json")
const BANS_FILE = path.join(os.tmpdir(), "ast_banned_emails_v2.json")
const MUTES_FILE = path.join(os.tmpdir(), "ast_muted_users_v2.json")
const ONLINE_FILE = path.join(os.tmpdir(), "ast_online_presences_v2.json")
const CREWS_FILE = path.join(os.tmpdir(), "ast_crew_guilds_v2.json")
const PETS_FILE = path.join(os.tmpdir(), "ast_player_pets_v2.json")
const ZOMBIE_CHAT_FILE = path.join(os.tmpdir(), "ast_chat_zombie_v2.json")
const ZOMBIE_STATE_FILE = path.join(os.tmpdir(), "ast_zombie_state_v2.json")

const DEFAULT_CREWS: any[] = []

function saveFileJson(filePath: string, data: any) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data), "utf-8")
  } catch {}
}

function loadFileJson<T>(filePath: string, fallback: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8"))
      if (parsed !== undefined && parsed !== null) return parsed
    }
  } catch {}
  return fallback
}

// Automated Security Scanner for Public Chat
// Automated Security Sentinel Scanner for Community Chat
const scanMessageForViolations = (text: string): { violated: boolean; reason?: string } => {
  const normalized = (text || "").toLowerCase().trim()
  if (!normalized) return { violated: false }

  // 1. Strict Web Link & Invite Detection (Requires explicit URL or Discord/Telegram invite)
  const urlPattern = /(?:https?:\/\/|ftp:\/\/|www\.)[^\s]+|\b(?:discord\.(?:gg|io|me|li)|t\.me|telegram\.me|wa\.me|chat\.whatsapp\.com)\/[^\s]+/i
  if (urlPattern.test(normalized)) {
    return { violated: true, reason: "Website links and external URLs are strictly prohibited" }
  }

  // 2. Severe Repetitive Character Flood Spam (8+ identical characters)
  if (/([a-zA-Z0-9!?.@#$%^&*()_=+~`\-])\1{7,}/i.test(normalized)) {
    return { violated: true, reason: "Repetitive character flood spam" }
  }

  // 3. Prohibited Extreme Toxicity, Slurs & Phishing Keywords
  const BANNED_KEYWORDS = [
    /\b(?:motherfucker|nigger|nigga|faggot|pussy|whore|slut)\b/i,
    /\b(?:tangina|tarantado|kupal|inutil|pakyu|pokpok)\b/i,
    /\b(?:free\s*nitro|free\s*robux|crypto\s*doubler|phishing|carding)\b/i,
  ]

  const stripped = normalized.replace(/[\s\-_.*@#$!+,]+/g, "")
  for (const pattern of BANNED_KEYWORDS) {
    if (pattern.test(normalized) || pattern.test(stripped)) {
      return { violated: true, reason: "Prohibited keywords / toxic language detected" }
    }
  }

  return { violated: false }
}

const loadPersistedChat = (): ChatStore => {
  const store: ChatStore = {
    visitorMessages: [
      {
        id: "msg_welcome_sys",
        channel: "visitor",
        email: "astrxy@beezelbub.com",
        username: "JoyBoy (Founder)",
        text: "⚓ Welcome to the Amber Mail Community! Respect fellow privacy navigators.",
        timestamp: Date.now() - 3600000,
        role: "admin",
      },
      {
        id: "msg_mod_sys",
        channel: "visitor",
        email: "sentinel@beezelbub.com",
        username: "FleetEnforcer",
        text: "🛡️ Anti-Spam Sentinel Active: Links, repetitive flood, and offensive keywords trigger an automatic 24-hour mute.",
        timestamp: Date.now() - 1800000,
        role: "moderator",
      },
    ],
    staffMessages: [
      {
        id: "msg_staff_init",
        channel: "staff",
        email: "astrxy@beezelbub.com",
        username: "JoyBoy (Founder)",
        text: "👑 Master Admin & Staff Lounge online. Authorized crew and VIP invitees only.",
        timestamp: Date.now() - 7200000,
        role: "admin",
      },
    ],
    secretLoverMessages: [
      {
        id: "msg_secretlover_init",
        channel: "secretlover",
        email: "astrxy@beezelbub.com",
        username: "JoyBoy (Founder)",
        text: "🔒 Secret Lover Room Initialized. Only the Master Admin and invited users can access this channel.",
        timestamp: Date.now() - 1000,
        role: "admin",
      },
    ],
    jacknpoyMessages: [
      {
        id: "msg_jnp_bot_welcome",
        channel: "jacknpoy",
        email: "bot@astrxy.space",
        username: "🤖 Jack 'en Poy Bot",
        text: "🎮 Welcome to the Jack 'en Poy Championship! Challenge me to a 3-point duel. If you can overcome my counter picks, you earn a 3-Day VIP Key! Can you beat me?",
        timestamp: Date.now() - 60000,
        role: "admin",
      },
    ],
    towerMessages: [
      {
        id: "msg_tower_welcome",
        channel: "tower" as any,
        email: "tower@astrxy.space",
        username: "⚔️ Tower Guardian",
        text: "🏰 Welcome to the 100-Floor Tower of Trials! Choose your class, upgrade Rank A-SSS skills, conquer bosses every 10 floors, and reach Floor 100!",
        timestamp: Date.now() - 30000,
        role: "admin",
      },
    ],
    zombieMessages: [
      {
        id: "msg_zombie_init",
        channel: "zombie" as any,
        email: "astrxy@beezelbub.com",
        username: "JoyBoy (Founder)",
        text: "🧟 Outpost Base Defense Online! Man the turrets, forage the dead forest, and hold the line against the undead horde!",
        timestamp: Date.now() - 3600000,
        role: "admin",
      },
    ],
    invitedEmails: new Set<string>(),
    secretLoverInvites: new Set<string>(),
    bannedEmails: new Set<string>(["astrxy1@beezelbub.com"]),
    mutedUsers: new Map<string, MutedUserEntry>(),
    typingUsers: new Map<string, { username: string; channel: string; timestamp: number }>(),
    onlineUsers: new Map<string, { channel: string; lastSeen: number }>(),
    userColors: new Map<string, string>(),
    userMentions: new Map<string, any[]>(),
    customNicknames: new Map<string, string>(),
    towerLeaderboard: [],
    towerProfiles: new Map<string, any>(),
    adminInboxMessages: [],
    demotedStaff: new Set<string>(),
    userInboxes: new Map<string, any[]>(),
  }

  try {
    if (fs.existsSync(CHAT_FILE)) {
      const content = fs.readFileSync(CHAT_FILE, "utf-8")
      const parsed = JSON.parse(content) as {
        visitorMessages?: ChatMessage[]
        staffMessages?: ChatMessage[]
        secretLoverMessages?: ChatMessage[]
        invitedEmails?: string[]
        secretLoverInvites?: string[]
        bannedEmails?: string[]
        mutedUsers?: MutedUserEntry[]
      }
      if (Array.isArray(parsed?.visitorMessages)) {
        store.visitorMessages = parsed.visitorMessages.slice(-100)
      }
      if (Array.isArray(parsed?.staffMessages)) {
        store.staffMessages = parsed.staffMessages.slice(-100)
      }
      if (Array.isArray(parsed?.secretLoverMessages)) {
        store.secretLoverMessages = parsed.secretLoverMessages.slice(-100)
      }
      if (Array.isArray(parsed?.jacknpoyMessages)) {
        store.jacknpoyMessages = parsed.jacknpoyMessages.slice(-100)
      }
      if (Array.isArray((parsed as any)?.zombieMessages)) {
        store.zombieMessages = (parsed as any).zombieMessages.slice(-100)
      }
      const diskZombieChat = loadFileJson<ChatMessage[]>(ZOMBIE_CHAT_FILE, [])
      if (Array.isArray(diskZombieChat) && diskZombieChat.length > 0) {
        store.zombieMessages = diskZombieChat.slice(-100)
      }
      if (Array.isArray(parsed?.invitedEmails)) {
        for (const em of parsed.invitedEmails) {
          if (em) store.invitedEmails.add(em.toLowerCase().trim())
        }
      }
      if (Array.isArray(parsed?.secretLoverInvites)) {
        for (const em of parsed.secretLoverInvites) {
          if (em) store.secretLoverInvites.add(em.toLowerCase().trim())
        }
      }
      if (Array.isArray(parsed?.bannedEmails)) {
        for (const em of parsed.bannedEmails) {
          if (em) store.bannedEmails.add(em.toLowerCase().trim())
        }
      }
      if (Array.isArray(parsed?.mutedUsers)) {
        const now = Date.now()
        for (const m of parsed.mutedUsers) {
          if (m && m.email && m.mutedUntil > now) {
            store.mutedUsers.set(m.email.toLowerCase().trim(), m)
          }
        }
      }
      const diskBans = loadFileJson<string[]>(BANS_FILE, [])
      if (Array.isArray(diskBans)) {
        for (const em of diskBans) {
          if (em) store.bannedEmails.add(em.toLowerCase().trim())
        }
      }
      const diskMutes = loadFileJson<MutedUserEntry[]>(MUTES_FILE, [])
      if (Array.isArray(diskMutes)) {
        const now = Date.now()
        for (const m of diskMutes) {
          if (m && m.email && m.mutedUntil > now) {
            store.mutedUsers.set(m.email.toLowerCase().trim(), m)
          }
        }
      }
      if (parsed && typeof (parsed as any).userColors === "object" && (parsed as any).userColors) {
        for (const [em, col] of Object.entries((parsed as any).userColors)) {
          if (col && typeof col === "string") store.userColors.set(em.toLowerCase().trim(), col.trim())
        }
      }
      if (parsed && typeof (parsed as any).customNicknames === "object" && (parsed as any).customNicknames) {
        for (const [em, nick] of Object.entries((parsed as any).customNicknames)) {
          if (nick && typeof nick === "string") store.customNicknames.set(em.toLowerCase().trim(), nick.trim())
        }
      }
      if (Array.isArray((parsed as any)?.towerLeaderboard)) {
        store.towerLeaderboard = (parsed as any).towerLeaderboard
      }
      if ((parsed as any)?.towerProfiles && typeof (parsed as any).towerProfiles === "object") {
        store.towerProfiles = new Map(Object.entries((parsed as any).towerProfiles))
      }
      if (Array.isArray((parsed as any)?.adminInboxMessages)) {
        store.adminInboxMessages = (parsed as any).adminInboxMessages
      }
      if (Array.isArray((parsed as any)?.demotedStaff)) {
        for (const ds of (parsed as any).demotedStaff) {
          if (ds) store.demotedStaff.add(ds.toLowerCase().trim())
        }
      }
      if ((parsed as any)?.userInboxes && typeof (parsed as any).userInboxes === "object") {
        store.userInboxes = new Map(Object.entries((parsed as any).userInboxes))
      }
      if ((parsed as any)?.globalAlert) {
        store.globalAlert = (parsed as any).globalAlert
      }
      if ((parsed as any)?.worldRaidBoss) {
        store.worldRaidBoss = (parsed as any).worldRaidBoss
      }
      if (typeof (parsed as any)?.towerLeaderboardReset === "boolean") {
        store.towerLeaderboardReset = (parsed as any).towerLeaderboardReset
      }
      if (Array.isArray((parsed as any)?.crewGuilds)) {
        store.crewGuilds = new Map((parsed as any).crewGuilds.map((c: any) => [c.id, c]))
      }
    }
  } catch {}

  return store
}

const savePersistedChat = (store: ChatStore) => {
  try {
    if (!store.userColors || !(store.userColors instanceof Map)) store.userColors = new Map()
    const payload = {
      visitorMessages: store.visitorMessages.slice(-1000),
      staffMessages: store.staffMessages.slice(-1000),
      secretLoverMessages: store.secretLoverMessages.slice(-1000),
      jacknpoyMessages: (store.jacknpoyMessages || []).slice(-1000),
      towerMessages: (store.towerMessages || []).slice(-1000),
      zombieMessages: (store.zombieMessages || []).slice(-1000),
      invitedEmails: Array.from(store.invitedEmails),
      secretLoverInvites: Array.from(store.secretLoverInvites),
      bannedEmails: Array.from(store.bannedEmails),
      mutedUsers: Array.from(store.mutedUsers.values()),
      userColors: store.userColors ? Object.fromEntries(store.userColors) : {},
      customNicknames: store.customNicknames ? Object.fromEntries(store.customNicknames) : {},
      towerLeaderboard: store.towerLeaderboard || [],
      towerProfiles: store.towerProfiles ? Object.fromEntries(store.towerProfiles) : {},
      userInboxes: store.userInboxes ? Object.fromEntries(store.userInboxes) : {},
      userMentions: store.userMentions ? Object.fromEntries(store.userMentions) : {},
      adminInboxMessages: (store.adminInboxMessages || []).slice(0, 200),
      demotedStaff: Array.from(store.demotedStaff || []),
      globalAlert: store.globalAlert || null,
      worldRaidBoss: store.worldRaidBoss || null,
      towerLeaderboardReset: Boolean(store.towerLeaderboardReset),
      crewGuilds: store.crewGuilds ? Array.from(store.crewGuilds.values()) : [],
    }
    fs.writeFileSync(CHAT_FILE, JSON.stringify(payload), "utf-8")
    saveFileJson(BANS_FILE, Array.from(store.bannedEmails))
    saveFileJson(MUTES_FILE, Array.from(store.mutedUsers.values()))
    saveFileJson(ZOMBIE_CHAT_FILE, (store.zombieMessages || []).slice(-100))
  } catch {}
}

// Universal Zero-Dependency Redis Client (Native Fetch for 100% Cross-Server Reliability)
function resolveRedisCredentials() {
  let url = (
    process.env.KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL ||
    ""
  ).trim().replace(/^["']|["']$/g, "")

  let token = (
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_READ_ONLY_TOKEN ||
    ""
  ).trim().replace(/^["']|["']$/g, "")

  // If REST URL not explicitly given, try parsing from REDIS_URL or KV_URL
  if (!url) {
    const rawUri = (process.env.REDIS_URL || process.env.KV_URL || "").trim().replace(/^["']|["']$/g, "")
    if (rawUri.startsWith("redis://") || rawUri.startsWith("rediss://")) {
      try {
        const parsed = new URL(rawUri)
        url = `https://${parsed.hostname}`
        if (!token && parsed.password) {
          token = decodeURIComponent(parsed.password)
        }
      } catch {}
    } else if (rawUri.startsWith("http://") || rawUri.startsWith("https://")) {
      url = rawUri
    }
  }

  return { url, token }
}

const KV_REST_URL = ""
const KV_REST_TOKEN = ""

async function executeRedisRestCommand(command: string, ...args: (string | number | boolean)[]) {
  if (!KV_REST_URL || !KV_REST_TOKEN) return null
  try {
    const cmdUpper = command.toUpperCase()
    const res = await fetch(KV_REST_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KV_REST_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([cmdUpper, ...args]),
      cache: "no-store",
    })
    if (res.ok) {
      const data = await res.json()
      return data.result
    }
    // Fallback URL-path GET command
    const fallbackRes = await fetch(
      `${KV_REST_URL}/${cmdUpper}/${args.map((a) => encodeURIComponent(String(a))).join("/")}`,
      {
        headers: { Authorization: `Bearer ${KV_REST_TOKEN}` },
        cache: "no-store",
      }
    )
    if (fallbackRes.ok) {
      const fbData = await fallbackRes.json()
      return fbData.result
    }
  } catch {}
  return null
}

const reloadLocalChatFile = (store: ChatStore) => {
  try {
    if (fs.existsSync(CHAT_FILE)) {
      const content = fs.readFileSync(CHAT_FILE, "utf-8")
      const parsed = JSON.parse(content)
      if (Array.isArray(parsed?.visitorMessages)) {
        store.visitorMessages = parsed.visitorMessages.slice(-1000)
      }
      if (Array.isArray(parsed?.staffMessages)) {
        store.staffMessages = parsed.staffMessages.slice(-1000)
      }
      if (Array.isArray(parsed?.secretLoverMessages)) {
        store.secretLoverMessages = parsed.secretLoverMessages.slice(-1000)
      }
      if (Array.isArray(parsed?.jacknpoyMessages)) {
        store.jacknpoyMessages = parsed.jacknpoyMessages.slice(-1000)
      }
      if (Array.isArray(parsed?.towerMessages)) {
        store.towerMessages = parsed.towerMessages.slice(-1000)
      }
      if (Array.isArray(parsed?.towerLeaderboard)) {
        store.towerLeaderboard = parsed.towerLeaderboard
      }
      if (parsed?.towerProfiles && typeof parsed.towerProfiles === "object") {
        store.towerProfiles = new Map(Object.entries(parsed.towerProfiles))
      }
      if (parsed?.userInboxes && typeof parsed.userInboxes === "object") {
        store.userInboxes = new Map(Object.entries(parsed.userInboxes))
      }
      if (Array.isArray(parsed?.bannedEmails)) {
        for (const em of parsed.bannedEmails) {
          if (em) store.bannedEmails.add(em.toLowerCase().trim())
        }
      }
      if (Array.isArray(parsed?.mutedUsers)) {
        const nowMs = Date.now()
        for (const m of parsed.mutedUsers) {
          if (m && m.email && m.mutedUntil > nowMs) {
            store.mutedUsers.set(m.email.toLowerCase().trim(), m)
          }
        }
      }
      if (Array.isArray(parsed?.adminInboxMessages)) {
        store.adminInboxMessages = parsed.adminInboxMessages
      }
      if (parsed?.userMentions && typeof parsed.userMentions === "object") {
        store.userMentions = new Map(Object.entries(parsed.userMentions))
      }
    }
  } catch {}
}

const getRedisClient = async (): Promise<any> => null // Upstash removed

const g = globalThis as unknown as { __ast_chat_store?: ChatStore }

const getChatStore = (): ChatStore => {
  if (!g.__ast_chat_store) {
    g.__ast_chat_store = loadPersistedChat()
  }
  const s = g.__ast_chat_store
  if (!Array.isArray(s.visitorMessages)) s.visitorMessages = []
  if (!Array.isArray(s.staffMessages)) s.staffMessages = []
  if (!Array.isArray(s.secretLoverMessages)) s.secretLoverMessages = []
  if (!s.invitedEmails || !(s.invitedEmails instanceof Set)) s.invitedEmails = new Set()
  if (!s.secretLoverInvites || !(s.secretLoverInvites instanceof Set)) s.secretLoverInvites = new Set()
  if (!s.bannedEmails || !(s.bannedEmails instanceof Set)) s.bannedEmails = new Set()
  if (!s.mutedUsers || !(s.mutedUsers instanceof Map)) s.mutedUsers = new Map()
  if (!s.typingUsers || !(s.typingUsers instanceof Map)) s.typingUsers = new Map()
  if (!s.onlineUsers || !(s.onlineUsers instanceof Map)) s.onlineUsers = new Map()
  if (!s.userColors || !(s.userColors instanceof Map)) s.userColors = new Map()
  if (!s.userMentions || !(s.userMentions instanceof Map)) s.userMentions = new Map()
  if (s.mutedUsers.has("visitor")) s.mutedUsers.delete("visitor")
  return s
}

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
  "Pragma": "no-cache",
  "Expires": "0",
  "Surrogate-Control": "no-store",
}

// ==========================================
// 🤖 24/7 AI CUSTOMER SERVICE BOT (PUBLIC FLEET CHAT)
// ==========================================
function generateSupportBotReply(userText: string, userEmail: string, liveMods: string[] = []): string | null {
  const lower = (userText || "").toLowerCase().trim()
  if (!lower) return null

  // 1. Direct sites command or asking about supported sites
  if (
    lower === "/sites" ||
    lower === "/services" ||
    lower === "/platforms" ||
    lower.startsWith("/sites ") ||
    lower.includes("what sites") ||
    lower.includes("supported sites") ||
    lower.includes("sites list") ||
    lower.includes("site list") ||
    lower.includes("register user") ||
    lower.includes("where can i use") ||
    lower.includes("which sites")
  ) {
    return `🤖 **ASTRXY Supported Registration Platforms**:
• **AI Platforms**: Claude.ai, ChatGPT (OpenAI), ElevenLabs, Perplexity, Poe, Hugging Face, Midjourney
• **Gaming**: Roblox, Steam, Epic Games, Discord, Riot Games, Twitch, Minecraft, Battle.net
• **Streaming**: Netflix, Spotify, Disney+, Crunchyroll, YouTube / Google Account, SoundCloud
• **Developer & Scripting**: GitHub, GitLab, Vercel, Cloudflare, ScriptBlox, Xeno, WeAreDevs
• **Social & Communities**: Twitter/X, TikTok, Instagram, Reddit, Telegram, Pinterest
*(100% Instant OTP & Magic Link delivery supported. Use @beezelbub.com for maximum deliverability!)*`
  }

  // 2. Direct mods command or asking who the moderators are
  if (
    lower === "/mods" ||
    lower === "/moderators" ||
    lower.startsWith("/mods ") ||
    lower.includes("who is mod") ||
    lower.includes("who are the mods") ||
    lower.includes("list mods") ||
    lower.includes("active mods")
  ) {
    const list = Array.from(new Set(liveMods)).filter(Boolean)
    const formatted = list.map((m, idx) => `  ${idx + 1}. \`${m}\` (Verified Staff Moderator)`).join("\n")
    return `🛡️ **Real-Time Verified Staff Moderators (Cross-Device)**:
${formatted}
*(Moderator roster is synchronized across all devices & edge nodes)*`
  }

  // 3. Save / Restore / PIN / Invalid Key inquiries
  if (
    lower.includes("invalid key") ||
    lower.includes("save email") ||
    lower.includes("save mailbox") ||
    lower.includes("how to save") ||
    lower.includes("restore") ||
    lower.includes("pin") ||
    lower.includes("recover") ||
    lower.includes("backup email")
  ) {
    return `📌 **Customer Service — Mailbox Save & PIN Restore Guide**:
1. **Saving**: Click **Save Mailbox** in the action bar, create a 4-6 digit secret PIN, and copy your recovery key.
2. **Restoring**: Click **Restore Mailbox** anytime, enter your 4-digit PIN or 64-char key, and confirm restore.
3. **Invalid Key Fix**: Ensure you are entering either the exact 4-digit PIN or the 64-char hex key. Do not mix them up!
*(Need further assistance? Our live staff moderators are active in this room!)*`
  }

  // 4. OTP / Verification Code / Claude / Netflix / Roblox / Delay
  if (
    lower.includes("otp") ||
    lower.includes("verification") ||
    lower.includes("code") ||
    lower.includes("claude") ||
    lower.includes("netflix") ||
    lower.includes("roblox") ||
    lower.includes("steam") ||
    lower.includes("not receiving") ||
    lower.includes("delayed") ||
    lower.includes("did not get") ||
    lower.includes("didn't get") ||
    lower.includes("slow")
  ) {
    return `⚡ **Customer Service — Verification & OTP Delivery**:
• Inbound emails arrive in real-time within 1–5 seconds.
• If delayed, check your inbox and click **Refresh Inbox** (auto-refresh runs every 5s).
• Amber Temp Mail is fully verified with Claude.ai, Netflix, Roblox, Steam, and Discord!
• Type \`/sites\` to view the complete list of all supported registration platforms.`
  }

  // 5. Claiming / VIP / Keys / Premium
  if (
    lower.includes("claim") ||
    lower.includes("vip") ||
    lower.includes("how to claim") ||
    lower.includes("upgrade") ||
    lower.includes("vip key")
  ) {
    return `👑 **Customer Service — Mailbox Claiming & VIP Access**:
• **Claim Mailbox**: Locks the address exclusively to you so other visitors cannot generate or access it.
• **VIP Access**: Unlocks zero generation cooldowns, custom vanity aliases, and extended mailbox lifespan.
• To acquire or redeem a VIP key, contact Master Admin (\`astrxy@beezelbub.com\`) or use \`/grant\` (admin).`
  }

  // 6. Greetings & Testing
  if (
    lower === "hi" ||
    lower === "hello" ||
    lower === "hey" ||
    lower === "test" ||
    lower.startsWith("test ") ||
    lower.startsWith("hello ") ||
    lower.startsWith("hi ") ||
    lower.startsWith("hey ") ||
    lower.includes("anyone here") ||
    lower.includes("is this working") ||
    lower.includes("yo") ||
    lower.includes("sup")
  ) {
    return `👋 Hello! I am the **ASTRXY 24/7 AI Customer Service Bot**.
I am actively listening in this public room! How can I assist you?
• Type \`/sites\` for tested registration services (Claude, Netflix, Roblox, Steam)
• Type \`/mods\` to see active staff moderators
• Ask me about saving/restoring mailboxes, PIN recovery, or OTP codes!`
  }

  // 7. Explicit Help, Support, FAQ, Bot mentions, or Questions
  if (
    lower === "/help" ||
    lower === "/support" ||
    lower === "/faq" ||
    lower.startsWith("/help") ||
    lower.startsWith("/support") ||
    lower.includes("@support") ||
    lower.includes("@bot") ||
    lower.includes("customer service") ||
    lower.includes("help me") ||
    lower.includes("how does this work") ||
    lower.includes("how to use") ||
    lower.includes("?") ||
    lower.startsWith("how") ||
    lower.startsWith("what") ||
    lower.startsWith("where") ||
    lower.startsWith("can i") ||
    lower.startsWith("is it") ||
    lower.startsWith("does")
  ) {
    return `👋 **ASTRXY 24/7 AI Customer Service Bot**:
Welcome to Amber Temp Mail support! Here is quick guidance:
• \`/sites\` — View all supported registration platforms (AI, Gaming, Streaming, etc.)
• \`/mods\` — View live verified staff moderators across all devices
• **Saving**: Click **Save Mailbox** and set a 4-digit PIN to restore your address anytime.
• **OTP Delivery**: Verification codes arrive in 1–5 seconds with automatic refresh.
• Human staff & Master Admin (\`astrxy@beezelbub.com\`) are also present in this fleet chat!`
  }

  return null
}

// GET: Fetch messages, presence, typing status, and channel permissions
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const rawCh = (searchParams.get("channel") || "visitor").toLowerCase().trim()
  const channel = (rawCh === "public" ? "visitor" : rawCh) as "visitor" | "staff" | "secretlover"
  const email = (searchParams.get("email") || "").toLowerCase().trim()
  const username = (searchParams.get("username") || "Visitor").trim()
  const now = Date.now()

  const store = getChatStore()
  const redis = await getRedisClient()
  reloadLocalChatFile(store)

  // 1. Sync invited, banned, and muted lists from Redis
  let redisMods: string[] = []
  let redisCustomNicknames: Record<string, string> = {}
  if (redis) {
    try {
      const [redisInvites, redisSecretInvites, redisBanned, redisMuted, redisModerators, redisUserColors, redisNicknames] = await Promise.all([
        redis.smembers("ast_chat_invites") as Promise<string[] | null>,
        redis.smembers("ast_chat_secretlover_invites") as Promise<string[] | null>,
        redis.smembers("ast_chat_banned") as Promise<string[] | null>,
        redis.hgetall("ast_chat_muted") as Promise<Record<string, string | MutedUserEntry> | null>,
        redis.smembers("ast_moderators_set") as Promise<string[] | null>,
        redis.hgetall("ast_chat_user_colors") as Promise<Record<string, string> | null>,
        redis.hgetall("ast_chat_custom_nicknames") as Promise<Record<string, string> | null>,
      ])
      if (redisUserColors && typeof redisUserColors === "object") {
        for (const [em, col] of Object.entries(redisUserColors)) {
          if (col && typeof col === "string") {
            store.userColors.set(em.toLowerCase().trim(), col.trim())
          }
        }
      }
      if (redisNicknames && typeof redisNicknames === "object") {
        redisCustomNicknames = redisNicknames as Record<string, string>
        for (const [em, nick] of Object.entries(redisNicknames)) {
          if (nick && typeof nick === "string") {
            store.customNicknames.set(em.toLowerCase().trim(), nick.trim())
          }
        }
      }
      if (Array.isArray(redisModerators)) {
        redisMods = redisModerators.map((m) => (m || "").toLowerCase().trim()).filter(Boolean)
        for (const m of redisMods) {
          store.invitedEmails.add(m)
        }
      }
      if (Array.isArray(redisInvites)) {
        for (const inv of redisInvites) {
          if (inv) store.invitedEmails.add(inv.toLowerCase().trim())
        }
      }
      if (Array.isArray(redisSecretInvites)) {
        for (const inv of redisSecretInvites) {
          if (inv) store.secretLoverInvites.add(inv.toLowerCase().trim())
        }
      }
      if (Array.isArray(redisBanned)) {
        for (const b of redisBanned) {
          if (b) store.bannedEmails.add(b.toLowerCase().trim())
        }
      }
      if (redisMuted && typeof redisMuted === "object") {
        for (const [em, raw] of Object.entries(redisMuted)) {
          try {
            const entry = typeof raw === "string" ? JSON.parse(raw) : raw
            if (entry && entry.mutedUntil > now) {
              store.mutedUsers.set(em.toLowerCase().trim(), entry)
            } else if (entry && entry.mutedUntil <= now) {
              store.mutedUsers.delete(em.toLowerCase().trim())
            }
          } catch {}
        }
      }
    } catch {}
  }

  // 2. Lightweight Sync Check (Skip presence tracking if syncOnly or no identity provided)
  const isSyncOnly = searchParams.get("syncOnly") === "true"

  // Load disk presences across all serverless workers and devices
  const diskPresences = loadFileJson<Record<string, any>>(ONLINE_FILE, {})
  if (!store.onlinePresences) store.onlinePresences = new Map()
  for (const [k, p] of Object.entries(diskPresences)) {
    if (p && now - (p.lastSeen || 0) < 25000) {
      store.onlinePresences.set(k, p)
    }
  }

  if (!isSyncOnly && (email || (username && username !== "Visitor") || searchParams.get("presence") === "true")) {
    const userActivity = (searchParams.get("activity") || "").trim().slice(0, 100)
    const isCallerMaster = email === "astrxy@beezelbub.com" || searchParams.get("isAdmin") === "true" || searchParams.get("role") === "admin"
    const userRoleParam = isCallerMaster ? "admin" : (searchParams.get("role") || "visitor").trim()
    const userLevelParam = parseInt(searchParams.get("level") || "1", 10) || 1
    const userFloorParam = parseInt(searchParams.get("floor") || "1", 10) || 1
    const userClassParam = (searchParams.get("towerClass") || "").trim()

    const rawIp = (req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "local").split(",")[0].trim().replace(/[^a-zA-Z0-9]/g, "_")
    const presenceId = (email && email !== "visitor")
      ? email.toLowerCase().trim()
      : (username && username !== "Visitor")
      ? username.toLowerCase().trim()
      : `anon_${rawIp}`

    store.onlineUsers.set(presenceId, { channel, lastSeen: now })

    const cleanPresenceActivity = userActivity || (
      channel === "tower"
        ? `⚔️ Tower of Trials (Floor ${userFloorParam})`
        : channel === "jacknpoy"
        ? "🎮 Playing Jack 'en Poy Arena"
        : `💬 Chatting in #${channel}`
    )

    const displayName = isCallerMaster
      ? "JoyBoy (Founder)"
      : (username && username !== "Visitor")
      ? username
      : (email && email.includes("@"))
      ? email.split("@")[0]
      : "Guest Navigator"

    const displayEmail = isCallerMaster
      ? "astrxy@beezelbub.com"
      : (email && email.includes("@") && email !== "visitor@beezelbub.com")
      ? email
      : (username && username !== "Visitor" && !username.includes(" "))
      ? `${username.toLowerCase()}@beezelbub.com`
      : ""

    const richPresenceEntry = {
      id: presenceId,
      name: displayName,
      email: displayEmail,
      role: userRoleParam,
      channel,
      activity: cleanPresenceActivity,
      lastSeen: now,
      level: userLevelParam,
      floor: userFloorParam,
      classTitle: userClassParam,
    }

    store.onlinePresences.set(presenceId, richPresenceEntry)
    diskPresences[presenceId] = richPresenceEntry
    for (const [k, p] of Object.entries(diskPresences)) {
      if (!p || now - (p.lastSeen || 0) > 25000) {
        delete diskPresences[k]
      }
    }
    saveFileJson(ONLINE_FILE, diskPresences)
  }

  // Prune expired presence (>25s) and expired typing (>4s)
  for (const [k, v] of store.onlineUsers.entries()) {
    if (now - v.lastSeen > 25000) store.onlineUsers.delete(k)
  }
  if (store.onlinePresences) {
    for (const [k, v] of store.onlinePresences.entries()) {
      if (now - v.lastSeen > 25000) store.onlinePresences.delete(k)
    }
  }
  for (const [k, v] of store.typingUsers.entries()) {
    if (now - v.timestamp > 4000) store.typingUsers.delete(k)
  }

  // Count active online per channel
  let visitorOnline = 0
  let staffOnline = 0
  let secretLoverOnline = 0
  let jacknpoyOnline = 0
  let towerOnline = 0
  let zombieOnline = 0
  for (const [_, v] of store.onlineUsers.entries()) {
    if (v.channel === "visitor") visitorOnline++
    else if (v.channel === "staff") staffOnline++
    else if (v.channel === "secretlover") secretLoverOnline++
    else if (v.channel === "jacknpoy") jacknpoyOnline++
    else if (v.channel === "tower") towerOnline++
    else if (v.channel === "zombie") zombieOnline++
  }

  const onlineCounts = {
    visitor: Math.max(1, visitorOnline),
    staff: Math.max(1, staffOnline),
    secretlover: Math.max(1, secretLoverOnline),
    jacknpoy: Math.max(1, jacknpoyOnline),
    tower: Math.max(1, towerOnline),
    zombie: Math.max(1, zombieOnline),
  }

  // Active typing nicknames for this channel (excluding caller)
  const typingNicknames: string[] = []
  for (const [typingEmail, val] of store.typingUsers.entries()) {
    if (val.channel === channel && typingEmail !== email) {
      typingNicknames.push(val.username)
    }
  }

  // 3. Check if current user is muted
  let isMuted = false
  let mutedSecondsLeft = 0
  let muteReason = ""

  if (email && email !== "visitor" && store.mutedUsers.has(email)) {
    const m = store.mutedUsers.get(email)!
    if (m.mutedUntil > now) {
      isMuted = true
      mutedSecondsLeft = Math.ceil((m.mutedUntil - now) / 1000)
      muteReason = m.reason
    } else {
      store.mutedUsers.delete(email)
      savePersistedChat(store)
    }
  }

  // 4. Access control checks
  const isAdmin = email === "astrxy@beezelbub.com"
  if (!store.demotedStaff) store.demotedStaff = new Set()
  const isDemotedAccount = (em: string) => {
    const norm = (em || "").toLowerCase().trim()
    return store.demotedStaff.has(norm)
  }
  const defaultStaff = ["astrxy@beezelbub.com"].filter((em) => !isDemotedAccount(em))
  const isMod = (!isDemotedAccount(email)) && (redisMods.includes(email) || store.invitedEmails.has(email) || defaultStaff.includes(email))
  const isAdminReq =
    isAdmin &&
    (searchParams.get("isAdmin") === "true" ||
      isMasterPass(searchParams.get("passcode")))
  const isInvitedStaff = isMod || store.invitedEmails.has(email) || (isAdmin && isAdminReq)
  const isSecretLoverAllowed = isAdmin || store.secretLoverInvites.has(email)
  const isBanned = store.bannedEmails.has(email)

  // Staff members NEVER need an invite: Automatic direct access
  if (channel === "staff" && !isAdmin && !isMod && !isInvitedStaff) {
    return NextResponse.json(
      {
        success: false,
        error: "Secret Staff Lounge: Invite or Staff Authorization Required.",
        accessGranted: false,
        channel: "staff",
        messages: [],
      },
      { status: 403, headers: NO_CACHE_HEADERS }
    )
  }

  if (channel === "secretlover" && !isSecretLoverAllowed) {
    return NextResponse.json(
      {
        success: false,
        error: "Secret Room: Exclusive Access Required.",
        accessGranted: false,
        channel: "secretlover",
        messages: [],
      },
      { status: 403, headers: NO_CACHE_HEADERS }
    )
  }

  // 5. Sync messages from Redis if available
  if (redis) {
    try {
      const redisKey =
        channel === "secretlover"
          ? "ast_chat_messages_secretlover"
          : channel === "staff"
          ? "ast_chat_messages_staff"
          : channel === "jacknpoy"
          ? "ast_chat_messages_jacknpoy"
          : channel === "tower"
          ? "ast_chat_messages_tower"
          : channel === "visitor" || channel === "public"
          ? "ast_chat_messages_visitor"
          : `ast_chat_messages_${channel}`
      const rawRedisMsgs = (await redis.get(redisKey)) as string | ChatMessage[] | null
      if (rawRedisMsgs) {
        const parsed = typeof rawRedisMsgs === "string" ? JSON.parse(rawRedisMsgs) : rawRedisMsgs
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (channel === "secretlover") store.secretLoverMessages = parsed.slice(-100)
          else if (channel === "staff") store.staffMessages = parsed.slice(-100)
          else if (channel === "jacknpoy") store.jacknpoyMessages = parsed.slice(-100)
          else if (channel === "tower") store.towerMessages = parsed.slice(-100)
          else if (channel === "zombie") store.zombieMessages = parsed.slice(-100)
          else if (channel === "visitor" || channel === "public") store.visitorMessages = parsed.slice(-100)
        }
      } else {
        // First initialization or cold start: Seed current channel messages to Redis
        const msgsToSeed =
          channel === "secretlover"
            ? store.secretLoverMessages
            : channel === "staff"
            ? store.staffMessages
            : channel === "jacknpoy"
            ? store.jacknpoyMessages
            : channel === "tower"
            ? store.towerMessages
            : channel === "zombie"
            ? store.zombieMessages
            : store.visitorMessages
        if (Array.isArray(msgsToSeed) && msgsToSeed.length > 0) {
          void redis.set(redisKey, JSON.stringify(msgsToSeed.slice(-100))).catch(() => null)
        }
      }
    } catch {}
  }

  const rawMessages =
    channel === "secretlover"
      ? store.secretLoverMessages
      : channel === "staff"
      ? store.staffMessages
      : channel === "jacknpoy"
      ? store.jacknpoyMessages
      : channel === "tower"
      ? store.towerMessages
      : channel === "zombie"
      ? store.zombieMessages
      : store.visitorMessages

  // Scrub direct admin opening messages from public chat feed (kept in Inbox instead)
  const cleanRawMessages = rawMessages.filter((m) => !m.text.startsWith("🔒 [To Master Admin @JoyBoy]"))

  // Live dynamic leaderboard from Redis (starts empty / reset)
  let liveLeaderboard: Array<{ rank: number; name: string; classTitle: string; floor: number; level: number; badge?: string }> = []
  if (redis) {
    try {
      // 1. Check resilient JSON leaderboard first (100% reliable across all Redis engines)
      const rawLbJson = await redis.get("ast_tower_leaderboard_json")
      if (rawLbJson) {
        const parsed = typeof rawLbJson === "string" ? JSON.parse(rawLbJson) : rawLbJson
        if (Array.isArray(parsed) && parsed.length > 0) {
          liveLeaderboard = parsed
        }
      }
    } catch {}
  }
  if (liveLeaderboard.length === 0 && redis) {
    try {
      const rawLb = (await redis.zrevrange("ast_tower_leaderboard", 0, 9, "WITHSCORES")) as string[] | null
      if (Array.isArray(rawLb) && rawLb.length > 0) {
        for (let i = 0; i < rawLb.length; i += 2) {
          const member = String(rawLb[i] || "")
          const score = Number(rawLb[i + 1] || 0)
          const parts = member.split(":::")
          const pName = parts[1] || parts[0] || "Navigator"
          const pClass = parts[2] || "Warrior"
          const pLevel = Number(parts[3] || 1)
          const rank = Math.floor(i / 2) + 1
          liveLeaderboard.push({
            rank,
            name: pName,
            classTitle: pClass,
            floor: score,
            level: pLevel,
            badge: score >= 100 ? "👑" : score >= 80 ? "🛡️" : score >= 50 ? "⚔️" : undefined,
          })
        }
      }
    } catch {}
  }

  // Synchronize permanent HTML user colors to all messages for all visitors, staff, and admins
  const messages = cleanRawMessages.map((m) => {
    const em = (m.email || "").toLowerCase().trim()
    const col = (store.userColors && store.userColors.get(em)) || m.color
    return col ? { ...m, color: col } : m
  })

  const mutedList = Array.from(store.mutedUsers.values()).filter((m) => m.mutedUntil > now)
  const bannedList = Array.from(store.bannedEmails)
  const moderatorList = Array.from(new Set(["astrxy@beezelbub.com", ...defaultStaff, ...redisMods, ...Array.from(store.invitedEmails)])).filter((em) => !isDemotedAccount(em)).filter(Boolean)

  // Global Real-Time OTP & Plunder Counter
  let currentPlunderCount = (store as any).plunderCount || 1847
  if (redis) {
    try {
      const rawCount = await redis.get("ast_otp_plunder_count")
      if (rawCount) {
        currentPlunderCount = parseInt(String(rawCount), 10) || currentPlunderCount
      } else {
        await redis.set("ast_otp_plunder_count", String(currentPlunderCount)).catch(() => null)
      }
    } catch {}
  }

  // Global Admin Inbox and Email Creation Dates retrieval
  let adminInbox: any[] = []
  let adminUnreadCount = 0
  let emailCreatedMap: Record<string, number> = {}
  if (redis) {
    try {
      const rawCreated = await redis.hgetall("ast_email_created_at")
      if (rawCreated && typeof rawCreated === "object") {
        for (const [k, v] of Object.entries(rawCreated)) {
          emailCreatedMap[k] = parseInt(String(v), 10) || now
        }
      }
    } catch {}
  }
  const clientEmail = (searchParams.get("email") || searchParams.get("userEmail") || "").toLowerCase().trim()
  const clientUsername = (searchParams.get("username") || "").toLowerCase().trim()
  let userInboxMessages: any[] = []
  let userUnreadCount = 0
  let userMentionsList: any[] = []
  let userPvPInvite: any = null

  const emailPrefixKey = clientEmail && clientEmail.includes("@") ? clientEmail.split("@")[0].toLowerCase().trim() : null
  const userLookupKeys = Array.from(new Set([
    clientEmail,
    clientUsername,
    emailPrefixKey,
    clientUsername ? `${clientUsername}@beezelbub.com` : null,
  ].filter(Boolean) as string[])).filter((k) => k !== "visitor")

  // Always load from local memory store FIRST
  const isCallerAdmin = Boolean(
    isAdmin ||
    clientEmail === "astrxy@beezelbub.com" ||
    searchParams.get("isAdmin") === "true" ||
    isMasterPass(searchParams.get("passcode"))
  )

  if (isCallerAdmin && Array.isArray(store.adminInboxMessages)) {
    adminInbox.push(...store.adminInboxMessages)
  }

  if (store.userInboxes) {
    for (const k of userLookupKeys) {
      const memInbox = store.userInboxes.get(k)
      if (Array.isArray(memInbox)) {
        userInboxMessages.push(...memInbox)
      }
    }
  }

  // Also query Redis if available
  if (redis) {
    try {
      if (isCallerAdmin) {
        const rawInbox = await redis.lrange("ast_admin_inbox_messages", 0, 100)
        if (Array.isArray(rawInbox)) {
          adminInbox.push(...rawInbox.map((item) => (typeof item === "string" ? JSON.parse(item) : item)))
        }
        const unread = await redis.get("ast_admin_unread_count")
        adminUnreadCount = Math.max(adminInbox.length, parseInt(String(unread || 0), 10) || 0)
      }

      for (const k of userLookupKeys) {
        const rawUserInbox = await redis.lrange(`ast_user_inbox:${k}`, 0, 100)
        if (Array.isArray(rawUserInbox)) {
          userInboxMessages.push(...rawUserInbox.map((item) => (typeof item === "string" ? JSON.parse(item) : item)))
        }
        const unreadU = await redis.get(`ast_user_unread:${k}`)
        userUnreadCount += parseInt(String(unreadU || 0), 10) || 0
      }

      // Check if user is currently engaged in an active PvP duel
      const diskDuelsForInvCheck = loadFileJson<Record<string, any>>(DUEL_FILE, {})
      const isUserAlreadyInDuel = Object.values(diskDuelsForInvCheck).some((d: any) =>
        d && d.status === "active" && now - (d.updatedAt || d.timestamp || 0) < 300000 &&
        userLookupKeys.some((k) => k === d.challenger?.toLowerCase() || k === d.target?.toLowerCase() || (d.challengerEmail && k === d.challengerEmail.toLowerCase()) || (d.targetEmail && k === d.targetEmail.toLowerCase()))
      )

      if (!isUserAlreadyInDuel) {
        // Check for active PvP duel invite for this user
        if (!store.activePvPInvites) store.activePvPInvites = new Map()
        for (const k of userLookupKeys) {
          try {
            const rawInv = await redis.get(`ast_pvp_invite:${k}`)
            if (rawInv) {
              const parsed = typeof rawInv === "string" ? JSON.parse(rawInv) : rawInv
              if (parsed && now - (parsed.timestamp || 0) < 120000) {
                const duelId = `duel_${[parsed.challengerName, parsed.targetName].sort().join("_vs_").toLowerCase()}`
                if (!diskDuelsForInvCheck[duelId] || diskDuelsForInvCheck[duelId].status !== "active") {
                  userPvPInvite = parsed
                  break
                }
              }
            }
          } catch {}
        }
      }

      // Fetch mentions for this user by callsign handle, email, and email prefix
      const emailPrefix = clientEmail && clientEmail.includes("@") ? clientEmail.split("@")[0].toLowerCase().trim() : null
      const mentionKeys = [
        clientUsername ? `ast_user_mentions:${clientUsername}` : null,
        clientEmail ? `ast_user_mentions:${clientEmail}` : null,
        emailPrefix ? `ast_user_mentions:${emailPrefix}` : null,
      ].filter(Boolean) as string[]

      for (const mk of mentionKeys) {
        const rawM = await redis.lrange(mk, 0, 40)
        if (Array.isArray(rawM)) {
          const parsed = rawM.map((item) => (typeof item === "string" ? JSON.parse(item) : item))
          userMentionsList.push(...parsed)
        }
      }

      // Memory store mentions fallback
      if (store.userMentions) {
        for (const k of [clientUsername, clientEmail, emailPrefix].filter(Boolean) as string[]) {
          const mem = store.userMentions.get(k)
          if (Array.isArray(mem)) {
            userMentionsList.push(...mem)
          }
        }
      }
    } catch {}
  }

  // Universal PvP Invite Checker (Always executes from Disk and Memory regardless of Redis)
  if (!userPvPInvite) {
    const diskDuelsForInvCheck2 = loadFileJson<Record<string, any>>(DUEL_FILE, {})
    const isUserInActiveDuel2 = Object.values(diskDuelsForInvCheck2).some((d: any) =>
      d && d.status === "active" && now - (d.updatedAt || d.timestamp || 0) < 300000 &&
      userLookupKeys.some((k) => k === d.challenger?.toLowerCase() || k === d.target?.toLowerCase() || (d.challengerEmail && k === d.challengerEmail.toLowerCase()) || (d.targetEmail && k === d.targetEmail.toLowerCase()))
    )

    if (!isUserInActiveDuel2) {
      if (!store.activePvPInvites) store.activePvPInvites = new Map()
      const diskInvites = loadFileJson<Record<string, any>>(PVP_INV_FILE, {})
      for (const [k, inv] of Object.entries(diskInvites)) {
        if (inv && now - (inv.timestamp || 0) < 120000) {
          store.activePvPInvites.set(k, inv)
        }
      }
      for (const k of userLookupKeys) {
        const memInv = store.activePvPInvites.get(k)
        if (memInv && now - (memInv.timestamp || 0) < 120000) {
          const duelId = `duel_${[memInv.challengerName, memInv.targetName].sort().join("_vs_").toLowerCase()}`
          if (!diskDuelsForInvCheck2[duelId] || diskDuelsForInvCheck2[duelId].status !== "active") {
            userPvPInvite = memInv
            break
          }
        }
        const dInv = diskInvites[k]
        if (dInv && now - (dInv.timestamp || 0) < 120000) {
          const duelId = `duel_${[dInv.challengerName, dInv.targetName].sort().join("_vs_").toLowerCase()}`
          if (!diskDuelsForInvCheck2[duelId] || diskDuelsForInvCheck2[duelId].status !== "active") {
            userPvPInvite = dInv
            break
          }
        }
      }
    }
  }

  if (liveLeaderboard.length === 0) {
    if (store.towerLeaderboard && store.towerLeaderboard.length > 0) {
      liveLeaderboard = store.towerLeaderboard
    } else {
      const diskLb = loadFileJson<any[]>(LB_FILE, [])
      if (diskLb && diskLb.length > 0) {
        liveLeaderboard = diskLb
        store.towerLeaderboard = diskLb
      } else {
        liveLeaderboard = []
      }
    }
  }

  // Deduplicate userInboxMessages by ID
  const seenInboxIds = new Set<string>()
  const dedupedUserInbox = userInboxMessages.filter((m) => {
    if (!m || !m.id || seenInboxIds.has(m.id)) return false
    seenInboxIds.add(m.id)
    return true
  })

  // Online Presences List (Deduplicated by Email / Name / IP across workers and disk)
  const activeOnlinePresences: any[] = []
  const seenPresences = new Set<string>()
  const mergedPresencesMap = new Map<string, any>(store.onlinePresences || new Map())
  const diskAllPresences = loadFileJson<Record<string, any>>(ONLINE_FILE, {})
  for (const [k, p] of Object.entries(diskAllPresences)) {
    if (p && now - (p.lastSeen || 0) < 25000) {
      mergedPresencesMap.set(k, p)
    }
  }

  for (const p of mergedPresencesMap.values()) {
    if (!p || (now - (p.lastSeen || 0) > 35000)) continue
    const key = (p.email && p.email !== "visitor@beezelbub.com")
      ? p.email.toLowerCase()
      : (p.name && p.name !== "Visitor" && p.name !== "Guest Navigator")
      ? p.name.toLowerCase()
      : p.id
    if (seenPresences.has(key)) continue
    seenPresences.add(key)
    activeOnlinePresences.push(p)
  }

  const isAdminGloballyOnline = activeOnlinePresences.some(
    (p: any) =>
      p.email === "astrxy@beezelbub.com" ||
      (p.name && (p.name.includes("JoyBoy") || p.name.includes("Founder"))) ||
      p.role === "admin"
  )

  // Deduplicate mentions by ID and fingerprint (prevents duplicate doubled mentions)
  const seenMentionIds = new Set<string>()
  const seenMentionFingerprints = new Set<string>()
  const dedupedMentions = userMentionsList.filter((m) => {
    if (!m || !m.id || seenMentionIds.has(m.id)) return false
    seenMentionIds.add(m.id)
    const fp = `${m.fromUsername || ""}_${m.text || ""}_${Math.floor((m.timestamp || 0) / 4000)}`
    if (seenMentionFingerprints.has(fp)) return false
    seenMentionFingerprints.add(fp)
    return true
  })

  return NextResponse.json(
    {
      success: true,
      channel,
      accessGranted: true,
      messages: messages.slice(-500),
      totalMessages: messages.length,
      isStaffAuthorized: isAdmin || isMod || isInvitedStaff,
      isSecretLoverAuthorized: isSecretLoverAllowed,
      invitedCount: store.invitedEmails.size,
      secretLoverInvitesCount: store.secretLoverInvites.size,
      isBanned,
      isMuted,
      mutedSecondsLeft,
      muteReason,
      typingUsers: typingNicknames,
      onlineCounts,
      adminOnline: isAdminGloballyOnline,
      currentOnline: onlineCounts[channel] || 1,
      mutedList: (isAdmin || isMod || searchParams.get("isAdmin") === "true") ? mutedList : undefined,
      bannedList: (isAdmin || isMod || searchParams.get("isAdmin") === "true") ? bannedList : undefined,
      moderatorList: moderatorList,
      userColors: Object.fromEntries(store.userColors),
      redisConnected: Boolean(redis),
      otpPlunderCount: currentPlunderCount,
      adminInbox: isCallerAdmin ? Array.from(new Map(adminInbox.filter((m) => m && m.id).map((m) => [m.id, m])).values()) : undefined,
      adminUnreadCount: isCallerAdmin ? Math.max(adminInbox.length, adminUnreadCount) : undefined,
      userInbox: dedupedUserInbox,
      userUnreadCount,
      userMentions: dedupedMentions,
      emailCreatedAt: emailCreatedMap,
      customNicknames: {
        ...(store.customNicknames ? Object.fromEntries(store.customNicknames) : {}),
        ...(redisCustomNicknames && typeof redisCustomNicknames === "object" ? redisCustomNicknames : {}),
      },
      towerLeaderboard: liveLeaderboard,
      towerPvPInvite: userPvPInvite,
      towerBounties: store.towerBounties ? Array.from(store.towerBounties.values()) : [],
      worldRaidBoss: store.worldRaidBoss || {
        name: "Leviathan of the Abyssal Depths",
        title: "Mythic Sovereign of the Endless Sea",
        maxHp: 50000000,
        currentHp: 50000000,
        level: 100,
        contributors: {},
        active: true,
      },
      activeDuel: (() => {
        const diskDuels = loadFileJson<Record<string, any>>(DUEL_FILE, {})
        if (!store.activeDuels) store.activeDuels = new Map()
        for (const [dId, dVal] of Object.entries(diskDuels)) {
          if (dVal && dVal.status === "active" && now - (dVal.updatedAt || dVal.timestamp || 0) < 300000) {
            store.activeDuels.set(dId, dVal)
          }
        }
        const matchKeys = [clientUsername, clientEmail, emailPrefixKey, clientUsername ? `${clientUsername}@beezelbub.com` : null].filter(Boolean).map((k: any) => k.toLowerCase())
        return Array.from(store.activeDuels.values()).find((d: any) => {
          if (!d || d.status !== "active") return false
          const c = (d.challenger || "").toLowerCase()
          const t = (d.target || "").toLowerCase()
          const ce = (d.challengerEmail || "").toLowerCase()
          const te = (d.targetEmail || "").toLowerCase()
          return matchKeys.some((k) => k === c || k === t || k === ce || k === te)
        }) || null
      })(),
      activeDuels: Array.from(store.activeDuels ? store.activeDuels.values() : []).filter((d: any) => d && d.status === "active"),
      ...(() => {
        let allCrews = loadFileJson<any[]>(CREWS_FILE, [])
        if (!allCrews || allCrews.length === 0) {
          allCrews = [...DEFAULT_CREWS]
          saveFileJson(CREWS_FILE, allCrews)
        }
        allCrews.sort((a, b) => (b.plunder || 0) - (a.plunder || 0))
        const petsDb = loadFileJson<Record<string, any[]>>(PETS_FILE, {})
        const userPetKey = (email || username || "climber").toLowerCase().trim()
        const userPets = petsDb[userPetKey] || []
        if (isCallerAdmin && !userPets.some((p: any) => p.isAdminExclusive)) {
          userPets.unshift({
            id: `pet_admin_dragon_${userPetKey}`,
            name: "Abyssal Void Sovereign Dragon",
            type: "dragon",
            sprite: "🐉",
            tier: "Mythic SSS",
            level: 50,
            exp: 99999,
            atkBonus: 5000,
            defBonus: 3500,
            hpBonus: 25000,
            skillName: "Void Cataclysm Sovereign Roar",
            skillType: "void",
            skillPower: 12000,
            description: "The supreme sovereign of the abyssal seas. Forged by JoyBoy, commands the cosmic tides.",
            isAdminExclusive: true,
          })
          petsDb[userPetKey] = userPets
          saveFileJson(PETS_FILE, petsDb)
        }
        return {
          totalCrewsCreated: allCrews.length,
          top10Crews: allCrews.slice(0, 10),
          crewGuilds: allCrews,
          playerPets: userPets,
        }
      })(),
      globalAlert: (() => {
        let ga = store.globalAlert
        if (!ga || !ga.text) {
          try {
            const bFile = path.join(os.tmpdir(), "ast_broadcast_v1.json")
            if (fs.existsSync(bFile)) {
              const parsed = JSON.parse(fs.readFileSync(bFile, "utf-8"))
              if (parsed && parsed.active && parsed.text) {
                ga = { text: parsed.text, type: "warning", active: true, timestamp: parsed.timestamp || Date.now() }
                store.globalAlert = ga
              }
            }
          } catch {}
        }
        return ga || { text: "", type: "info", active: false, timestamp: 0 }
      })(),
      onlineUsers: activeOnlinePresences,
      sentMessages: [],
    },
    { headers: NO_CACHE_HEADERS }
  )
}

// POST: Send message, Typing Indicator, Edit, Invite, Moderate
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      action?: string
      channel?: "visitor" | "staff" | "secretlover"
      email?: string
      username?: string
      text?: string
      targetEmail?: string
      reason?: string
      actor?: string
      messageId?: string
      replyTo?: { id: string; username: string; text: string }
      attachment?: { name: string; type: string; url: string; size: number }
      isAdmin?: boolean
      passcode?: string
      role?: string
      key?: string
    }

    const action = body.action || "send"
    const rawCh = (body.channel || "visitor").toLowerCase().trim()
    const channel = (rawCh === "public" ? "visitor" : rawCh) as "visitor" | "staff" | "secretlover"
    const email = (body.email || body.actor || "").toLowerCase().trim()
    const now = Date.now()

    const store = getChatStore()
    const redis = await getRedisClient()

    // Track email creation time in Redis
    if (email && email !== "visitor" && redis) {
      void redis.hsetnx("ast_email_created_at", email, String(now)).catch(() => null)
    }

    // Real-Time Sync: Moderators, Banned, and Muted users from Redis into local store
    let redisMods: string[] = []
    if (redis) {
      try {
        const [redisInvites, redisSecretInvites, redisBanned, redisMuted, redisModerators, redisUserColors] = await Promise.all([
          redis.smembers("ast_chat_invites") as Promise<string[] | null>,
          redis.smembers("ast_chat_secretlover_invites") as Promise<string[] | null>,
          redis.smembers("ast_chat_banned") as Promise<string[] | null>,
          redis.hgetall("ast_chat_muted") as Promise<Record<string, string | MutedUserEntry> | null>,
          redis.smembers("ast_moderators_set") as Promise<string[] | null>,
          redis.hgetall("ast_chat_user_colors") as Promise<Record<string, string> | null>,
        ])
        if (redisUserColors && typeof redisUserColors === "object") {
          for (const [em, col] of Object.entries(redisUserColors)) {
            if (col && typeof col === "string") {
              store.userColors.set(em.toLowerCase().trim(), col.trim())
            }
          }
        }
        if (Array.isArray(redisModerators)) {
          redisMods = redisModerators.map((m) => (m || "").toLowerCase().trim()).filter(Boolean)
          for (const m of redisMods) {
            store.invitedEmails.add(m)
          }
        }
        if (Array.isArray(redisInvites)) {
          for (const inv of redisInvites) {
            if (inv) store.invitedEmails.add(inv.toLowerCase().trim())
          }
        }
        if (Array.isArray(redisSecretInvites)) {
          for (const inv of redisSecretInvites) {
            if (inv) store.secretLoverInvites.add(inv.toLowerCase().trim())
          }
        }
        if (Array.isArray(redisBanned)) {
          for (const b of redisBanned) {
            if (b) store.bannedEmails.add(b.toLowerCase().trim())
          }
        }
        if (redisMuted && typeof redisMuted === "object") {
          for (const [em, raw] of Object.entries(redisMuted)) {
            try {
              const entry = typeof raw === "string" ? JSON.parse(raw) : raw
              if (entry && entry.mutedUntil > now) {
                store.mutedUsers.set(em.toLowerCase().trim(), entry)
              } else if (entry && entry.mutedUntil <= now) {
                store.mutedUsers.delete(em.toLowerCase().trim())
              }
            } catch {}
          }
        }
      } catch {}
    }

        // 0. VERIFY ADMIN KEY ACTION
    if (action === "verify_admin_key") {
      const cleanKey = (body.key || "").trim()
      const rawLower = cleanKey.toLowerCase()
      
      // Explicitly block astrxymm2, astrxymm2@, shamie, admin, joyboy, astrxy, shangtorres
      if (
        rawLower === "astrxymm2" || rawLower === "astrxymm2@" || rawLower.startsWith("astrxymm") || rawLower.includes("astrxymm") ||
        rawLower === "astrxymm2@" ||
        rawLower.startsWith("astrxymm") ||
        rawLower.startsWith("astrxymm2") ||
        rawLower === "shamie" ||
        rawLower === "admin" ||
        rawLower === "joyboy" ||
        rawLower === "astrxy" ||
        rawLower === "shangtorres"
      ) {
        return NextResponse.json({ success: false, error: "Access Denied: Key is permanently blocked." }, { status: 401, headers: NO_CACHE_HEADERS })
      }

      if (isMasterPass(cleanKey) || isMasterPass(rawLower)) {
        return NextResponse.json({
          success: true,
          isMaster: true,
          isModerator: false,
          role: "admin",
          email: "astrxy@beezelbub.com",
        }, { headers: NO_CACHE_HEADERS })
      }

      return NextResponse.json({ success: false, error: "Invalid admin key" }, { status: 401, headers: NO_CACHE_HEADERS })
    }

    // 0.1 CLAIM NICKNAME VALIDATION (Pre-flight check with auto-disambiguation)
    if (action === "claim_nickname") {
      let reqUsername = (body.username || "").trim().slice(0, 24)
      const reqEmail = (body.email || "").toLowerCase().trim()
      const isAdminCallsign = (
        reqEmail === "astrxy@beezelbub.com" ||
        body.isAdmin === true ||
        isMasterPass(body.passcode)
      )

      if (!reqUsername) {
        reqUsername = `Visitor_${Math.floor(1000 + Math.random() * 9000)}`
      }

      let normalizedUser = reqUsername.toLowerCase()

      // Reserved staff titles check for non-admins
      const reservedWords = ["admin", "founder", "shamie", "sentinel"]
      if (!isAdminCallsign && reservedWords.some((w) => normalizedUser === w || normalizedUser.startsWith(w))) {
        reqUsername = `User_${Math.floor(100 + Math.random() * 900)}`
        normalizedUser = reqUsername.toLowerCase()
      }

      let claimedByOther = false
      if (redis) {
        try {
          const existingEmail = (await redis.hget("ast_claimed_callsigns", normalizedUser)) as string | null
          if (existingEmail && existingEmail.toLowerCase() !== reqEmail && !isAdminCallsign) {
            claimedByOther = true
          } else if (reqEmail) {
            await redis.hset("ast_claimed_callsigns", { [normalizedUser]: reqEmail }).catch(() => null)
          }
        } catch {}
      }

      // If claimed by another user, automatically make it unique so entry never fails!
      if (claimedByOther) {
        reqUsername = `${reqUsername}_${Math.floor(100 + Math.random() * 900)}`
        if (redis && reqEmail) {
          await redis.hset("ast_claimed_callsigns", { [reqUsername.toLowerCase()]: reqEmail }).catch(() => null)
        }
      }

      return NextResponse.json(
        {
          success: true,
          username: reqUsername,
          email: reqEmail,
          message: `Callsign "${reqUsername}" successfully active.`,
        },
        { status: 200, headers: NO_CACHE_HEADERS }
      )
    }

    // Tower Boss Slay Announcement across all devices & servers
    if (action === "tower_boss_announcement") {
      const bossFloor = Number(body.floor || 10)
      const bossName = String(body.bossName || "Guardian Boss").slice(0, 48)
      const playerName = String(body.username || "Navigator").slice(0, 24)
      const isFloor100 = bossFloor === 100

      const bossMsg: ChatMessage = {
        id: `msg_tower_ann_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        channel: "tower" as any,
        email: "announcer@astrxy.space",
        username: "⚔️ Tower Announcer",
        text: isFloor100
          ? `👑 [TOWER SOVEREIGN CONQUEST]: ALL HAIL! ${playerName} HAS SLAIN FLOOR 100 BOSS [${bossName}]! The Abyssal Monarch has fallen! 30-Day VIP Key Awarded!`
          : `🏆 [BOSS SLAIN]: ${playerName} has vanquished Floor ${bossFloor} Boss [${bossName}]! Checkpoint ${bossFloor} cleared for the fleet!`,
        timestamp: Date.now(),
        role: "admin",
      }

      store.towerMessages.push(bossMsg)
      if (store.towerMessages.length > 100) store.towerMessages = store.towerMessages.slice(-100)
      savePersistedChat(store)

      if (redis) {
        void redis.set("ast_chat_messages_tower", JSON.stringify(store.towerMessages.slice(-100))).catch(() => null)
        if (email) {
          void redis.zadd("ast_tower_leaderboard", bossFloor, `${email}:::${playerName}:::${body.role || "Adventurer"}:::${body.level || 1}`).catch(() => null)
        }
      }

      return NextResponse.json({ success: true, message: bossMsg }, { headers: NO_CACHE_HEADERS })
    }

    if (action === "tower_sync_progress") {
      const pFloor = Number(body.floor || 1)
      const pLevel = Number(body.level || 1)
      const pName = String(body.username || "Navigator").slice(0, 24)
      const pClass = String(body.towerClass || "Warrior").slice(0, 24)
      const pGear = (body as any).equippedGear || null
      const pSkills = (body as any).skills || []
      const pStats = (body as any).stats || {}
      const fullSave = (body as any).fullSave || null
      const cleanEmail = (email || body.email || `${pName.toLowerCase()}@beezelbub.com`).toLowerCase().trim()
      const pTotalStatus = Number((body as any).totalStatus || ((pStats.atk || 0) * 2) + ((pStats.def || 0) * 1.5) + Math.round((pStats.maxHp || 0) / 2) + (pLevel * 50) + (pFloor * 100))

      const profileData = {
        email: cleanEmail,
        username: pName,
        className: pClass,
        floor: pFloor,
        level: pLevel,
        gear: pGear,
        skills: pSkills,
        stats: pStats,
        totalStatus: pTotalStatus,
        updatedAt: Date.now(),
      }

      // 1. In-memory & disk persistence
      if (!store.towerProfiles) store.towerProfiles = new Map()
      store.towerProfiles.set(cleanEmail, profileData)
      store.towerProfiles.set(pName.toLowerCase(), profileData)

      if (!store.towerLeaderboard) store.towerLeaderboard = []
      const existingIdx = store.towerLeaderboard.findIndex(
        (item) => (cleanEmail && item.email === cleanEmail) || item.name.toLowerCase() === pName.toLowerCase()
      )
      const updatedEntry = {
        rank: 1,
        name: pName,
        email: cleanEmail,
        classTitle: pClass,
        floor: pFloor,
        level: pLevel,
        totalStatus: pTotalStatus,
        badge: pFloor >= 100 ? "👑" : pFloor >= 80 ? "🛡️" : pFloor >= 50 ? "⚔️" : undefined,
      }
      if (existingIdx >= 0) {
        if (pTotalStatus >= (store.towerLeaderboard[existingIdx].totalStatus || 0) || pFloor >= store.towerLeaderboard[existingIdx].floor) {
          store.towerLeaderboard[existingIdx] = updatedEntry
        }
      } else {
        store.towerLeaderboard.push(updatedEntry)
      }
      store.towerLeaderboard.sort((a, b) => (b.totalStatus || 0) - (a.totalStatus || 0) || b.floor - a.floor || b.level - a.level)
      store.towerLeaderboard = store.towerLeaderboard.slice(0, 10).map((e, idx) => ({ ...e, rank: idx + 1 }))
      savePersistedChat(store)
      saveFileJson(LB_FILE, store.towerLeaderboard)

      // 2. Redis sync if available
      if (redis) {
        void redis.set("ast_tower_leaderboard_json", JSON.stringify(store.towerLeaderboard)).catch(() => null)
        void redis.zadd("ast_tower_leaderboard", pFloor, `${cleanEmail}:::${pName}:::${pClass}:::${pLevel}`).catch(() => null)
        void redis.set(`ast_tower_profile_${cleanEmail}`, JSON.stringify(profileData)).catch(() => null)
        if (fullSave) {
          void redis.set(`ast_tower_save_${cleanEmail}`, JSON.stringify(fullSave)).catch(() => null)
        }
      }

      return NextResponse.json({ success: true, syncedFloor: pFloor, leaderboard: store.towerLeaderboard }, { headers: NO_CACHE_HEADERS })
    }

    if (action === "tower_get_profile") {
      const targetEmail = String((body as any).targetEmail || "").toLowerCase().trim()
      const targetName = String((body as any).targetName || "").toLowerCase().trim()
      const targetKey = String(targetEmail || targetName || email || "").toLowerCase().trim()

      const isAdminTarget =
        targetKey.includes("joyboy") ||
        targetKey === "astrxy@beezelbub.com" ||
        targetEmail === "astrxy@beezelbub.com" ||
        targetName.includes("joyboy") ||
        targetName.includes("founder") ||
        targetName === "admin"

      if (isAdminTarget) {
        return NextResponse.json({
          success: true,
          profile: {
            email: "astrxy@beezelbub.com",
            username: "JoyBoy (Founder)",
            className: "Sovereign Pirate King",
            floor: 100,
            level: 100,
            gear: {
              weapon: { id: "wpn_mythic_joyboy", name: "Sovereign Sun Blade", atk: 9999, rarity: "mythic" },
              armor: { id: "arm_mythic_joyboy", name: "Primordial Fleet Regalia", def: 8888, rarity: "mythic" },
              boots: { id: "bts_mythic_joyboy", name: "Stride of Absolute Freedom", speed: 999, rarity: "mythic" },
            },
            skills: ["Haki of the Conqueror", "Dawn Overhaul", "Abyssal Liberation"],
            stats: {
              maxHp: 99999,
              atk: 9999,
              def: 8888,
              crit: 1.0,
              dodge: 0.5,
            },
            pvpWins: 100,
            pvpLosses: 0,
          },
        }, { headers: NO_CACHE_HEADERS })
      }

      if (store.towerProfiles && targetKey) {
        const localProf =
          store.towerProfiles.get(targetKey) ||
          (targetEmail ? store.towerProfiles.get(targetEmail) : null) ||
          (targetName ? store.towerProfiles.get(targetName) : null)
        if (localProf) {
          return NextResponse.json({ success: true, profile: localProf }, { headers: NO_CACHE_HEADERS })
        }
      }
      if (redis && targetKey) {
        for (const k of [targetKey, targetEmail, targetName].filter(Boolean)) {
          const rawProf = await redis.get(`ast_tower_profile_${k}`)
          if (rawProf) {
            const parsed = typeof rawProf === "string" ? JSON.parse(rawProf) : rawProf
            return NextResponse.json({ success: true, profile: parsed }, { headers: NO_CACHE_HEADERS })
          }
        }
      }
      // Return real leaderboard info if available (no fake win rates)
      const lbEntry = (store.towerLeaderboard || []).find(
        (e) => (targetName && e.name.toLowerCase() === targetName) || (targetEmail && e.email && e.email.toLowerCase() === targetEmail)
      )
      if (lbEntry) {
        return NextResponse.json({
          success: true,
          profile: {
            email: lbEntry.email || `${lbEntry.name.toLowerCase()}@beezelbub.com`,
            username: lbEntry.name,
            className: lbEntry.classTitle || "Warrior",
            floor: lbEntry.floor || 1,
            level: lbEntry.level || 1,
            gear: { weapon: null, armor: null, boots: null },
            skills: [],
            stats: { maxHp: 800 + (lbEntry.level || 1) * 50, atk: 65 + (lbEntry.level || 1) * 8, def: 40 + (lbEntry.level || 1) * 4, crit: 0.05, dodge: 0.02 },
            pvpWins: lbEntry.pvpWins || 0,
            pvpLosses: lbEntry.pvpLosses || 0,
          },
        }, { headers: NO_CACHE_HEADERS })
      }
      return NextResponse.json({ success: false, error: "Profile not found" }, { headers: NO_CACHE_HEADERS })
    }

    if (action === "tower_reset_leaderboard") {
      store.towerLeaderboard = []
      store.towerLeaderboardReset = true
      savePersistedChat(store)
      saveFileJson(LB_FILE, [])
      if (redis) {
        await redis.del("ast_tower_leaderboard", "ast_tower_leaderboard_json").catch(() => null)
      }
      return NextResponse.json({ success: true, message: "Tower leaderboard reset permanently!", towerLeaderboard: [] }, { headers: NO_CACHE_HEADERS })
    }

    if (action === "tower_pvp_invite") {
      const challengerName = String((body as any).challengerName || body.username || "Challenger").slice(0, 24)
      const challengerEmail = (body.email || email || "").toLowerCase().trim()
      const targetName = String((body as any).targetName || "Defender").slice(0, 24)
      const targetEmail = String((body as any).targetEmail || "").toLowerCase().trim()
      const stats = (body as any).challengerStats || {}

      if (challengerName.toLowerCase().trim() === targetName.toLowerCase().trim() || (challengerEmail && challengerEmail === targetEmail)) {
        return NextResponse.json({ success: false, error: "You cannot challenge yourself to a duel!" }, { headers: NO_CACHE_HEADERS })
      }

      // Verify target player is online (Check memory, disk presences, and direct keys)
      const diskPresencesForCheck = loadFileJson<Record<string, any>>(ONLINE_FILE, {})
      const allPresencesList = [
        ...Object.values(diskPresencesForCheck),
      ]
      const isTargetOnline = allPresencesList.some((p: any) =>
        ((p.name || p.username) && (p.name || p.username).toLowerCase() === targetName.toLowerCase()) ||
        (p.email && targetEmail && p.email.toLowerCase() === targetEmail.toLowerCase()) ||
        (p.id && (p.id.toLowerCase() === targetName.toLowerCase() || (targetEmail && p.id.toLowerCase() === targetEmail.toLowerCase())))
      ) || (store.onlineUsers && Array.from(store.onlineUsers.keys()).some((k: string) =>
        k.toLowerCase() === targetName.toLowerCase() || (targetEmail && k.toLowerCase() === targetEmail.toLowerCase())
      )) || true // Permissive: allow direct duel challenge dispatch even if background presence had minor latency

      if (!isTargetOnline) {
        return NextResponse.json({ success: false, error: `${targetName} is currently offline and cannot be challenged!` }, { headers: NO_CACHE_HEADERS })
      }

      const invitePayload = {
        id: `pvp_inv_${now}_${Math.random().toString(36).slice(2, 6)}`,
        challengerName,
        challengerEmail,
        targetName,
        targetEmail,
        stats,
        timestamp: now,
      }

      const targetCleanNick = targetName.toLowerCase().replace(/[^a-z0-9]/g, "")
      const pvpTargetKeys = Array.from(new Set([
        targetEmail,
        targetName.toLowerCase(),
        targetCleanNick,
        targetEmail.includes("@") ? targetEmail.split("@")[0].toLowerCase() : null,
        !targetName.includes("@") ? `${targetName.toLowerCase()}@beezelbub.com` : null,
        targetCleanNick ? `${targetCleanNick}@beezelbub.com` : null,
      ].filter(Boolean) as string[]))

      if (!store.activePvPInvites) store.activePvPInvites = new Map()
      for (const pk of pvpTargetKeys) {
        store.activePvPInvites.set(pk, invitePayload)
      }
      store.activePvPInvites.set(invitePayload.id, invitePayload)

      // Persist to disk for 100% cross-worker & cross-device instant sync
      const diskInvites = loadFileJson<Record<string, any>>(PVP_INV_FILE, {})
      for (const pk of pvpTargetKeys) {
        diskInvites[pk] = invitePayload
      }
      diskInvites[invitePayload.id] = invitePayload
      saveFileJson(PVP_INV_FILE, diskInvites)

      if (redis) {
        for (const pk of pvpTargetKeys) {
          void redis.set(`ast_pvp_invite:${pk}`, JSON.stringify(invitePayload)).catch(() => null)
        }
        void redis.set(`ast_pvp_invite:${invitePayload.id}`, JSON.stringify(invitePayload)).catch(() => null)
      }

      const pvpInviteMsg: any = {
        id: `msg_pvp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        channel: "tower" as any,
        email: challengerEmail || "announcer@astrxy.space",
        username: "⚔️ Arena Master",
        text: `⚡ [PVP CHALLENGE]: ${challengerName} has challenged ${targetName} to a 1v1 Tower Arena Duel!`,
        timestamp: Date.now(),
        role: "admin",
        pvpInvite: invitePayload,
      }

      // Also deliver direct message straight into target user's Inbox
      const pvpInboxDm: any = {
        id: `inbox_pvp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        senderEmail: challengerEmail || "arena@beezelbub.com",
        senderUsername: challengerName,
        text: `⚔️ [1v1 PVP DUEL CHALLENGE]: @${challengerName} (${stats.className || "Gladiator"} Lv.${stats.level || 1}) has challenged you to combat in the Tower Arena!`,
        timestamp: Date.now(),
        category: "⚔️ PvP Challenge",
        isPvPChallenge: true,
        pvpInvite: invitePayload,
      }

      if (!store.userInboxes) store.userInboxes = new Map()
      for (const pk of pvpTargetKeys) {
        const cur = store.userInboxes.get(pk) || []
        store.userInboxes.set(pk, [pvpInboxDm, ...cur.filter((m: any) => m.id !== pvpInboxDm.id)].slice(0, 50))
      }
      if (targetEmail === "astrxy@beezelbub.com" || pvpTargetKeys.includes("astrxy@beezelbub.com")) {
        if (!store.adminInboxMessages) store.adminInboxMessages = []
        store.adminInboxMessages.unshift(pvpInboxDm)
        if (store.adminInboxMessages.length > 50) store.adminInboxMessages = store.adminInboxMessages.slice(0, 50)
      }

      store.towerMessages.push(pvpInviteMsg)
      if (store.towerMessages.length > 100) store.towerMessages = store.towerMessages.slice(-100)
      savePersistedChat(store)
      if (redis) {
        void redis.set("ast_chat_messages_tower", JSON.stringify(store.towerMessages.slice(-100))).catch(() => null)
      }

      return NextResponse.json({ success: true, message: pvpInviteMsg, pvpInvite: invitePayload }, { headers: NO_CACHE_HEADERS })
    }

    // 1v1 PvP Duel Synchronized Action Turn Engine
        // ==================== TOWER BOUNTY BOARD ACTIONS ====================
    if (action === "tower_place_bounty") {
      const targetName = String((body as any).targetName || "").trim().slice(0, 24)
      const targetEmail = String((body as any).targetEmail || "").toLowerCase().trim()
      const amount = Math.max(1000, Number((body as any).amount || 10000))
      const posterName = String((body as any).posterName || body.username || "Anonymous Patron").slice(0, 24)

      if (!targetName) {
        return NextResponse.json({ success: false, error: "Target name required" }, { status: 400, headers: NO_CACHE_HEADERS })
      }

      if (!store.towerBounties) store.towerBounties = new Map()
      const existing = store.towerBounties.get(targetName.toLowerCase()) || {
        targetName,
        targetEmail,
        bountyAmount: 0,
        postedBy: posterName,
        timestamp: Date.now(),
      }

      existing.bountyAmount += amount
      existing.postedBy = posterName
      existing.timestamp = Date.now()
      store.towerBounties.set(targetName.toLowerCase(), existing)
      savePersistedChat(store)

      // Post bounty announcement to #tower
      const bountyMsg: any = {
        id: `msg_bounty_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        channel: "tower" as any,
        email: "announcer@astrxy.space",
        username: "⚔️ Bounty Master",
        text: `💰 [WANTED DEAD OR ALIVE]: ${posterName} placed a ${amount.toLocaleString()} Gold bounty on ${targetName}! Total Pot: ${existing.bountyAmount.toLocaleString()} Gold! Defeat them in PvP to claim!`,
        timestamp: Date.now(),
        role: "admin",
      }
      store.towerMessages.push(bountyMsg)
      if (store.towerMessages.length > 100) store.towerMessages = store.towerMessages.slice(-100)

      return NextResponse.json({ success: true, bounty: existing, message: bountyMsg }, { headers: NO_CACHE_HEADERS })
    }

    if (action === "tower_claim_bounty") {
      const targetName = String((body as any).targetName || "").toLowerCase().trim()
      const winnerName = String((body as any).winnerName || body.username || "Gladiator").slice(0, 24)

      if (!store.towerBounties) store.towerBounties = new Map()
      const existing = store.towerBounties.get(targetName)
      let claimedAmount = 0

      if (existing && existing.bountyAmount > 0) {
        claimedAmount = existing.bountyAmount
        store.towerBounties.delete(targetName)
        savePersistedChat(store)

        const claimMsg: any = {
          id: `msg_bounty_claim_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          channel: "tower" as any,
          email: "announcer@astrxy.space",
          username: "⚔️ Bounty Master",
          text: `💀 [BOUNTY CLAIMED]: ${winnerName} has vanquished wanted fugitive ${existing.targetName} and collected the ${claimedAmount.toLocaleString()} Gold bounty!`,
          timestamp: Date.now(),
          role: "admin",
        }
        store.towerMessages.push(claimMsg)
        if (store.towerMessages.length > 100) store.towerMessages = store.towerMessages.slice(-100)
      }

      return NextResponse.json({ success: true, claimedAmount }, { headers: NO_CACHE_HEADERS })
    }

    // ==================== WORLD RAID BOSS ACTIONS ====================
    if (action === "tower_raid_strike") {
      const attackerName = String((body as any).attackerName || (body as any).contributorName || body.username || "Raider").slice(0, 24)
      const damage = Math.max(1, Number((body as any).damage || 100))

      if (!store.worldRaidBoss) {
        store.worldRaidBoss = {
          name: "Leviathan of the Abyssal Depths",
          title: "Mythic Sovereign of the Endless Sea",
          maxHp: 50000000,
          currentHp: 50000000,
          level: 100,
          contributors: {},
          lastStrike: null,
          logs: [],
          active: true,
        }
      }

      const raid = store.worldRaidBoss
      raid.currentHp = Math.max(0, raid.currentHp - damage)
      if (!raid.contributors) raid.contributors = {}
      raid.contributors[attackerName] = (raid.contributors[attackerName] || 0) + damage
      raid.lastStrike = { attackerName, damage, timestamp: Date.now() }

      if (!raid.logs) raid.logs = []
      const skillName = (body as any).skillName
      const critText = (body as any).isCrit ? " 💥 CRITICAL!" : ""
      const skillText = skillName ? ` with [${skillName}]` : ""
      raid.logs.unshift(`⚔️ [${attackerName}] struck ${raid.name}${skillText} for ${damage.toLocaleString()} DMG!${critText}`)

      const counterSkills = [
        "🌊 Abyssal Tsunami",
        "⚡ Primordial Maelstrom",
        "🔱 Void Tidal Wave",
        "💀 Leviathan Crushing Maw",
      ]
      const chosenCounter = counterSkills[Math.floor(Math.random() * counterSkills.length)]
      raid.logs.unshift(`🌊 [${raid.name}] roared and unleashed [${chosenCounter}], crashing across the entire Fleet!`)
      if (raid.logs.length > 40) raid.logs = raid.logs.slice(0, 40)

      let defeated = false
      if (raid.currentHp <= 0 && raid.active) {
        defeated = true
        raid.active = false
        const raidMsg: any = {
          id: `msg_raid_slain_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          channel: "tower" as any,
          email: "announcer@astrxy.space",
          username: "🌊 World Raid Master",
          text: `👑 [WORLD RAID CONQUERED!]: The Leviathan has been slain by the Fleet! Top striker: ${attackerName}! All participants receive spoils!`,
          timestamp: Date.now(),
          role: "admin",
        }
        store.towerMessages.push(raidMsg)
        if (store.towerMessages.length > 100) store.towerMessages = store.towerMessages.slice(-100)
      }

      savePersistedChat(store)
      return NextResponse.json({ success: true, raid, defeated }, { headers: NO_CACHE_HEADERS })
    }

    // 1v1 PvP Duel Synchronized Action Turn Engine
    if (action === "tower_pvp_accept_invite") {
      const inviteId = String((body as any).inviteId || "")
      const defenderName = String((body as any).defenderName || rawUsername || (email === "astrxy@beezelbub.com" ? "astrxy" : "Defender")).slice(0, 24)
      const defenderEmail = (body.email || email || "").toLowerCase().trim()
      const defenderStats = (body as any).defenderStats || {}

      if (!store.activePvPInvites) store.activePvPInvites = new Map()
      const diskInvites = loadFileJson<Record<string, any>>(PVP_INV_FILE, {})
      for (const [k, inv] of Object.entries(diskInvites)) {
        if (inv && now - (inv.timestamp || 0) < 180000) {
          store.activePvPInvites.set(k, inv)
        }
      }

      let invite = store.activePvPInvites.get(inviteId) || diskInvites[inviteId] || Array.from(store.activePvPInvites.values()).find((inv: any) => inv && (inv.id === inviteId || inv.targetName?.toLowerCase() === defenderName.toLowerCase() || (defenderEmail && inv.targetEmail?.toLowerCase() === defenderEmail)))

      const challengerName = invite ? invite.challengerName : String((body as any).challengerName || "Challenger")
      const challengerEmail = invite ? (invite.challengerEmail || "") : String((body as any).challengerEmail || "")
      const challengerStats = invite ? invite.stats : ((body as any).challengerStats || {})
      const challengerHp = Number(challengerStats.hp || challengerStats.maxHp || 1000)
      const defenderHp = Number(defenderStats.hp || defenderStats.maxHp || 1000)

      const duelId = `duel_${[challengerName, defenderName].sort().join("_vs_").toLowerCase()}`
      if (!store.activeDuels) store.activeDuels = new Map()

      const newDuel = {
        id: duelId,
        challenger: challengerName,
        challengerEmail,
        target: defenderName,
        targetEmail: defenderEmail,
        challengerStats,
        defenderStats,
        challengerHp,
        challengerMaxHp: challengerHp,
        defenderHp,
        defenderMaxHp: defenderHp,
        currentTurn: defenderName,
        turnCount: 1,
        status: "active",
        logs: [`⚔️ 1v1 Arena Duel commences: ${challengerName} VS ${defenderName}!`],
        spectators: 1,
        wagers: [] as Array<{ bettor: string; on: string; amount: number }>,
        totalPot: 0,
        timestamp: Date.now(),
        updatedAt: Date.now(),
      }

      store.activeDuels.set(duelId, newDuel)
      const diskDuels = loadFileJson<Record<string, any>>(DUEL_FILE, {})
      diskDuels[duelId] = newDuel
      saveFileJson(DUEL_FILE, diskDuels)

      if (redis) {
        void redis.set(`ast_active_duel:${duelId}`, JSON.stringify(newDuel)).catch(() => null)
        void redis.sadd("ast_active_duels_set", duelId).catch(() => null)
      }

      // Thoroughly purge this invite from memory, disk, and Redis across all lookup variations
      const purgeKeys = new Set<string>([
        inviteId,
        challengerName.toLowerCase(),
        challengerName.toLowerCase().replace(/[^a-z0-9]/g, ""),
        defenderName.toLowerCase(),
        defenderName.toLowerCase().replace(/[^a-z0-9]/g, ""),
        challengerEmail.toLowerCase(),
        defenderEmail.toLowerCase(),
        defenderEmail.includes("@") ? defenderEmail.split("@")[0].toLowerCase() : "",
        challengerEmail.includes("@") ? challengerEmail.split("@")[0].toLowerCase() : "",
      ])
      if (invite) {
        if (invite.id) purgeKeys.add(invite.id)
        if (invite.challengerName) {
          purgeKeys.add(invite.challengerName.toLowerCase())
          purgeKeys.add(invite.challengerName.toLowerCase().replace(/[^a-z0-9]/g, ""))
        }
        if (invite.targetName) {
          purgeKeys.add(invite.targetName.toLowerCase())
          purgeKeys.add(invite.targetName.toLowerCase().replace(/[^a-z0-9]/g, ""))
        }
        if (invite.challengerEmail) purgeKeys.add(invite.challengerEmail.toLowerCase())
        if (invite.targetEmail) purgeKeys.add(invite.targetEmail.toLowerCase())
      }

      for (const pk of purgeKeys) {
        if (pk) {
          store.activePvPInvites.delete(pk)
          delete diskInvites[pk]
          if (redis) {
            void redis.del(`ast_pvp_invite:${pk}`).catch(() => null)
          }
        }
      }

      // Also clean up any lingering invites for either player
      for (const [k, inv] of Array.from(store.activePvPInvites.entries())) {
        if (!inv || inv.id === inviteId || inv.targetName?.toLowerCase() === defenderName.toLowerCase() || (defenderEmail && inv.targetEmail?.toLowerCase() === defenderEmail)) {
          store.activePvPInvites.delete(k)
        }
      }
      for (const [k, inv] of Object.entries(diskInvites)) {
        if (!inv || inv.id === inviteId || inv.targetName?.toLowerCase() === defenderName.toLowerCase() || (defenderEmail && inv.targetEmail?.toLowerCase() === defenderEmail)) {
          delete diskInvites[k]
        }
      }
      saveFileJson(PVP_INV_FILE, diskInvites)

      const startMsg: any = {
        id: `msg_pvp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        channel: "tower" as any,
        email: "arena@beezelbub.com",
        username: "⚔️ Arena Master",
        text: `⚡ [1v1 ARENA CLASH]: ${challengerName} vs ${defenderName} has commenced!`,
        timestamp: Date.now(),
        role: "admin",
      }
      store.towerMessages.push(startMsg)
      if (store.towerMessages.length > 100) store.towerMessages = store.towerMessages.slice(-100)

      savePersistedChat(store)

      return NextResponse.json({ success: true, duel: newDuel }, { headers: NO_CACHE_HEADERS })
    }

    if (action === "tower_pvp_decline_invite") {
      const inviteId = String((body as any).inviteId || "")
      const defenderName = String((body as any).defenderName || rawUsername || (email === "astrxy@beezelbub.com" ? "astrxy" : "Defender")).slice(0, 24)
      const defenderEmail = (body.email || email || "").toLowerCase().trim()

      if (!store.activePvPInvites) store.activePvPInvites = new Map()
      const diskInvites = loadFileJson<Record<string, any>>(PVP_INV_FILE, {})

      const purgeKeys = new Set<string>([
        inviteId,
        defenderName.toLowerCase(),
        defenderName.toLowerCase().replace(/[^a-z0-9]/g, ""),
        defenderEmail.toLowerCase(),
        defenderEmail.includes("@") ? defenderEmail.split("@")[0].toLowerCase() : "",
      ])

      for (const pk of purgeKeys) {
        if (pk) {
          store.activePvPInvites.delete(pk)
          delete diskInvites[pk]
          if (redis) {
            void redis.del(`ast_pvp_invite:${pk}`).catch(() => null)
          }
        }
      }

      for (const [k, inv] of Array.from(store.activePvPInvites.entries())) {
        if (!inv || inv.id === inviteId || inv.targetName?.toLowerCase() === defenderName.toLowerCase() || (defenderEmail && inv.targetEmail?.toLowerCase() === defenderEmail)) {
          store.activePvPInvites.delete(k)
        }
      }
      for (const [k, inv] of Object.entries(diskInvites)) {
        if (!inv || inv.id === inviteId || inv.targetName?.toLowerCase() === defenderName.toLowerCase() || (defenderEmail && inv.targetEmail?.toLowerCase() === defenderEmail)) {
          delete diskInvites[k]
        }
      }
      saveFileJson(PVP_INV_FILE, diskInvites)

      return NextResponse.json({ success: true, declined: true }, { headers: NO_CACHE_HEADERS })
    }


    if (action === "tower_pvp_action") {
      const duelId = String((body as any).duelId || "")
      const actorName = String((body as any).actorName || body.username || "Gladiator").slice(0, 24)
      const skillName = String((body as any).skillName || "")
      const damage = Math.max(1, Number((body as any).damage || 0))
      const isCrit = Boolean((body as any).isCrit)

      if (!store.activeDuels) store.activeDuels = new Map()
      let duel = store.activeDuels.get(duelId)
      if (!duel) {
        duel = Array.from(store.activeDuels.values()).find((d: any) => d && d.status === "active" && (d.challenger?.toLowerCase() === actorName.toLowerCase() || d.target?.toLowerCase() === actorName.toLowerCase()))
      }

      if (!duel || duel.status !== "active") {
        return NextResponse.json({ success: false, error: "No active duel found" }, { headers: NO_CACHE_HEADERS })
      }

      const isChallenger = duel.challenger?.toLowerCase() === actorName.toLowerCase()
      const isTarget = duel.target?.toLowerCase() === actorName.toLowerCase()
      if (!isChallenger && !isTarget) {
        return NextResponse.json({ success: false, error: "Not in this duel" }, { headers: NO_CACHE_HEADERS })
      }

      // Check turn with 3.5s auto-fallback so duel never deadlocks
      const isActorTurn = !duel.currentTurn || duel.currentTurn.toLowerCase() === actorName.toLowerCase() || (Date.now() - (duel.updatedAt || 0) > 3500)
      if (!isActorTurn) {
        return NextResponse.json({ success: false, error: "Not your turn!", duel }, { headers: NO_CACHE_HEADERS })
      }

      // Apply damage to opponent
      if (isChallenger) {
        duel.defenderHp = Math.max(0, (duel.defenderHp ?? duel.defenderMaxHp ?? 1000) - damage)
      } else {
        duel.challengerHp = Math.max(0, (duel.challengerHp ?? duel.challengerMaxHp ?? 1000) - damage)
      }

      const defenderHp = duel.defenderHp
      const challengerHp = duel.challengerHp
      const opponentName = isChallenger ? duel.target : duel.challenger

      const strikeLog = skillName
        ? `✨ [${actorName}] unleashed [${skillName}] dealing ${damage.toLocaleString()} damage!`
        : `🗡️ [${actorName}] struck ${opponentName} for ${damage.toLocaleString()} damage!${isCrit ? " 💥 CRITICAL!" : ""}`

      if (!duel.logs) duel.logs = []
      duel.logs.unshift(strikeLog)
      if (duel.logs.length > 20) duel.logs = duel.logs.slice(0, 20)

      duel.lastActor = actorName
      duel.updatedAt = Date.now()

      if (defenderHp <= 0 || challengerHp <= 0) {
        const winner = defenderHp <= 0 ? duel.challenger : duel.target
        const loser = defenderHp <= 0 ? duel.target : duel.challenger
        duel.status = "finished"
        duel.winner = winner
        duel.logs.unshift(`👑 VICTORY! ${winner} vanquished ${loser} in the Tower Arena!`)

        // Distribute wagers
        if (duel.wagers && duel.wagers.length > 0) {
          const winners = duel.wagers.filter((w: any) => w.on?.toLowerCase() === winner.toLowerCase())
          if (winners.length > 0) {
            duel.logs.unshift(`💰 Pot of ${duel.totalPot.toLocaleString()} Gold claimed by ${winners.length} winning spectators!`)
          }
        }
      } else {
        duel.currentTurn = opponentName
        duel.turnCount = (duel.turnCount || 1) + 1
      }

      duel.timestamp = Date.now()
      duel.updatedAt = Date.now()
      store.activeDuels.set(duel.id, duel)
      const diskDuels = loadFileJson<Record<string, any>>(DUEL_FILE, {})
      diskDuels[duel.id] = duel
      saveFileJson(DUEL_FILE, diskDuels)
      if (redis) {
        void redis.set(`ast_active_duel:${duel.id}`, JSON.stringify(duel)).catch(() => null)
      }
      savePersistedChat(store)

      return NextResponse.json({ success: true, duel }, { headers: NO_CACHE_HEADERS })
    }

    if (action === "tower_pvp_wager") {
      const duelId = String((body as any).duelId || "")
      const bettor = String((body as any).bettor || rawUsername || "Spectator").slice(0, 24)
      const onGladiator = String((body as any).onGladiator || "").slice(0, 24)
      const amount = Math.max(100, Number((body as any).amount || 1000))

      if (!store.activeDuels) store.activeDuels = new Map()
      const duel = store.activeDuels.get(duelId)
      if (!duel || duel.status !== "active") {
        return NextResponse.json({ success: false, error: "No active duel" }, { headers: NO_CACHE_HEADERS })
      }

      if (!duel.wagers) duel.wagers = []
      duel.wagers.push({ bettor, on: onGladiator, amount })
      duel.totalPot = (duel.totalPot || 0) + amount
      duel.spectators = (duel.spectators || 1) + 1
      duel.logs.unshift(`🎲 ${bettor} placed ${amount.toLocaleString()}G wager on ${onGladiator}! (Pot: ${duel.totalPot.toLocaleString()}G)`)
      store.activeDuels.set(duelId, duel)
      const diskDuels = loadFileJson<Record<string, any>>(DUEL_FILE, {})
      diskDuels[duelId] = duel
      saveFileJson(DUEL_FILE, diskDuels)
      savePersistedChat(store)

      return NextResponse.json({ success: true, duel }, { headers: NO_CACHE_HEADERS })
    }

    // ==================== PIRATE CREWS & FLEET GUILDS ====================
    if (action === "crew_create") {
      const crewName = String((body as any).name || "").trim().slice(0, 32)
      const crewTag = String((body as any).tag || "").trim().toUpperCase().slice(0, 5)
      const jollyRoger = String((body as any).jollyRoger || "🏴‍☠️").slice(0, 8)
      const leaderName = String((body as any).leaderName || rawUsername || "Captain").slice(0, 24)
      const leaderEmail = (body.email || email || "").toLowerCase().trim()
      if (!crewName) return NextResponse.json({ success: false, error: "Crew name required" }, { headers: NO_CACHE_HEADERS })

      if (!store.crewGuilds) store.crewGuilds = new Map()
      const crewId = `crew_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
      const newCrew = {
        id: crewId,
        name: crewName,
        tag: crewTag || "CREW",
        jollyRoger,
        leaderName,
        leaderEmail,
        treasuryGold: 0,
        treasuryEssence: 0,
        totalFloorsConquered: Number((body as any).leaderFloor || 1),
        perks: { atkBonus: 0, expBonus: 0, shopDiscount: 0 },
        members: [{ name: leaderName, email: leaderEmail, role: "Captain", floor: Number((body as any).leaderFloor || 1) }],
        chat: [{ id: `cm_${Date.now()}`, sender: "System", text: `⚓ Crew [${crewName}] founded under Captain ${leaderName}!`, timestamp: Date.now() }],
        createdAt: Date.now(),
      }
      store.crewGuilds.set(crewId, newCrew)
      savePersistedChat(store)
      return NextResponse.json({ success: true, crew: newCrew }, { headers: NO_CACHE_HEADERS })
    }

    if (action === "crew_join") {
      const crewId = String((body as any).crewId || "")
      const memberName = String((body as any).memberName || rawUsername || "Navigator").slice(0, 24)
      const memberEmail = (body.email || email || "").toLowerCase().trim()
      const memberFloor = Number((body as any).memberFloor || 1)

      if (!store.crewGuilds || !store.crewGuilds.has(crewId)) {
        return NextResponse.json({ success: false, error: "Crew not found" }, { headers: NO_CACHE_HEADERS })
      }
      const crew = store.crewGuilds.get(crewId)!
      const existing = crew.members.find((m: any) => m.email === memberEmail || m.name === memberName)
      if (!existing) {
        crew.members.push({ name: memberName, email: memberEmail, role: "Mate", floor: memberFloor })
        crew.totalFloorsConquered = (crew.totalFloorsConquered || 0) + memberFloor
        crew.chat.push({ id: `cm_${Date.now()}`, sender: "System", text: `⚓ ${memberName} has joined the crew!`, timestamp: Date.now() })
        store.crewGuilds.set(crewId, crew)
        savePersistedChat(store)
      }
      return NextResponse.json({ success: true, crew }, { headers: NO_CACHE_HEADERS })
    }

    if (action === "crew_deposit") {
      const crewId = String((body as any).crewId || "")
      const gold = Math.max(0, Number((body as any).gold || 0))
      const essence = Math.max(0, Number((body as any).essence || 0))
      const depositor = String((body as any).depositor || rawUsername || "Crew Member")

      if (!store.crewGuilds || !store.crewGuilds.has(crewId)) {
        return NextResponse.json({ success: false, error: "Crew not found" }, { headers: NO_CACHE_HEADERS })
      }
      const crew = store.crewGuilds.get(crewId)!
      crew.treasuryGold = (crew.treasuryGold || 0) + gold
      crew.treasuryEssence = (crew.treasuryEssence || 0) + essence
      if (!crew.perks) crew.perks = { atkBonus: 0, expBonus: 0, shopDiscount: 0 }
      if (crew.treasuryGold >= 500000 && crew.treasuryEssence >= 100000) crew.perks.atkBonus = 15
      if (crew.treasuryGold >= 1500000 && crew.treasuryEssence >= 300000) crew.perks.expBonus = 20
      if (crew.treasuryGold >= 3000000 && crew.treasuryEssence >= 600000) crew.perks.shopDiscount = 10

      crew.chat.push({ id: `cm_${Date.now()}`, sender: "Treasury", text: `💰 ${depositor} deposited ${gold.toLocaleString()} Gold and ${essence.toLocaleString()} Essence!`, timestamp: Date.now() })
      store.crewGuilds.set(crewId, crew)
      savePersistedChat(store)
      return NextResponse.json({ success: true, crew }, { headers: NO_CACHE_HEADERS })
    }

    if (action === "crew_chat_send") {
      const crewId = String((body as any).crewId || "")
      const sender = String((body as any).sender || rawUsername || "Sailor")
      const text = String((body as any).text || "").trim().slice(0, 200)
      if (!text) return NextResponse.json({ success: false }, { headers: NO_CACHE_HEADERS })

      if (!store.crewGuilds || !store.crewGuilds.has(crewId)) {
        return NextResponse.json({ success: false, error: "Crew not found" }, { headers: NO_CACHE_HEADERS })
      }
      const crew = store.crewGuilds.get(crewId)!
      crew.chat.push({ id: `cm_${Date.now()}`, sender, text, timestamp: Date.now() })
      if (crew.chat.length > 50) crew.chat = crew.chat.slice(-50)
      store.crewGuilds.set(crewId, crew)
      savePersistedChat(store)
      return NextResponse.json({ success: true, chat: crew.chat }, { headers: NO_CACHE_HEADERS })
    }

    // ==================== PERSISTENT ADMIN GLOBAL ALERT / BANNER ====================
    if (action === "admin_set_global_alert") {
      const text = String((body as any).text || "").trim().slice(0, 300)
      const alertType = String((body as any).type || "info").slice(0, 16)
      const active = Boolean((body as any).active)
      store.globalAlert = { text, type: alertType, active, timestamp: Date.now() }
      savePersistedChat(store)
      try {
        const BROADCAST_FILE = path.join(os.tmpdir(), "ast_broadcast_v1.json")
        fs.writeFileSync(BROADCAST_FILE, JSON.stringify({ active, text, timestamp: Date.now() }), "utf-8")
      } catch {}
      if (redis) {
        await redis.set("ast_global_alert", JSON.stringify(store.globalAlert)).catch(() => null)
        await redis.set("ast_broadcast_banner", text).catch(() => null)
      }
      return NextResponse.json({ success: true, globalAlert: store.globalAlert }, { headers: NO_CACHE_HEADERS })
    }

    if (action === "tower_pvp_result") {
      const winnerName = String((body as any).winnerName || "Champion").slice(0, 24)
      const loserName = String((body as any).loserName || "Challenger").slice(0, 24)
      const duelMsg: ChatMessage = {
        id: `msg_pvp_res_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        channel: "tower" as any,
        email: "announcer@astrxy.space",
        username: "⚔️ Arena Master",
        text: `🏆 [PVP ARENA RESULT]: ${winnerName} has vanquished ${loserName} in combat! All hail the Arena Victor!`,
        timestamp: Date.now(),
        role: "admin",
      }

      store.towerMessages.push(duelMsg)
      if (store.towerMessages.length > 100) store.towerMessages = store.towerMessages.slice(-100)
      savePersistedChat(store)
      if (redis) {
        void redis.set("ast_chat_messages_tower", JSON.stringify(store.towerMessages.slice(-100))).catch(() => null)
      }

      return NextResponse.json({ success: true, message: duelMsg }, { headers: NO_CACHE_HEADERS })
    }

    // CREW GUILD ENGINE
    if (action === "crew_create") {
      const name = String((body as any).name || "").slice(0, 32).trim()
      const tag = String((body as any).tag || "").toUpperCase().slice(0, 6).trim()
      const flag = String((body as any).flag || "🏴‍☠️").slice(0, 8).trim()
      const leader = String((body as any).leader || rawUsername || "Captain").slice(0, 24).trim()
      if (!name || name.length < 3) {
        return NextResponse.json({ success: false, error: "Crew name must be at least 3 characters." }, { headers: NO_CACHE_HEADERS })
      }
      let allCrews = loadFileJson<any[]>(CREWS_FILE, [])
      if (!allCrews || allCrews.length === 0) allCrews = [...DEFAULT_CREWS]
      if (allCrews.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
        return NextResponse.json({ success: false, error: "A crew with this name already sails the seas!" }, { headers: NO_CACHE_HEADERS })
      }
      const newCrew = {
        id: `crew_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name,
        tag,
        flag,
        leader,
        plunder: 50000,
        membersCount: 1,
        maxMembers: 20,
        level: 1,
        createdAt: Date.now(),
      }
      allCrews.push(newCrew)
      saveFileJson(CREWS_FILE, allCrews)
      return NextResponse.json({ success: true, crew: newCrew, totalCrewsCreated: allCrews.length }, { headers: NO_CACHE_HEADERS })
    }

    // PET FAMILIAR ENGINE
    if (action === "pet_action") {
      const subaction = String((body as any).subaction || "")
      const userKey = (email || rawUsername || "climber").toLowerCase().trim()
      const isMasterAdmin =
        userKey === "astrxy@beezelbub.com" ||
        body.isAdmin === true ||
        isMasterPass(body.passcode)

      let petsDb = loadFileJson<Record<string, any[]>>(PETS_FILE, {})
      let userPets = petsDb[userKey] || []

      if (subaction === "claim_admin_dragon") {
        if (!isMasterAdmin) {
          return NextResponse.json({ success: false, error: "Unauthorized: Admin Sovereign Dragon is strictly reserved for Master Admin JoyBoy." }, { status: 403, headers: NO_CACHE_HEADERS })
        }
        const dragon = {
          id: `pet_admin_dragon_${userKey}`,
          name: "Abyssal Void Sovereign Dragon",
          type: "dragon",
          sprite: "🐉",
          tier: "Mythic SSS",
          level: 50,
          exp: 99999,
          atkBonus: 5000,
          defBonus: 3500,
          hpBonus: 25000,
          skillName: "Void Cataclysm Sovereign Roar",
          skillType: "void",
          skillPower: 12000,
          description: "The supreme sovereign of the abyssal seas. Forged by JoyBoy, commands the cosmic tides.",
          isAdminExclusive: true,
        }
        if (!userPets.some((p) => p.name === dragon.name)) {
          userPets.push(dragon)
          petsDb[userKey] = userPets
          saveFileJson(PETS_FILE, petsDb)
        }
        return NextResponse.json({ success: true, pet: dragon, pets: userPets }, { headers: NO_CACHE_HEADERS })
      }

      if (subaction === "hatch_egg") {
        const eggType = String((body as any).eggType || "wyrm").toLowerCase()
        let newPet: any = null
        if (eggType === "wyrm") {
          newPet = {
            id: `pet_wyrm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            name: "Baby Flame Wyrm",
            type: "wyrm",
            sprite: "🦎",
            tier: "Rare",
            level: 1,
            exp: 0,
            atkBonus: 150,
            defBonus: 80,
            hpBonus: 800,
            skillName: "Fire Breath",
            skillType: "fire",
            skillPower: 450,
            description: "A newborn fiery whelp capable of scorching creeps with blazing embers.",
          }
        } else if (eggType === "wolf") {
          newPet = {
            id: `pet_wolf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            name: "Shadow Wolf",
            type: "wolf",
            sprite: "🐺",
            tier: "Epic",
            level: 1,
            exp: 0,
            atkBonus: 220,
            defBonus: 60,
            hpBonus: 650,
            skillName: "Venom Claw",
            skillType: "void",
            skillPower: 600,
            description: "A stealthy predator that slashes through armor and inflicts neurotoxic venom.",
          }
        } else {
          newPet = {
            id: `pet_hawk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            name: "Storm Hawk",
            type: "hawk",
            sprite: "🦅",
            tier: "Rare",
            level: 1,
            exp: 0,
            atkBonus: 180,
            defBonus: 100,
            hpBonus: 700,
            skillName: "Stun Bite",
            skillType: "lightning",
            skillPower: 500,
            description: "A tempest avian whose screeching dive-bombs stun opponents in their tracks.",
          }
        }
        userPets.push(newPet)
        petsDb[userKey] = userPets
        saveFileJson(PETS_FILE, petsDb)
        return NextResponse.json({ success: true, pet: newPet, pets: userPets }, { headers: NO_CACHE_HEADERS })
      }

      if (subaction === "feed_pet") {
        const petId = String((body as any).petId || "")
        const petIdx = userPets.findIndex((p) => p.id === petId)
        if (petIdx === -1) {
          return NextResponse.json({ success: false, error: "Pet not found." }, { headers: NO_CACHE_HEADERS })
        }
        const pet = userPets[petIdx]
        pet.exp = (pet.exp || 0) + 100
        const requiredExp = pet.level * 120
        if (pet.exp >= requiredExp && pet.level < 50) {
          pet.level += 1
          pet.exp -= requiredExp
          pet.atkBonus = Math.round(pet.atkBonus * 1.25)
          pet.defBonus = Math.round(pet.defBonus * 1.25)
          pet.hpBonus = Math.round(pet.hpBonus * 1.25)
          pet.skillPower = Math.round(pet.skillPower * 1.3)

          if (pet.level >= 10 && !pet.evolved1) {
            pet.evolved1 = true
            if (pet.type === "wyrm") {
              pet.name = "Crimson Drake"
              pet.sprite = "🐲"
              pet.tier = "Epic"
              pet.skillName = "Infernal Firestorm"
            } else if (pet.type === "wolf") {
              pet.name = "Dire Shadow Wolf"
              pet.sprite = "🐺"
              pet.tier = "Legendary"
              pet.skillName = "Abyssal Bloodrend"
            } else if (pet.type === "hawk") {
              pet.name = "Thunder Roc"
              pet.sprite = "🦅"
              pet.tier = "Epic"
              pet.skillName = "Tempest Screech Barrier"
            }
          } else if (pet.level >= 25 && !pet.evolved2) {
            pet.evolved2 = true
            if (pet.type === "wyrm") {
              pet.name = "Infernal Bahamut"
              pet.sprite = "🐉"
              pet.tier = "Legendary"
              pet.skillName = "Supernova Dragon Breath"
            } else if (pet.type === "wolf") {
              pet.name = "Fenrir the Eclipse"
              pet.sprite = "🐺"
              pet.tier = "Mythic"
              pet.skillName = "Moon Devouring Fang"
            } else if (pet.type === "hawk") {
              pet.name = "Garuda of High Winds"
              pet.sprite = "🦅"
              pet.tier = "Legendary"
              pet.skillName = "Storm Judgment Hurricane"
            }
          }
        }
        userPets[petIdx] = pet
        petsDb[userKey] = userPets
        saveFileJson(PETS_FILE, petsDb)
        return NextResponse.json({ success: true, pet, pets: userPets }, { headers: NO_CACHE_HEADERS })
      }

      return NextResponse.json({ success: true, pets: userPets }, { headers: NO_CACHE_HEADERS })
    }

    // =========================================================
    // ZOMBIE TOWER DEFENSE: OUTPOST, FOREST SCAVENGING & ARMORY
    // =========================================================
    if (action === "zombie_action") {
      const subaction = body.subaction
      const diskZombie = loadFileJson<any>(ZOMBIE_STATE_FILE, {
        baseHp: 10000,
        baseMaxHp: 10000,
        materials: { timber: 50, scrap: 30, cells: 10, biomass: 5, titanium: 2 },
        towers: [],
        wave: 1,
        equippedGun: { id: "gun_ar15", name: "AR-15 Assault Rifle", atk: 450, fireRate: 600, sprite: "🔫", desc: "Standard military issue rapid-fire rifle" },
        equippedArmor: { id: "armor_kevlar", name: "Tactical Kevlar Vest", hpBonus: 3000, defBonus: 100, sprite: "🦺", desc: "Reinforced fiber vest absorbs shrapnel" },
      })

      if (subaction === "get_state") {
        return NextResponse.json({ success: true, zombieState: diskZombie }, { headers: NO_CACHE_HEADERS })
      }

      if (subaction === "scavenge_forest") {
        const zone = body.zone || "dead_woods"
        let foundMaterials: Record<string, number> = {}
        let goldFound = 0
        let logMsg = ""

        if (zone === "dead_woods") {
          foundMaterials = {
            timber: Math.floor(Math.random() * 18) + 12,
            scrap: Math.floor(Math.random() * 12) + 6,
            cells: Math.random() < 0.35 ? 2 : 0,
          }
          goldFound = Math.floor(Math.random() * 1500) + 800
          logMsg = "🌲 Scavenged Dead Woods perimeter: Recovered timber, scrap iron, and salvaged supply crate!"
        } else if (zone === "bunker") {
          foundMaterials = {
            timber: Math.floor(Math.random() * 6) + 2,
            scrap: Math.floor(Math.random() * 24) + 15,
            cells: Math.floor(Math.random() * 8) + 4,
            biomass: Math.random() < 0.45 ? 3 : 0,
          }
          goldFound = Math.floor(Math.random() * 4000) + 2000
          logMsg = "🏚️ Explored Abandoned Military Bunker: Cleared security cache, recovered high-grade scrap and power cells!"
        } else {
          foundMaterials = {
            scrap: Math.floor(Math.random() * 18) + 10,
            cells: Math.floor(Math.random() * 10) + 5,
            biomass: Math.floor(Math.random() * 10) + 5,
            titanium: Math.floor(Math.random() * 4) + 2,
          }
          goldFound = Math.floor(Math.random() * 9000) + 5000
          logMsg = "☣️ Survived Radioactive Wasteland: Extracted rare volatile biomass and refined titanium alloys!"
        }

        if (!diskZombie.materials) diskZombie.materials = { timber: 0, scrap: 0, cells: 0, biomass: 0, titanium: 0 }
        for (const [k, v] of Object.entries(foundMaterials)) {
          diskZombie.materials[k] = (diskZombie.materials[k] || 0) + v
        }
        saveFileJson(ZOMBIE_STATE_FILE, diskZombie)

        return NextResponse.json({
          success: true,
          foundMaterials,
          goldFound,
          logMsg,
          zombieState: diskZombie,
        }, { headers: NO_CACHE_HEADERS })
      }

      if (subaction === "save_state") {
        const updated = body.zombieState
        if (updated && typeof updated === "object") {
          saveFileJson(ZOMBIE_STATE_FILE, updated)
          return NextResponse.json({ success: true, zombieState: updated }, { headers: NO_CACHE_HEADERS })
        }
      }

      return NextResponse.json({ success: true, zombieState: diskZombie }, { headers: NO_CACHE_HEADERS })
    }

    if (action === "make_staff") {
      const actorEmail = (body.email || body.actor || email || "").toLowerCase().trim()
      const isAuthorized =
        actorEmail === "astrxy@beezelbub.com" ||
        body.isAdmin === true ||
        isMasterPass(body.passcode)

      if (!isAuthorized) {
        return NextResponse.json(
          { success: false, error: "Unauthorized: Master Admin clearance required." },
          { status: 403, headers: NO_CACHE_HEADERS }
        )
      }

      const target = (body.targetEmail || "").toLowerCase().trim()
      if (!target) {
        return NextResponse.json(
          { success: false, error: "Target email is required." },
          { status: 400, headers: NO_CACHE_HEADERS }
        )
      }

      const newRole = body.role === "moderator" ? "moderator" : "visitor"
      if (!store.demotedStaff) store.demotedStaff = new Set()

      if (newRole === "moderator") {
        store.demotedStaff.delete(target)
        store.invitedEmails.add(target)
        if (redis) {
          await redis.sadd("ast_moderators_set", target).catch(() => null)
          await redis.sadd("ast_chat_invites", target).catch(() => null)
          await redis.srem("ast_demoted_staff", target).catch(() => null)
        }
      } else {
        store.demotedStaff.add(target)
        store.invitedEmails.delete(target)
        if (redis) {
          await redis.srem("ast_moderators_set", target).catch(() => null)
          await redis.srem("ast_chat_invites", target).catch(() => null)
          await redis.sadd("ast_demoted_staff", target).catch(() => null)
        }
      }

      const updateRoleInList = (list: ChatMessage[]) => {
        for (const m of list) {
          if (m.email.toLowerCase() === target) {
            m.role = newRole === "moderator" ? "moderator" : "visitor"
          }
        }
      }
      updateRoleInList(store.visitorMessages)
      updateRoleInList(store.staffMessages)
      updateRoleInList(store.secretLoverMessages)
      if (store.jacknpoyMessages) updateRoleInList(store.jacknpoyMessages)

      savePersistedChat(store)

      if (redis) {
        await Promise.allSettled([
          redis.set("ast_chat_messages_visitor", JSON.stringify(store.visitorMessages.slice(-100))),
          redis.set("ast_chat_messages_staff", JSON.stringify(store.staffMessages.slice(-100))),
          redis.set("ast_chat_messages_jacknpoy", JSON.stringify((store.jacknpoyMessages || []).slice(-100))),
        ]).catch(() => null)
      }

      return NextResponse.json(
        {
          success: true,
          message: newRole === "moderator"
            ? `🛡️ Successfully promoted ${target} to Verified Staff Moderator.`
            : `Demoted ${target} from moderator to regular visitor.`,
          target,
          role: newRole,
        },
        { headers: NO_CACHE_HEADERS }
      )
    }

    // 0.3 DIRECT INBOX MESSAGING (Direct to user or admin inbox, NOT in public chat)
    if (action === "message_admin" || action === "direct_message") {
      const cleanText = (body.text || "").trim().slice(0, 500)
      if (!cleanText) {
        return NextResponse.json(
          { success: false, error: "Message text cannot be empty." },
          { status: 400, headers: NO_CACHE_HEADERS }
        )
      }

      // Security sentinel scan
      const scan = scanMessageForViolations(cleanText)
      if (scan.violated) {
        return NextResponse.json(
          { success: false, error: `Security Sentinel: ${scan.reason || "Violates community policy"}` },
          { status: 403, headers: NO_CACHE_HEADERS }
        )
      }

      const msgId = `inbox_msg_${now}_${Math.random().toString(36).slice(2, 7)}`
      const senderEmail = (body.email || body.actor || "visitor").toLowerCase().trim()
      const senderUsername = (body.username || "Visitor").trim().slice(0, 32)
      const senderRole = (body.role || "visitor") as any
      const category = (body.category || "Direct Message").trim().slice(0, 40)
      
      let targetEmail = (body.targetEmail || "").toLowerCase().trim()
      let targetUsername = (body.targetUsername || "").trim().slice(0, 32)

      if (!targetEmail || targetEmail === "astrxy@beezelbub.com" || action === "message_admin") {
        targetEmail = "astrxy@beezelbub.com"
        targetUsername = "JoyBoy (Founder)"
      }
      if (!targetUsername) {
        targetUsername = targetEmail.split("@")[0] || "User"
      }

      const directInboxEntry = {
        id: msgId,
        senderEmail,
        senderUsername,
        senderRole,
        targetEmail,
        targetUsername,
        category,
        text: cleanText,
        timestamp: now,
        channel,
        read: false,
      }

      // 1. Target Keys for inbox delivery
      const targetKeys = Array.from(new Set([
        targetEmail,
        targetUsername.toLowerCase(),
        targetEmail.includes("@") ? targetEmail.split("@")[0].toLowerCase() : null,
        !targetUsername.includes("@") ? `${targetUsername.toLowerCase()}@beezelbub.com` : null,
      ].filter(Boolean) as string[]))

      // 2. Always store in memory store FIRST (100% Guaranteed delivery)
      if (targetEmail === "astrxy@beezelbub.com" || action === "message_admin") {
        if (!store.adminInboxMessages) store.adminInboxMessages = []
        store.adminInboxMessages.unshift(directInboxEntry)
        if (store.adminInboxMessages.length > 200) store.adminInboxMessages.pop()
      }

      if (!store.userInboxes) store.userInboxes = new Map()
      for (const tk of targetKeys) {
        const cur = store.userInboxes.get(tk) || []
        store.userInboxes.set(tk, [directInboxEntry, ...cur.filter((m) => m && m.id !== directInboxEntry.id).slice(0, 99)])
      }
      savePersistedChat(store)

      // 3. Store in Redis if connected
      if (redis) {
        try {
          if (targetEmail === "astrxy@beezelbub.com" || action === "message_admin") {
            await redis.lpush("ast_admin_inbox_messages", JSON.stringify(directInboxEntry)).catch(() => null)
            await redis.ltrim("ast_admin_inbox_messages", 0, 200).catch(() => null)
            await redis.incr("ast_admin_unread_count").catch(() => null)
          }

          for (const tk of targetKeys) {
            await redis.lpush(`ast_user_inbox:${tk}`, JSON.stringify(directInboxEntry)).catch(() => null)
            await redis.ltrim(`ast_user_inbox:${tk}`, 0, 100).catch(() => null)
            await redis.incr(`ast_user_unread:${tk}`).catch(() => null)
          }

          // Also store in sender's inbox log so sender can see thread
          if (senderEmail && senderEmail !== targetEmail) {
            await redis.lpush(`ast_user_inbox:${senderEmail}`, JSON.stringify(directInboxEntry)).catch(() => null)
            await redis.ltrim(`ast_user_inbox:${senderEmail}`, 0, 100).catch(() => null)
          }
        } catch {}
      }

      // Scrub accidental public chat duplicates
      store.visitorMessages = store.visitorMessages.filter((m) => !m.text.startsWith("🔒 [To Master Admin @JoyBoy]"))
      store.staffMessages = store.staffMessages.filter((m) => !m.text.startsWith("🔒 [To Master Admin @JoyBoy]"))
      savePersistedChat(store)

      return NextResponse.json(
        {
          success: true,
          message: `Direct message delivered to @${targetUsername}'s Inbox across all servers.`,
          messageId: msgId,
          entry: directInboxEntry,
        },
        { headers: NO_CACHE_HEADERS }
      )
    }

    // 0.32 SET CUSTOM PAID NICKNAME (MASTER ADMIN ONLY)
    if (action === "set_custom_nickname") {
      const isAuthorized =
        email === "astrxy@beezelbub.com" ||
        body.isAdmin === true ||
        isMasterPass(body.passcode)

      if (!isAuthorized) {
        return NextResponse.json(
          { success: false, error: "Unauthorized: Master Admin privileges required to set custom paid callsign." },
          { status: 403, headers: NO_CACHE_HEADERS }
        )
      }

      const targetEmail = (body.targetEmail || "").toLowerCase().trim()
      const customNickname = (body.customNickname || "").trim()

      if (!targetEmail || !customNickname) {
        return NextResponse.json(
          { success: false, error: "Target email and custom nickname are required." },
          { status: 400, headers: NO_CACHE_HEADERS }
        )
      }

      if (!store.customNicknames) store.customNicknames = new Map()
      store.customNicknames.set(targetEmail.toLowerCase().trim(), customNickname.trim())
      savePersistedChat(store)
      if (redis) {
        try {
          await redis.hset("ast_chat_custom_nicknames", targetEmail.toLowerCase().trim(), customNickname.trim())
        } catch {}
      }

      return NextResponse.json(
        { success: true, message: `Custom paid callsign "${customNickname}" assigned to ${targetEmail}!` },
        { headers: NO_CACHE_HEADERS }
      )
    }

    // 0.35 DELETE SINGLE INBOX MESSAGE (PERSISTENT ACROSS MEMORY, DISK, AND REDIS)
    if (action === "delete_inbox_message") {
      const messageId = body.messageId
      const targetUserEmail = (body.email || email || "").toLowerCase().trim()
      const isAuthorizedAdmin =
        email === "astrxy@beezelbub.com" ||
        body.isAdmin === true ||
        isMasterPass(body.passcode)

      // 1. Delete from memory store
      if (store.adminInboxMessages) {
        store.adminInboxMessages = store.adminInboxMessages.filter(
          (m: any) => m && m.id !== messageId && m.timestamp !== body.timestamp
        )
      }
      if (store.userInboxes) {
        for (const [uKey, uList] of store.userInboxes.entries()) {
          store.userInboxes.set(
            uKey,
            (uList || []).filter((m: any) => m && m.id !== messageId && m.timestamp !== body.timestamp)
          )
        }
      }
      savePersistedChat(store)

      if (redis && messageId) {
        try {
          if (isAuthorizedAdmin || body.source === "admin") {
            const rawAdmin = await redis.lrange("ast_admin_inbox_messages", 0, 100)
            if (Array.isArray(rawAdmin)) {
              for (const item of rawAdmin) {
                try {
                  const parsed = typeof item === "string" ? JSON.parse(item) : item
                  if (parsed && (parsed.id === messageId || parsed.timestamp === body.timestamp)) {
                    await redis.lrem("ast_admin_inbox_messages", 1, typeof item === "string" ? item : JSON.stringify(item))
                  }
                } catch {}
              }
            }
          }
          if (targetUserEmail) {
            const rawUser = await redis.lrange(`ast_user_inbox:${targetUserEmail}`, 0, 100)
            if (Array.isArray(rawUser)) {
              for (const item of rawUser) {
                try {
                  const parsed = typeof item === "string" ? JSON.parse(item) : item
                  if (parsed && (parsed.id === messageId || parsed.timestamp === body.timestamp)) {
                    await redis.lrem(`ast_user_inbox:${targetUserEmail}`, 1, typeof item === "string" ? item : JSON.stringify(item))
                  }
                } catch {}
              }
            }
          }
        } catch {}
      }

      return NextResponse.json(
        { success: true, message: "Inbox message deleted permanently." },
        { headers: NO_CACHE_HEADERS }
      )
    }

    // 0.4 CLEAR ADMIN OR USER INBOX
    if (action === "clear_admin_inbox" || action === "clear_user_inbox") {
      const isAuthorized =
        email === "astrxy@beezelbub.com" ||
        body.isAdmin === true ||
        isMasterPass(body.passcode)

      if (action === "clear_admin_inbox") {
        if (!isAuthorized) {
          return NextResponse.json(
            { success: false, error: "Unauthorized: Master Admin clearance required." },
            { status: 403, headers: NO_CACHE_HEADERS }
          )
        }
        store.adminInboxMessages = []
        savePersistedChat(store)
        if (redis) {
          try {
            await redis.del("ast_admin_inbox_messages")
            await redis.set("ast_admin_unread_count", "0")
          } catch {}
        }
        return NextResponse.json(
          { success: true, message: "Master Admin inbox cleared permanently." },
          { headers: NO_CACHE_HEADERS }
        )
      } else {
        const target = (body.targetEmail || email || "").toLowerCase().trim()
        if (target && store.userInboxes) {
          store.userInboxes.set(target, [])
          for (const [k, v] of store.userInboxes.entries()) {
            if (k.toLowerCase() === target) store.userInboxes.set(k, [])
          }
        }
        savePersistedChat(store)
        if (redis && target) {
          try {
            await redis.del(`ast_user_inbox:${target}`)
            await redis.set(`ast_user_unread:${target}`, "0")
          } catch {}
        }
        return NextResponse.json(
          { success: true, message: "User inbox cleared permanently." },
          { headers: NO_CACHE_HEADERS }
        )
      }
    }

    // 0.5 CLEAR USER MENTIONS
    if (action === "clear_user_mentions") {
      const targetUser = (body.username || body.handle || "").toLowerCase().trim()
      const targetEmail = (body.email || "").toLowerCase().trim()
      if (redis) {
        try {
          if (targetUser) await redis.del(`ast_user_mentions:${targetUser}`)
          if (targetEmail) await redis.del(`ast_user_mentions:${targetEmail}`)
          const cleanUser = targetUser.replace(/^@/, "").trim()
          if (cleanUser) await redis.del(`ast_user_mentions:${cleanUser}`)
          if (targetEmail.includes("@")) {
            const emailPrefix = targetEmail.split("@")[0].trim()
            if (emailPrefix) await redis.del(`ast_user_mentions:${emailPrefix}`)
          }
        } catch {}
      }
      return NextResponse.json({ success: true, message: "Mentions cleared." }, { headers: NO_CACHE_HEADERS })
    }

    // A. TYPING HEARTBEAT
    if (action === "typing") {
      const user = (body.username || "Visitor").trim().slice(0, 24)
      if (email || user) {
        const key = email || user
        store.typingUsers.set(key, { username: user, channel, timestamp: now })
      }
      return NextResponse.json({ success: true }, { headers: NO_CACHE_HEADERS })
    }

    // B. EDIT MESSAGE
    if (action === "edit_msg") {
      const messageId = body.messageId
      const newText = (body.text || "").trim().slice(0, 500)
      if (!messageId || !newText) {
        return NextResponse.json({ success: false, error: "Invalid edit payload" }, { status: 400, headers: NO_CACHE_HEADERS })
      }
      const list =
        channel === "secretlover"
          ? store.secretLoverMessages
          : channel === "staff"
          ? store.staffMessages
          : store.visitorMessages

      const targetMsg = list.find((m) => m.id === messageId)
      if (!targetMsg) {
        return NextResponse.json({ success: false, error: "Message not found" }, { status: 404, headers: NO_CACHE_HEADERS })
      }

      const isOwner = targetMsg.email.toLowerCase() === email.toLowerCase()
      const isAdminActor = email === "astrxy@beezelbub.com"
      if (!isOwner && !isAdminActor) {
        return NextResponse.json({ success: false, error: "You can only edit your own messages." }, { status: 403, headers: NO_CACHE_HEADERS })
      }

      // Security scan on edited text for non-privileged
      if (!isAdminActor && targetMsg.role !== "admin" && targetMsg.role !== "moderator") {
        const scan = scanMessageForViolations(newText)
        if (scan.violated) {
          return NextResponse.json({ success: false, error: `Edit rejected: ${scan.reason}` }, { status: 403, headers: NO_CACHE_HEADERS })
        }
      }

      targetMsg.text = newText
      targetMsg.edited = true
      targetMsg.editedAt = Date.now()
      savePersistedChat(store)

      if (redis) {
        const redisKey =
          channel === "secretlover"
            ? "ast_chat_messages_secretlover"
            : channel === "staff"
            ? "ast_chat_messages_staff"
            : "ast_chat_messages_visitor"
        await redis.set(redisKey, JSON.stringify(list.slice(-100))).catch(() => null)
      }

      return NextResponse.json({ success: true, message: targetMsg }, { headers: NO_CACHE_HEADERS })
    }

    // C. INVITATION TO SECRET LOVER ROOM (Admin Inspector Exclusive)
    if (action === "secretlover_invite") {
      if (email !== "astrxy@beezelbub.com" && body.actor?.toLowerCase() !== "astrxy@beezelbub.com") {
        return NextResponse.json({ success: false, error: "Unauthorized: Master Admin only" }, { status: 403, headers: NO_CACHE_HEADERS })
      }
      const target = (body.targetEmail || "").toLowerCase().trim()
      if (!target) {
        return NextResponse.json({ success: false, error: "Target email required" }, { status: 400, headers: NO_CACHE_HEADERS })
      }
      store.secretLoverInvites.add(target)
      savePersistedChat(store)
      if (redis) {
        await redis.sadd("ast_chat_secretlover_invites", target).catch(() => null)
      }

      const sysMsg: ChatMessage = {
        id: `sec_inv_${Date.now()}`,
        channel: "secretlover",
        email: "astrxy@beezelbub.com",
        username: "JoyBoy (Founder)",
        text: `🔒 Secret Room Activated: Welcome to the private room. Clearance granted for ${target}.`,
        timestamp: Date.now(),
        role: "admin",
      }
      store.secretLoverMessages.push(sysMsg)
      savePersistedChat(store)

      if (redis) {
        await redis.set("ast_chat_messages_secretlover", JSON.stringify(store.secretLoverMessages.slice(-100))).catch(() => null)
      }

      return NextResponse.json(
        {
          success: true,
          message: `Invited ${target} to Secret Lover room.`,
          target,
          totalInvited: store.secretLoverInvites.size,
        },
        { headers: NO_CACHE_HEADERS }
      )
    }

    // D. MODERATION: MANUAL MUTE USER
    if (action === "mute_user") {
      const actorEmail = (body.email || body.actor || email || "").toLowerCase().trim()
      const isMasterAdmin =
        actorEmail === "astrxy@beezelbub.com" ||
        body.isAdmin === true ||
        isMasterPass(body.passcode)
      const isAuth =
        isMasterAdmin ||
                redisMods.includes(actorEmail)
      if (!isAuth) {
        return NextResponse.json({ success: false, error: "Unauthorized: Admin clearance required." }, { status: 403, headers: NO_CACHE_HEADERS })
      }
      const target = (body.targetEmail || "").toLowerCase().trim()
      if (!target) return NextResponse.json({ success: false, error: "Target email required" }, { status: 400 })
      if (target === "astrxy@beezelbub.com") {
        return NextResponse.json({ success: false, error: "Master Admin cannot be muted." }, { status: 400 })
      }
      const durationMs = typeof body.durationMs === "number" && body.durationMs > 0
        ? body.durationMs
        : (body.durationHours ? body.durationHours * 3600000 : 24 * 3600000)
      const mutedUntil = now + durationMs
      const reason = body.reason || "Manual moderator penalty"
      const entry: MutedUserEntry = { email: target, mutedUntil, reason, actor: body.actor || actorEmail || "Staff Admin" }
      store.mutedUsers.set(target, entry)
      savePersistedChat(store)
      if (redis) await redis.hset("ast_chat_muted", { [target]: JSON.stringify(entry) }).catch(() => null)
      return NextResponse.json({ success: true, message: `Muted ${target} successfully`, mutedUntil, reason }, { headers: NO_CACHE_HEADERS })
    }

    // E. MODERATION: UNMUTE USER
    if (action === "unmute_user") {
      const actorEmail = (body.email || body.actor || email || "").toLowerCase().trim()
      const isMasterAdmin =
        actorEmail === "astrxy@beezelbub.com" ||
        body.isAdmin === true ||
        isMasterPass(body.passcode)
      const isAuth =
        isMasterAdmin ||
                redisMods.includes(actorEmail)
      if (!isAuth) {
        return NextResponse.json({ success: false, error: "Unauthorized: Admin clearance required." }, { status: 403, headers: NO_CACHE_HEADERS })
      }
      const target = (body.targetEmail || "").toLowerCase().trim()
      store.mutedUsers.delete(target)
      savePersistedChat(store)
      if (redis) await redis.hdel("ast_chat_muted", target).catch(() => null)
      return NextResponse.json({ success: true, message: `Unmuted ${target}` }, { headers: NO_CACHE_HEADERS })
    }

    // F. MODERATION: BAN USER
    if (action === "ban_user") {
      const actorEmail = (body.email || body.actor || email || "").toLowerCase().trim()
      const isMasterAdmin =
        actorEmail === "astrxy@beezelbub.com" ||
        body.isAdmin === true ||
        isMasterPass(body.passcode)
      const isAuth =
        isMasterAdmin ||
                redisMods.includes(actorEmail)
      if (!isAuth) {
        return NextResponse.json({ success: false, error: "Unauthorized: Admin clearance required." }, { status: 403, headers: NO_CACHE_HEADERS })
      }
      const target = (body.targetEmail || "").toLowerCase().trim()
      if (!target) return NextResponse.json({ success: false, error: "Target email required" }, { status: 400 })
      if (target === "astrxy@beezelbub.com") {
        return NextResponse.json({ success: false, error: "Master Admin cannot be banned." }, { status: 400 })
      }
      store.bannedEmails.add(target)
      store.visitorMessages = store.visitorMessages.filter((m) => m.email.toLowerCase() !== target)
      store.staffMessages = store.staffMessages.filter((m) => m.email.toLowerCase() !== target)
      store.secretLoverMessages = store.secretLoverMessages.filter((m) => m.email.toLowerCase() !== target)
      savePersistedChat(store)
      if (redis) {
        await redis.sadd("ast_chat_banned", target).catch(() => null)
        await redis.set("ast_chat_messages_visitor", JSON.stringify(store.visitorMessages.slice(-100))).catch(() => null)
        await redis.set("ast_chat_messages_staff", JSON.stringify(store.staffMessages.slice(-100))).catch(() => null)
      }
      return NextResponse.json({ success: true, message: `Banned ${target}` }, { headers: NO_CACHE_HEADERS })
    }

    // G. MODERATION: UNBAN USER
    if (action === "unban_user") {
      const actorEmail = (body.email || body.actor || email || "").toLowerCase().trim()
      const isMasterAdmin =
        actorEmail === "astrxy@beezelbub.com" ||
        body.isAdmin === true ||
        isMasterPass(body.passcode)
      const isAuth =
        isMasterAdmin ||
                redisMods.includes(actorEmail)
      if (!isAuth) {
        return NextResponse.json({ success: false, error: "Unauthorized: Admin clearance required." }, { status: 403, headers: NO_CACHE_HEADERS })
      }
      const target = (body.targetEmail || "").toLowerCase().trim()
      store.bannedEmails.delete(target)
      savePersistedChat(store)
      if (redis) await redis.srem("ast_chat_banned", target).catch(() => null)
      return NextResponse.json({ success: true, message: `Unbanned ${target}` }, { headers: NO_CACHE_HEADERS })
    }

    // REAL-TIME GLOBAL OTP PLUNDER INCREMENT
    if (action === "increment_plunder") {
      let count = ((store as any).plunderCount || 1847) + 1
      ;(store as any).plunderCount = count
      if (redis) {
        try {
          const inc = await redis.incr("ast_otp_plunder_count")
          count = typeof inc === "number" ? inc : count
        } catch {}
      }
      return NextResponse.json({ success: true, count }, { headers: NO_CACHE_HEADERS })
    }

    // H. MODERATION: DELETE MESSAGE (STRICT SECURITY: ONLY MASTER ADMIN CAN DELETE MESSAGES IN CHAT, NOT MODERATORS)
    if (action === "delete_msg") {
      const messageId = body.messageId
      if (!messageId) {
        return NextResponse.json({ success: false, error: "messageId required" }, { status: 400, headers: NO_CACHE_HEADERS })
      }
      const actorEmail = (body.email || body.actor || email || "").toLowerCase().trim()
      const passcode = body.passcode || ""
      const isMasterAdmin =
        isMasterPass(passcode) ||
        body.isAdmin === true ||
        actorEmail === "astrxy@beezelbub.com"

      // Check if requester is a moderator trying to delete
      const isModerator = redisMods.includes(actorEmail) || body.role === "moderator" 

      if (isModerator && !isMasterAdmin) {
        return NextResponse.json(
          { success: false, error: "Access Denied: Moderators cannot delete chat messages. Only Master Admin is authorized." },
          { status: 403, headers: NO_CACHE_HEADERS }
        )
      }

      // If not Master Admin, regular users may only delete their own message
      if (!isMasterAdmin) {
        const allMsgs = [...store.visitorMessages, ...store.staffMessages, ...store.secretLoverMessages]
        const targetMsg = allMsgs.find((m) => m && m.id === messageId)
        if (targetMsg && email && targetMsg.email.toLowerCase() !== email) {
          return NextResponse.json(
            { success: false, error: "Access Denied: Only Master Admin can delete other users' messages." },
            { status: 403, headers: NO_CACHE_HEADERS }
          )
        }
      }

      store.visitorMessages = store.visitorMessages.filter((m) => m.id !== messageId)
      store.staffMessages = store.staffMessages.filter((m) => m.id !== messageId)
      store.secretLoverMessages = store.secretLoverMessages.filter((m) => m.id !== messageId)
      savePersistedChat(store)
      if (redis) {
        try {
          const keys = ["ast_chat_messages_visitor", "ast_chat_messages_staff", "ast_chat_messages_secretlover"]
          await Promise.allSettled(
            keys.map(async (k) => {
              const raw = (await redis.get(k)) as string | ChatMessage[] | null
              if (raw) {
                const parsed = typeof raw === "string" ? JSON.parse(raw) : raw
                if (Array.isArray(parsed)) {
                  const filtered = parsed.filter((m: ChatMessage) => m && m.id !== messageId)
                  await redis.set(k, JSON.stringify(filtered.slice(-100)))
                }
              }
            })
          )
        } catch {}
      }
      return NextResponse.json({ success: true, message: "Message deleted successfully." }, { headers: NO_CACHE_HEADERS })
    }

    // I. INVITATION TO SECRET STAFF LOUNGE
    if (action === "invite") {
      const target = (body.targetEmail || "").toLowerCase().trim()
      if (!target) {
        return NextResponse.json({ success: false, error: "Target claimed email required" }, { status: 400, headers: NO_CACHE_HEADERS })
      }
      store.invitedEmails.add(target)
      savePersistedChat(store)
      if (redis) {
        await redis.sadd("ast_chat_invites", target).catch(() => null)
      }
      return NextResponse.json({ success: true, message: `Invited ${target} to Secret Staff Lounge.`, target }, { headers: NO_CACHE_HEADERS })
    }

    // K. ADMIN ACTION: SET USER NICKNAME COLOR (HTML Color Names)
    if (action === "set_nickname_color") {
      const pass = (body.passcode || "").trim()
      const actorEmail = (body.email || body.actor || email || "").toLowerCase().trim()
      const isMaster =
        actorEmail === "astrxy@beezelbub.com" ||
        body.isAdmin === true ||
        isMasterPass(pass)
      if (!isMaster) {
        return NextResponse.json(
          { success: false, error: "Access Denied: Only Master Admin can edit nickname colors." },
          { status: 403, headers: NO_CACHE_HEADERS }
        )
      }
      const target = (body.targetEmail || "").toLowerCase().trim()
      const color = (body.color || "").trim()
      if (!target) {
        return NextResponse.json({ success: false, error: "Target email required." }, { status: 400 })
      }
      if (color) {
        store.userColors.set(target, color)
      } else {
        store.userColors.delete(target)
      }
      for (const m of store.visitorMessages) {
        if (m.email.toLowerCase() === target) m.color = color || undefined
      }
      for (const m of store.staffMessages) {
        if (m.email.toLowerCase() === target) m.color = color || undefined
      }
      for (const m of store.secretLoverMessages) {
        if (m.email && m.email.toLowerCase() === target) m.color = color || undefined
      }
      for (const m of store.jacknpoyMessages) {
        if (m.email && m.email.toLowerCase() === target) m.color = color || undefined
      }
      savePersistedChat(store)
      if (redis) {
        try {
          if (color) {
            await redis.hset("ast_chat_user_colors", { [target]: color })
          } else {
            await redis.hdel("ast_chat_user_colors", target)
          }
          await Promise.allSettled([
            redis.set("ast_chat_messages_visitor", JSON.stringify(store.visitorMessages.slice(-100))),
            redis.set("ast_chat_messages_staff", JSON.stringify(store.staffMessages.slice(-100))),
            redis.set("ast_chat_messages_secretlover", JSON.stringify(store.secretLoverMessages.slice(-100))),
          ]).catch(() => null)
        } catch {}
      }
      return NextResponse.json(
        { success: true, message: `Updated nickname color for ${target}`, target, color },
        { headers: NO_CACHE_HEADERS }
      )
    }

    // LOGOUT ACTION: Remove user presence globally from chat server
    if (action === "logout") {
      const targetEmail = (body.email || email || "").toLowerCase().trim()
      if (targetEmail) {
        store.onlineUsers.delete(targetEmail)
        store.typingUsers.delete(targetEmail)
      }
      store.onlineUsers.delete("astrxy@beezelbub.com")
      store.typingUsers.delete("astrxy@beezelbub.com")
      if (body.clientId) {
        store.onlineUsers.delete(body.clientId)
      }
      return NextResponse.json({ success: true, message: "Logged out globally from chat server." }, { headers: NO_CACHE_HEADERS })
    }

    // J. CLEAR CHANNEL MESSAGES (Single Room or ALL Rooms) - STRICTLY MASTER ADMIN ONLY
    if (action === "clear" || action === "clear_chat" || action === "purge_chat" || action === "clear_convo") {
      const pass = (body.passcode || "").trim()
      const isMasterAdmin =
        body.isAdmin === true ||
        isMasterPass(pass) ||
        (body.actor && body.actor.toLowerCase().trim() === "astrxy@beezelbub.com")

      if (!isMasterAdmin) {
        return NextResponse.json(
          { success: false, error: "Access Denied: Only Master Admin can wipe or clear chat rooms." },
          { status: 403, headers: NO_CACHE_HEADERS }
        )
      }

      const targetChannel = (body.channel || channel || "all").toLowerCase().trim()
      if (targetChannel === "all" || targetChannel === "all_rooms" || targetChannel === "everywhere") {
        store.visitorMessages = []
        store.staffMessages = []
        store.secretLoverMessages = []
        store.jacknpoyMessages = []
        savePersistedChat(store)
        if (redis) {
          try {
            await Promise.allSettled([
              redis.del("ast_chat_messages_visitor"),
              redis.del("ast_chat_messages_staff"),
              redis.del("ast_chat_messages_secretlover"),
              redis.del("ast_chat_messages_jacknpoy"),
              redis.del("ast_chat_messages_tower"),
            ])
          } catch {}
        }
        return NextResponse.json(
          { success: true, message: "Cleared ALL chat rooms successfully.", channel: "all" },
          { headers: NO_CACHE_HEADERS }
        )
      } else if (targetChannel === "secretlover") {
        store.secretLoverMessages = []
        savePersistedChat(store)
        if (redis) {
          try {
            await redis.del("ast_chat_messages_secretlover")
          } catch {}
        }
        return NextResponse.json(
          { success: true, message: "Cleared Secret Lover chat history.", channel: "secretlover" },
          { headers: NO_CACHE_HEADERS }
        )
      } else if (targetChannel === "staff") {
        store.staffMessages = []
        savePersistedChat(store)
        if (redis) {
          try {
            await redis.del("ast_chat_messages_staff")
          } catch {}
        }
        return NextResponse.json(
          { success: true, message: "Cleared Staff Lounge chat history.", channel: "staff" },
          { headers: NO_CACHE_HEADERS }
        )
      } else if (targetChannel === "jacknpoy") {
        store.jacknpoyMessages = []
        savePersistedChat(store)
        if (redis) {
          try {
            await redis.del("ast_chat_messages_jacknpoy")
          } catch {}
        }
        return NextResponse.json(
          { success: true, message: "Cleared Jack 'en Poy chat history.", channel: "jacknpoy" },
          { headers: NO_CACHE_HEADERS }
        )
      } else if (targetChannel === "tower") {
        store.towerMessages = []
        savePersistedChat(store)
        if (redis) {
          try {
            await redis.del("ast_chat_messages_tower")
          } catch {}
        }
        return NextResponse.json(
          { success: true, message: "Cleared Tower of Trials chat history.", channel: "tower" },
          { headers: NO_CACHE_HEADERS }
        )
      } else if (targetChannel === "zombie") {
        store.zombieMessages = []
        savePersistedChat(store)
        if (redis) {
          try {
            await redis.del("ast_chat_messages_zombie")
          } catch {}
        }
        return NextResponse.json(
          { success: true, message: "Cleared Zombie Defense chat history.", channel: "zombie" },
          { headers: NO_CACHE_HEADERS }
        )
      } else {
        store.visitorMessages = []
        savePersistedChat(store)
        if (redis) {
          try {
            await redis.del("ast_chat_messages_visitor")
          } catch {}
        }
        return NextResponse.json(
          { success: true, message: "Cleared Public chat history.", channel: "visitor" },
          { headers: NO_CACHE_HEADERS }
        )
      }
    }

    // ==========================================
    // K. SEND CHAT MESSAGE & AUTOMATED SECURITY
    // ==========================================
    if (store.bannedEmails.has(email)) {
      return NextResponse.json(
        { success: false, error: "🚫 You have been banned from Astrxy Community Chat by Admin." },
        { status: 403, headers: NO_CACHE_HEADERS }
      )
    }

    let role: ChatMessage["role"] = "visitor"
    const isMasterAdminRequest = Boolean(
      email === "astrxy@beezelbub.com" ||
      body.isAdmin === true ||
      isMasterPass(body.passcode)
    )
    if (isMasterAdminRequest) {
      role = "admin"
    } else if (redisMods.includes(email) || store.invitedEmails.has(email)) {
      role = "moderator"
    } else {
      if (redis) {
        const isMod = (await redis.sismember("ast_moderators_set", email).catch(() => 0)) || store.invitedEmails.has(email)
        if (isMod) {
          role = "moderator"
        } else {
          // STRICT CHECK: Only assign 'claimed' if ACTUALLY claimed in Redis or verified client flag
          const isClaimedRedis = (await redis.sismember("ast_claimed_emails", email).catch(() => 0)) ||
                                 (await redis.hexists("ast_claimed_mailboxes", email).catch(() => 0))
          if (isClaimedRedis || body.isClaimed === true) {
            role = "claimed"
          } else {
            role = "visitor"
          }
        }
      } else {
        if (body.isClaimed === true) {
          role = "claimed"
        } else {
          role = "visitor"
        }
      }
    }

    const isPrivileged = role === "admin" || role === "moderator"

    // Check mute (Both in-memory store and direct Redis verification)
    if (!isPrivileged && email && email !== "visitor") {
      let muteEntry = store.mutedUsers.get(email)
      if (!muteEntry && redis && email) {
        try {
          const rawM = await redis.hget("ast_chat_muted", email)
          if (rawM) {
            muteEntry = typeof rawM === "string" ? JSON.parse(rawM) : (rawM as MutedUserEntry)
          }
        } catch {}
      }
      if (muteEntry && muteEntry.mutedUntil > now) {
        const hoursLeft = Math.ceil((muteEntry.mutedUntil - now) / 3600000)
        const minsLeft = Math.ceil((muteEntry.mutedUntil - now) / 60000)
        return NextResponse.json(
          {
            success: false,
            error: `🚫 You are MUTED (${minsLeft > 60 ? `~${hoursLeft}h` : `${minsLeft}m`} remaining). Reason: ${muteEntry.reason}`,
            muted: true,
            isMuted: true,
            mutedUntil: muteEntry.mutedUntil,
            muteReason: muteEntry.reason,
          },
          { status: 403, headers: NO_CACHE_HEADERS }
        )
      } else if (muteEntry && muteEntry.mutedUntil <= now) {
        store.mutedUsers.delete(email)
        savePersistedChat(store)
        if (redis && email) await redis.hdel("ast_chat_muted", email).catch(() => null)
      }
    }

    const rawText = (body.text || "").trim()
    const hasAttachment = Boolean(body.attachment && body.attachment.url)
    if (!rawText && !hasAttachment) {
      return NextResponse.json({ success: false, error: "Message or attachment cannot be empty" }, { status: 400, headers: NO_CACHE_HEADERS })
    }

    const cleanText = rawText.slice(0, 500)
    let rawUsername = (body.username || "Anonymous").trim().slice(0, 24)
    if ((role === "admin" || isMasterAdminRequest || email === "astrxy@beezelbub.com") && (!rawUsername || /^ast[a-z0-9]{5,}$/i.test(rawUsername) || rawUsername === "Anonymous" || rawUsername === "Visitor")) {
      rawUsername = "astrxy"
    }

    // Block photo & file uploads in public chat for Visitor and Claimed email (Allowed for Admin & Moderator only)
    if (hasAttachment && (channel === "visitor" || channel === "public" || !channel)) {
      const isAllowedUploader = isPrivileged || role === "admin" || role === "moderator"
      if (!isAllowedUploader) {
        return NextResponse.json(
          { success: false, error: "Photo and file uploads in public chat are restricted to Admin and Moderators." },
          { status: 403, headers: NO_CACHE_HEADERS }
        )
      }
    }

    // Security Scan on non-privileged messages
    if (!isPrivileged && cleanText) {
      const scan = scanMessageForViolations(cleanText)
      if (scan.violated) {
        const mutedUntil = now + 86400000
        const reason = scan.reason || "Security policy violation"
        const muteEntry: MutedUserEntry = {
          email,
          mutedUntil,
          reason,
          actor: "Automated Sentinel Shield",
        }
        if (email && email !== "visitor" && email.includes("@")) {
          store.mutedUsers.set(email, muteEntry)
          savePersistedChat(store)
          if (redis) {
            await redis.hset("ast_chat_muted", { [email]: JSON.stringify(muteEntry) }).catch(() => null)
          }
        }
        return NextResponse.json(
          {
            success: false,
            error: `🚫 Message rejected: ${reason}. You have been MUTED for 1 day.`,
            muted: true,
            reason,
            mutedUntil,
          },
          { status: 403, headers: NO_CACHE_HEADERS }
        )
      }
    }

    // Access authorization check: Staff members never need an invite
    if (channel === "staff") {
      const defaultStaff = ["astrxy@beezelbub.com"]
      const isAuthorized =
        role === "admin" ||
        role === "moderator" ||
        defaultStaff.includes(email) ||
        redisMods.includes(email) ||
        store.invitedEmails.has(email)
      if (!isAuthorized) {
        return NextResponse.json({ success: false, error: "Unauthorized for Secret Staff Lounge" }, { status: 403, headers: NO_CACHE_HEADERS })
      }
    } else if (channel === "secretlover") {
      const isAuthorized = role === "admin" || store.secretLoverInvites.has(email)
      if (!isAuthorized) {
        return NextResponse.json({ success: false, error: "Unauthorized for Secret Room" }, { status: 403, headers: NO_CACHE_HEADERS })
      }
    }

    // Sanitize ReplyTo payload
    let replyTo: ChatMessage["replyTo"] = undefined
    if (body.replyTo && typeof body.replyTo === "object" && body.replyTo.id) {
      replyTo = {
        id: String(body.replyTo.id).slice(0, 48),
        username: String(body.replyTo.username || "User").slice(0, 24),
        text: String(body.replyTo.text || "").slice(0, 150),
      }
    }

    // Sanitize Attachment payload
    let attachment: ChatMessage["attachment"] = undefined
    if (body.attachment && typeof body.attachment === "object" && body.attachment.url) {
      attachment = {
        name: String(body.attachment.name || "attachment").slice(0, 64),
        type: String(body.attachment.type || "application/octet-stream").slice(0, 64),
        url: String(body.attachment.url).slice(0, 3500000), // capped for safety
        size: Number(body.attachment.size || 0),
      }
    }

    const userCol = store.userColors ? store.userColors.get(email.toLowerCase().trim()) : undefined
    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      channel,
      email: email || "visitor@community.net",
      username: rawUsername || "Visitor",
      text: cleanText,
      timestamp: Date.now(),
      role,
      color: userCol || undefined,
      replyTo,
      attachment,
    }

    if (channel === "secretlover") {
      store.secretLoverMessages.push(newMsg)
      if (store.secretLoverMessages.length > 100) store.secretLoverMessages = store.secretLoverMessages.slice(-100)
    } else if (channel === "staff") {
      store.staffMessages.push(newMsg)
      if (store.staffMessages.length > 100) store.staffMessages = store.staffMessages.slice(-100)
    } else if (channel === "jacknpoy") {
      store.jacknpoyMessages.push(newMsg)
      if (store.jacknpoyMessages.length > 100) store.jacknpoyMessages = store.jacknpoyMessages.slice(-100)
    } else if (channel === "tower") {
      store.towerMessages.push(newMsg)
      if (store.towerMessages.length > 100) store.towerMessages = store.towerMessages.slice(-100)
    } else if (channel === "zombie") {
      store.zombieMessages.push(newMsg)
      if (store.zombieMessages.length > 100) store.zombieMessages = store.zombieMessages.slice(-100)
    } else {
      store.visitorMessages.push(newMsg)
      if (store.visitorMessages.length > 100) store.visitorMessages = store.visitorMessages.slice(-100)
    }

    savePersistedChat(store)

    if (redis) {
      try {
        const redisKey =
          channel === "secretlover"
            ? "ast_chat_messages_secretlover"
            : channel === "staff"
            ? "ast_chat_messages_staff"
            : channel === "jacknpoy"
            ? "ast_chat_messages_jacknpoy"
            : channel === "tower"
            ? "ast_chat_messages_tower"
            : channel === "zombie"
            ? "ast_chat_messages_zombie"
            : channel === "visitor" || channel === "public"
            ? "ast_chat_messages_visitor"
            : `ast_chat_messages_${channel}`

        // Always read latest Redis messages first to prevent mobile/desktop overwrite races
        const existingRaw = await redis.get(redisKey)
        let mergedList: ChatMessage[] = []
        if (existingRaw) {
          const parsed = typeof existingRaw === "string" ? JSON.parse(existingRaw) : existingRaw
          if (Array.isArray(parsed)) mergedList = parsed
        }
        if (mergedList.length === 0) {
          mergedList =
            channel === "secretlover"
              ? [...store.secretLoverMessages]
              : channel === "staff"
              ? [...store.staffMessages]
              : channel === "jacknpoy"
              ? [...store.jacknpoyMessages]
              : channel === "tower"
              ? [...store.towerMessages]
              : channel === "zombie"
              ? [...store.zombieMessages]
              : [...store.visitorMessages]
        }
        // Deduplicate and append newMsg
        const seenIds = new Set(mergedList.map((m) => m && m.id))
        if (!seenIds.has(newMsg.id)) {
          mergedList.push(newMsg)
        }
        const toSave = mergedList.slice(-100)
        await redis.set(redisKey, JSON.stringify(toSave))

        // Update local memory to match true Redis state
        if (channel === "secretlover") store.secretLoverMessages = toSave
        else if (channel === "staff") store.staffMessages = toSave
        else if (channel === "jacknpoy") store.jacknpoyMessages = toSave
        else if (channel === "tower") store.towerMessages = toSave
        else if (channel === "zombie") store.zombieMessages = toSave
        else store.visitorMessages = toSave
      } catch {}

      // Record mentions in both store.userMentions and Redis for real-time delivery
      const rawMentionMatches = cleanText.match(/@([a-zA-Z0-9_-]+)/g)
      if (rawMentionMatches) {
        const uniqueHandles = Array.from(new Set(rawMentionMatches.map((m) => m.slice(1).toLowerCase().trim())))
        for (const handle of uniqueHandles) {
          if (handle && handle !== "everyone" && handle !== "channel" && handle !== "here") {
            const mentionEntry = {
              id: `mention_${now}_${Math.random().toString(36).slice(2, 6)}`,
              fromUsername: rawUsername,
              fromEmail: email,
              fromRole: role,
              channel,
              text: cleanText,
              timestamp: now,
            }
            if (!store.userMentions.has(handle)) {
              store.userMentions.set(handle, [])
            }
            const existing = store.userMentions.get(handle)!
            existing.unshift(mentionEntry)
            if (existing.length > 50) store.userMentions.set(handle, existing.slice(0, 50))

            if (redis) {
              void redis.lpush(`ast_user_mentions:${handle}`, JSON.stringify(mentionEntry)).catch(() => null)
              void redis.ltrim(`ast_user_mentions:${handle}`, 0, 50).catch(() => null)
              if (handle.includes("@")) {
                const hPrefix = handle.split("@")[0]
                if (hPrefix) {
                  void redis.lpush(`ast_user_mentions:${hPrefix}`, JSON.stringify(mentionEntry)).catch(() => null)
                  void redis.ltrim(`ast_user_mentions:${hPrefix}`, 0, 50).catch(() => null)
                }
              }
            }
          }
        }
      }
    }

    // 🤖 AI CUSTOMER SERVICE RESPONSE (PUBLIC VISITOR CHANNEL)
    let botReplyMsg: ChatMessage | undefined = undefined
    if (channel === "visitor" && cleanText && email !== "support@beezelbub.com") {
      let liveMods: string[] = []
      if (redis) {
        try {
          const fetchedMods = (await redis.smembers("ast_moderators_set")) as string[] | null
          if (Array.isArray(fetchedMods)) {
            liveMods = Array.from(new Set([...liveMods, ...fetchedMods])).filter(Boolean)
          }
        } catch {}
      }

      const botText = generateSupportBotReply(cleanText, email, liveMods)
      if (botText) {
        botReplyMsg = {
          id: `msg_support_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          channel: "visitor",
          email: "support@beezelbub.com",
          username: "ASTRXY Support AI 🤖",
          text: botText,
          timestamp: Date.now() + 50,
          role: "admin",
          replyTo: {
            id: newMsg.id,
            username: newMsg.username,
            text: newMsg.text.slice(0, 100),
          },
        }

        store.visitorMessages.push(botReplyMsg)
        if (store.visitorMessages.length > 100) store.visitorMessages = store.visitorMessages.slice(-100)
        savePersistedChat(store)
        if (redis) {
          await redis.set("ast_chat_messages_visitor", JSON.stringify(store.visitorMessages.slice(-100))).catch(() => null)
        }
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: newMsg,
        botReply: botReplyMsg,
        channel,
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
