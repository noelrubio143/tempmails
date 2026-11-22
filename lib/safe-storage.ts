const memoryStore = new Map<string, string>()

export const safeStorage = {
  getItem(key: string): string | null {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const value = window.localStorage.getItem(key)
        if (value !== null) return value
      }
    } catch {
      // Browser privacy protections can deny storage access.
    }
    return memoryStore.get(key) ?? null
  },
  setItem(key: string, value: string): void {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(key, value)
        memoryStore.set(key, value)
        return
      }
    } catch {
      // Fall back to the process-local store.
    }
    memoryStore.set(key, value)
  },
  removeItem(key: string): void {
    try {
      if (typeof window !== "undefined" && window.localStorage) window.localStorage.removeItem(key)
    } catch {
      // Browser privacy protections can deny storage access.
    }
    memoryStore.delete(key)
  },
}

export default safeStorage
