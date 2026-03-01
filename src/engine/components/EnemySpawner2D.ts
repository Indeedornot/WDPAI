import { Component } from '../core/Component'
import type { GameObject } from '../core/GameObject'
import { Vec2 } from '../math/Vec2'

export type EnemySpawner2DOptions = {
  enemyTag?: string
  playerTag?: string

  /** Seconds between spawns. */
  spawnEverySeconds?: number

  /** Hard cap on active enemies (by tag). */
  maxAlive?: number

  /** Spawn on a ring around the player. */
  spawnDistance?: number

  /** Random jitter (+/-) applied to spawnDistance. */
  spawnDistanceJitter?: number

  /** Callback used to create an enemy at a position. */
  factory: (spawnPosition: Vec2, spawnIndex: number) => GameObject
}

export class EnemySpawner2D extends Component {
  enemyTag: string
  playerTag: string
  spawnEverySeconds: number
  maxAlive: number
  spawnDistance: number
  spawnDistanceJitter: number
  factory: (spawnPosition: Vec2, spawnIndex: number) => GameObject

  private _elapsed = 0
  private _spawnIndex = 0

  constructor(options: EnemySpawner2DOptions) {
    super()
    this.enemyTag = options.enemyTag ?? 'Enemy'
    this.playerTag = options.playerTag ?? 'Player'
    this.spawnEverySeconds = options.spawnEverySeconds ?? 1.25
    this.maxAlive = options.maxAlive ?? 10
    this.spawnDistance = options.spawnDistance ?? 650
    this.spawnDistanceJitter = options.spawnDistanceJitter ?? 160
    this.factory = options.factory
  }

  update(dt: number): void {
    const scene = this.scene
    if (!scene) return

    this._elapsed += dt
    if (this.spawnEverySeconds <= 0) return

    // Catch-up loop so spawning is stable even if a frame hitches.
    while (this._elapsed >= this.spawnEverySeconds) {
      this._elapsed -= this.spawnEverySeconds

      const alive = this.countAliveEnemies()
      if (alive >= this.maxAlive) break

      const playerPos = this.getPlayerPosition()
      if (!playerPos) break

      const spawnPos = this.computeSpawnPosition(playerPos)
      const enemy = this.factory(spawnPos, this._spawnIndex++)
      scene.add(enemy)
    }
  }

  private countAliveEnemies(): number {
    const scene = this.scene
    if (!scene) return 0

    let count = 0
    for (const o of scene.getGameObjects()) {
      if (!o.active) continue
      if (o.tag !== this.enemyTag) continue
      count++
    }
    return count
  }

  private getPlayerPosition(): Vec2 | null {
    const scene = this.scene
    if (!scene) return null

    for (const o of scene.getGameObjects()) {
      if (!o.active) continue
      if (o.tag !== this.playerTag) continue
      return o.transform.position
    }

    return null
  }

  private computeSpawnPosition(playerPos: Vec2): Vec2 {
    const angle = Math.random() * Math.PI * 2
    const jitter = (Math.random() * 2 - 1) * this.spawnDistanceJitter
    const dist = Math.max(0, this.spawnDistance + jitter)

    const x = playerPos.x + Math.cos(angle) * dist
    const y = playerPos.y + Math.sin(angle) * dist

    return new Vec2(x, y)
  }
}
