import type { AppSettings } from './AppSettings'
import { DefaultSettings } from './AppSettings'

const STORAGE_KEY = 'my-ts-app:settings:v1'

export class SettingsRepository {
  load(): AppSettings {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) return { ...DefaultSettings }
      const parsed = JSON.parse(raw) as Partial<AppSettings>
      return {
        accessibleMode: Boolean(parsed.accessibleMode),
      }
    } catch {
      return { ...DefaultSettings }
    }
  }

  save(settings: AppSettings): void {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  }
}
