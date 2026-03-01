export interface KeyValueStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export class LocalStorageAdapter implements KeyValueStorage {
  getItem(key: string): string | null {
    return window.localStorage.getItem(key)
  }

  setItem(key: string, value: string): void {
    window.localStorage.setItem(key, value)
  }

  removeItem(key: string): void {
    window.localStorage.removeItem(key)
  }
}
