import { Component } from '../core/Component'
import type { GameObject } from '../core/GameObject'
import { Health } from './Health'

export type DropPowerupOnDeath2DOptions = {
  chance?: number
  factory?: (x: number, y: number) => GameObject
}

export class DropPowerupOnDeath2D extends Component {
  chance: number
  factory: ((x: number, y: number) => GameObject) | null

  private _done = false

  constructor(options: DropPowerupOnDeath2DOptions) {
    super()
    this.chance = options.chance ?? 0.25
    this.factory = options.factory ?? null
  }

  update(_dt: number): void {
    if (this._done) return

    const go = this.gameObject
    const scene = this.scene
    if (!go || !scene) return

    const health = go.getComponent(Health)
    if (!health || !health.isDead) return

    this._done = true

    if (Math.random() > this.chance) return

    if (!this.factory) return

    const pos = go.transform.position
    scene.add(this.factory(pos.x, pos.y))
  }
}
