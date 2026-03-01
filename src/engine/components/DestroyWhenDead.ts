import { Component } from '../core/Component'
import { Health } from './Health'

export class DestroyWhenDead extends Component {
  update(_dt: number): void {
    const go = this.gameObject
    if (!go) return

    const health = go.getComponent(Health)
    if (!health) return

    if (health.isDead) go.destroy()
  }
}
