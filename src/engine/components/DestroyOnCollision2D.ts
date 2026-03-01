import { Component } from '../core/Component'
import type { Collision2D } from '../physics/Collision2D'

export type DestroyOnCollision2DOptions = {
  otherTag?: string
}

export class DestroyOnCollision2D extends Component {
  otherTag: string

  constructor(options: DestroyOnCollision2DOptions = {}) {
    super()
    this.otherTag = options.otherTag ?? ''
  }

  onCollisionEnter2D(collision: Collision2D): void {
    const go = this.gameObject
    const otherGo = collision.other.gameObject
    if (!go || !otherGo) return

    if (this.otherTag && otherGo.tag !== this.otherTag) return

    go.destroy()
  }
}
