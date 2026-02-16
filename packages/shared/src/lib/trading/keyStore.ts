const KEYS_STORAGE_KEY = 'concentric-trading-keys'

export interface StoredKeys {
  apiKey: string
  apiSecret: string
}

export function getStoredKeys(): StoredKeys | null {
  try {
    const raw = localStorage.getItem(KEYS_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed.apiKey && parsed.apiSecret) return parsed
    return null
  } catch {
    return null
  }
}

export function saveKeys(keys: StoredKeys): void {
  localStorage.setItem(KEYS_STORAGE_KEY, JSON.stringify(keys))
}

export function clearKeys(): void {
  localStorage.removeItem(KEYS_STORAGE_KEY)
}
