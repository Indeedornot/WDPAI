import { Component } from '../core/Component'
import { Health } from './Health'

export type PreventDeathOptions = {
  /** Minimum HP to clamp to (defaults to 1). */
  minHp?: number
}

export class PreventDeath extends Component {
  minHp: number

  constructor(options: PreventDeathOptions = {}) {
    super()
    this.minHp = options.minHp ?? 1
  }

  update(_dt: number): void {
    const go = this.gameObject
    if (!go) return

    const h = go.getComponent(Health)
    if (!h) return

    if (h.current < this.minHp) h.current = this.minHp
  }
}
