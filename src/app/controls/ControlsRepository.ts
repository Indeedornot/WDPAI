import type { KeyValueStorage } from '../storage/KeyValueStorage'
import { DEFAULT_CONTROLS, parseControlsConfig, type ControlsConfig } from './ControlsConfig'

export class ControlsRepository {
  readonly storage: KeyValueStorage
  readonly key: string

  constructor(storage: KeyValueStorage, key = 'my-ts-app:controls:v1') {
    this.storage = storage
    this.key = key
  }

  load(): ControlsConfig {
    try {
      const raw = this.storage.getItem(this.key)
      if (!raw) return structuredClone(DEFAULT_CONTROLS)
      return parseControlsConfig(JSON.parse(raw) as unknown)
    } catch {
      return structuredClone(DEFAULT_CONTROLS)
    }
  }

  save(config: ControlsConfig): void {
    this.storage.setItem(this.key, JSON.stringify(config))
  }

  reset(): ControlsConfig {
    const cfg = structuredClone(DEFAULT_CONTROLS)
    this.save(cfg)
    return cfg
  }
}
