import { Component } from '../core/Component'

export type Spin2DOptions = {
  radiansPerSecond?: number
}

export class Spin2D extends Component {
  radiansPerSecond: number

  constructor(options: Spin2DOptions = {}) {
    super()
    this.radiansPerSecond = options.radiansPerSecond ?? Math.PI
  }

  update(dt: number): void {
    const go = this.gameObject
    if (!go) return
    go.transform.rotation += this.radiansPerSecond * dt
  }
}
