import fs from "fs"
import path from "path"
import os from "os"

export interface StoredEmailMessage {
  id: string
  from: string
  sender: string
  senderName?: string
  to: string
  recipient: string
  subject: string
  body: string
  html?: string
  date: string
  time: string
  timestamp: number
  attachments?: unknown[]
  otpCode?: string
  verifyLink?: string
}

const MESSAGES_FILE = path.join(os.tmpdir(), "ast_inbox_messages_v2.json")

export const loadPersistedMessages = (): Map<string, StoredEmailMessage[]> => {
  const map = new Map<string, StoredEmailMessage[]>()
  try {
    if (fs.existsSync(MESSAGES_FILE)) {
      const content = fs.readFileSync(MESSAGES_FILE, "utf-8")
      const parsed = JSON.parse(content) as Record<string, StoredEmailMessage[]>
      if (parsed && typeof parsed === "object") {
        for (const [em, msgs] of Object.entries(parsed)) {
          if (Array.isArray(msgs)) {
            map.set(em.toLowerCase().trim(), msgs)
          }
        }
      }
    }
  } catch {}
  return map
}

export const savePersistedMessages = (map: Map<string, StoredEmailMessage[]>) => {
  try {
    const obj: Record<string, StoredEmailMessage[]> = {}
    for (const [em, msgs] of map.entries()) {
      obj[em] = msgs.slice(-50)
    }
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify(obj), "utf-8")
  } catch {}
}

const g = globalThis as unknown as {
  __ast_messages_store_map?: Map<string, StoredEmailMessage[]>
}

export const getMessagesStore = (): Map<string, StoredEmailMessage[]> => {
  if (!g.__ast_messages_store_map) {
    g.__ast_messages_store_map = loadPersistedMessages()
  }
  return g.__ast_messages_store_map
}

const key = (email: string) => String(email || "").toLowerCase().trim()

// Messages saved on disk (survive hot reloads / restarts of the same machine)
export const getDiskMessages = (email: string): StoredEmailMessage[] => {
  return loadPersistedMessages().get(key(email)) || []
}

export const saveDiskMessage = (email: string, message: StoredEmailMessage) => {
  const map = loadPersistedMessages()
  const k = key(email)
  const existing = map.get(k) || []
  map.set(k, [message, ...existing.filter((m) => m.id !== message.id)].slice(0, 50))
  savePersistedMessages(map)
}

// With an id: delete that one message. Without an id: delete all messages of the mailbox.
export const deleteDiskMessages = (email: string, id?: string) => {
  const map = loadPersistedMessages()
  const k = key(email)
  if (id) {
    map.set(k, (map.get(k) || []).filter((m) => m.id !== id))
  } else {
    map.delete(k)
  }
  savePersistedMessages(map)
}
