import type { Scene } from '../../engine'
import { SceneSerializer } from './SceneSerializer'
import type { SaveStorage } from './SaveStorage'

export type SaveManagerOptions = {
  slot?: string
  autosaveMs?: number
}

export class SaveManager {
  readonly slot: string
  readonly autosaveMs: number

  readonly scene: Scene
  readonly storage: SaveStorage
  readonly serializer: SceneSerializer

  private _timer: number | null = null

  constructor(
    scene: Scene,
    storage: SaveStorage,
    serializer: SceneSerializer = new SceneSerializer(),
    options: SaveManagerOptions = {},
  ) {
    this.scene = scene
    this.storage = storage
    this.serializer = serializer
    this.slot = options.slot ?? 'my-ts-app:save:slot1'
    this.autosaveMs = options.autosaveMs ?? 60_000
  }

  startAutoSave(): void {
    if (this._timer != null) return

    this._timer = window.setInterval(() => {
      void this.saveNow()
    }, this.autosaveMs)
  }

  stopAutoSave(): void {
    if (this._timer == null) return
    window.clearInterval(this._timer)
    this._timer = null
  }

  async saveNow(): Promise<void> {
    const snapshot = this.serializer.serialize(this.scene)
    await this.storage.save(this.slot, JSON.stringify(snapshot))
  }

  async loadNow(): Promise<boolean> {
    const raw = await this.storage.load(this.slot)
    if (!raw) return false

    const parsed = JSON.parse(raw) as any
    if (!parsed || parsed.version !== 1) return false

    this.serializer.restore(this.scene, parsed)
    return true
  }
}
