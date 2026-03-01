import { Component } from '../core/Component'
import type { Camera2D } from './Camera2D'

export type DebugGridRenderer2DOptions = {
  step?: number
  color?: string
  axisColor?: string
  axisWidth?: number
  lineWidth?: number
  extent?: number
}

export class DebugGridRenderer2D extends Component {
  step: number
  color: string
  axisColor: string
  axisWidth: number
  lineWidth: number
  extent: number

  constructor(options: DebugGridRenderer2DOptions = {}) {
    super()
    this.step = options.step ?? 50
    this.color = options.color ?? 'rgba(255,255,255,0.07)'
    this.axisColor = options.axisColor ?? 'rgba(255,255,255,0.35)'
    this.axisWidth = options.axisWidth ?? 2
    this.lineWidth = options.lineWidth ?? 1
    this.extent = options.extent ?? 2000
  }

  override render(ctx: CanvasRenderingContext2D, camera: Camera2D): void {
    // Grid is centered around camera, rendered in screen space.
    const origin = camera.worldToScreen(camera.position)

    ctx.save()
    ctx.translate(origin.x, origin.y)

    ctx.strokeStyle = this.color
    ctx.lineWidth = this.lineWidth

    const step = this.step * camera.zoom
    if (step <= 2) {
      ctx.restore()
      return
    }

    const extent = this.extent * camera.zoom
    const lines = Math.ceil(extent / step)

    ctx.beginPath()
    for (let i = -lines; i <= lines; i++) {
      const x = i * step
      ctx.moveTo(x, -extent)
      ctx.lineTo(x, extent)

      const y = i * step
      ctx.moveTo(-extent, y)
      ctx.lineTo(extent, y)
    }
    ctx.stroke()

    // Axes
    ctx.strokeStyle = this.axisColor
    ctx.lineWidth = this.axisWidth

    ctx.beginPath()
    ctx.moveTo(-extent, 0)
    ctx.lineTo(extent, 0)
    ctx.moveTo(0, -extent)
    ctx.lineTo(0, extent)
    ctx.stroke()

    ctx.restore()
  }
}
