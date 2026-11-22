
export type MailboxRecord = { email: string; secretKey: string; claimedAt: string }
export type StoredMessage = Record<string, unknown>

const memory = globalThis as typeof globalThis & { __astrxyStore?: Map<string, unknown> }
memory.__astrxyStore ??= new Map<string, unknown>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function redisClient(): any { return null } // Upstash removed: memory only

async function get<T>(key: string): Promise<T | null> {
  const redis = redisClient()
  if (redis) {
    try { return await redis.get<T>(key) } catch { /* fall through for local resilience */ }
  }
  return (memory.__astrxyStore?.get(key) as T | undefined) ?? null
}

async function set<T>(key: string, value: T) {
  const redis = redisClient()
  if (redis) {
    try { await redis.set(key, value); return } catch { /* use fallback */ }
  }
  memory.__astrxyStore?.set(key, value)
}

export async function getMailbox(email: string) { return get<MailboxRecord>(`astrxy:mailbox:${email.toLowerCase()}`) }
export async function getClaimedEmails() {
  const index = (await get<Record<string, string>>("astrxy:mailbox-key-index")) ?? {}
  return Array.from(new Set(Object.values(index).map(email => email.toLowerCase().trim()).filter(Boolean)))
}
export async function getActiveSecretKeys() {
  const index = (await get<Record<string, string>>("astrxy:mailbox-key-index")) ?? {}
  return Object.keys(index).filter(Boolean)
}
export async function getMailboxByKey(secretKey: string) {
  const index = await get<Record<string, string>>("astrxy:mailbox-key-index")
  const email = index?.[secretKey.toLowerCase()]
  return email ? getMailbox(email) : null
}
export async function deleteMailbox(email: string) {
  const normalized = email.toLowerCase().trim()
  const record = await getMailbox(normalized)
  const index = (await get<Record<string, string>>("astrxy:mailbox-key-index")) ?? {}
  if (record) for (const [key, value] of Object.entries(index)) if (value.toLowerCase() === normalized) delete index[key]
  await set("astrxy:mailbox-key-index", index)
  const redis = redisClient()
  if (redis) { try { await redis.del(`astrxy:mailbox:${normalized}`); return } catch {} }
  memory.__astrxyStore?.delete(`astrxy:mailbox:${normalized}`)
}

export async function deleteMessages(email: string) {
  const key = inboxKey(email)
  const redis = redisClient()
  if (redis) { try { await redis.del(key); return } catch {} }
  memory.__astrxyStore?.delete(key)
}

export async function saveMailbox(record: MailboxRecord) {
  const index = (await get<Record<string, string>>("astrxy:mailbox-key-index")) ?? {}
  index[record.secretKey.toLowerCase()] = record.email
  await set("astrxy:mailbox-key-index", index)
  await set(`astrxy:mailbox:${record.email.toLowerCase()}`, record)
}
const inboxKey = (email: string) => `inbox:${email.toLowerCase().trim()}`

export async function getMessages(email: string) {
  const key = inboxKey(email)
  const redis = redisClient()
  if (redis) {
    try {
      const raw = await redis.lrange<StoredMessage | string>(key, 0, 50)
      return (raw || []).map(item => {
        if (typeof item !== "string") return item
        try { return JSON.parse(item) as StoredMessage } catch { return null }
      }).filter((item): item is StoredMessage => Boolean(item && typeof item === "object"))
    } catch { /* fall through to legacy/local storage */ }
  }
  return (await get<StoredMessage[]>(key)) ?? (await get<StoredMessage[]>(`astrxy:messages:${email.toLowerCase()}`)) ?? []
}

export async function deleteMessage(email: string, id: string) {
  const messages = await getMessages(email)
  await saveMessages(email, messages.filter(message => String(message.id) !== id))
}

export async function saveMessages(email: string, messages: StoredMessage[]) {
  const key = inboxKey(email)
  const deduplicated = messages.filter((message, index, all) => {
    const fingerprint = String(message.id || `${message.subject ?? ""}_${message.date ?? ""}_${String(message.body ?? message.text ?? "").slice(0, 30)}`)
    return all.findIndex(candidate => String(candidate.id || `${candidate.subject ?? ""}_${candidate.date ?? ""}_${String(candidate.body ?? candidate.text ?? "").slice(0, 30)}`) === fingerprint) === index
  }).slice(0, 100)
  const redis = redisClient()
  if (redis) {
    try {
      await redis.del(key)
      if (deduplicated.length) await redis.rpush(key, ...deduplicated.map(message => JSON.stringify(message)))
      await redis.expire(key, 604800)
      return
    } catch { /* fall through to local storage */ }
  }
  await set(key, deduplicated)
}
export type BlocklistEntry = { emails: string[]; ipSignatures: string[] }

export async function getBlocklist(): Promise<BlocklistEntry> {
  return (await get<BlocklistEntry>("astrxy:blocklist")) ?? { emails: [], ipSignatures: [] }
}

export async function getAdminState<T>(key: string, fallback: T): Promise<T> { return (await get<T>(`astrxy:admin:${key}`)) ?? fallback }
export async function saveAdminState<T>(key: string, value: T) { await set(`astrxy:admin:${key}`, value) }

export async function saveBlocklist(value: BlocklistEntry) {
  await set("astrxy:blocklist", { emails: Array.from(new Set(value.emails.map(item => item.toLowerCase().trim()).filter(Boolean))), ipSignatures: Array.from(new Set(value.ipSignatures.map(item => item.trim()).filter(Boolean))) })
}

export async function isBlocked(values: { emails?: string[]; ipSignatures?: string[] }) {
  const blocklist = await getBlocklist()
  const emails = (values.emails ?? []).map(item => item.toLowerCase().trim())
  const ips = (values.ipSignatures ?? []).map(item => item.trim())
  return emails.some(item => blocklist.emails.includes(item)) || ips.some(item => blocklist.ipSignatures.includes(item))
}

export async function saveVipSession(token: string, value: Record<string, unknown>, ttlSeconds?: number) {
  const redis = redisClient()
  if (redis && ttlSeconds) { try { await redis.set(`astrxy:vip-session:${token}`, value, { ex: ttlSeconds }); return } catch {} }
  await set(`astrxy:vip-session:${token}`, value)
}
