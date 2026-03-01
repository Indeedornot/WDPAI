import { Component } from '../core/Component'
import { Health } from './Health'
import { RunStats } from './RunStats'

export type CountKillToPlayerStatsOnDeath2DOptions = {
  playerTag?: string
}

export class CountKillToPlayerStatsOnDeath2D extends Component {
  playerTag: string

  private _done = false

  constructor(options: CountKillToPlayerStatsOnDeath2DOptions = {}) {
    super()
    this.playerTag = options.playerTag ?? 'Player'
  }

  update(_dt: number): void {
    if (this._done) return

    const go = this.gameObject
    const scene = this.scene
    if (!go || !scene) return

    const health = go.getComponent(Health)
    if (!health || !health.isDead) return

    const player = scene.getGameObjects().find((o) => o.active && o.tag === this.playerTag) ?? null
    if (!player) {
      this._done = true
      return
    }

    const stats = player.getComponent(RunStats)
    if (stats) stats.kills += 1

    this._done = true
  }
}
