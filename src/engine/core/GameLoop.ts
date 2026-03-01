import type { Scene } from './Scene'

export type GameLoopOptions = {
  fixedDeltaSeconds?: number
  maxFixedStepsPerFrame?: number
  clearColor?: string
}

export class GameLoop {
  readonly fixedDeltaSeconds: number
  readonly maxFixedStepsPerFrame: number
  readonly clearColor: string

  readonly canvas: HTMLCanvasElement
  readonly ctx: CanvasRenderingContext2D
  readonly scene: Scene

  private _running = false
  private _paused = false
  private _lastTimeMs: number | null = null
  private _accumulator = 0
  private _rafId: number | null = null

  constructor(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    scene: Scene,
    options: GameLoopOptions = {},
  ) {
    this.canvas = canvas
    this.ctx = ctx
    this.scene = scene

    this.fixedDeltaSeconds = options.fixedDeltaSeconds ?? 1 / 60
    this.maxFixedStepsPerFrame = options.maxFixedStepsPerFrame ?? 5
    this.clearColor = options.clearColor ?? '#0b1020'

    window.addEventListener('resize', this.handleResize)
    this.handleResize()
  }

  start(): void {
    if (this._running) return
    this._running = true
    this._paused = false
    this._lastTimeMs = null
    this._accumulator = 0

    const tick = (nowMs: number) => {
      if (!this._running) return

      if (this._lastTimeMs == null) this._lastTimeMs = nowMs
      const dt = Math.min(0.25, (nowMs - this._lastTimeMs) / 1000)
      this._lastTimeMs = nowMs

      this.scene.flushQueues()

      if (!this._paused) {
        // Fixed-step simulation first (physics)
        this._accumulator += dt
        let steps = 0
        while (this._accumulator >= this.fixedDeltaSeconds && steps < this.maxFixedStepsPerFrame) {
          this.scene.fixedUpdate(this.fixedDeltaSeconds)
          this._accumulator -= this.fixedDeltaSeconds
          steps++
        }

        // Variable-step update
        this.scene.update(dt)
      }

      // Render
      this.ctx.setTransform(1, 0, 0, 1, 0, 0)
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
      this.ctx.fillStyle = this.clearColor
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

      this.scene.render(this.ctx)

      // Clear edge-triggered input after the frame has consumed it.
      this.scene.input.beginFrame()

      this._rafId = requestAnimationFrame(tick)
    }

    this._rafId = requestAnimationFrame(tick)
  }

  stop(): void {
    if (!this._running) return
    this._running = false
    if (this._rafId != null) cancelAnimationFrame(this._rafId)
    this._rafId = null
  }

  get paused(): boolean {
    return this._paused
  }

  setPaused(paused: boolean): void {
    this._paused = paused
    if (paused) {
      // Avoid huge catch-up step when resuming.
      this._accumulator = 0
    }
  }

  pause(): void {
    this.setPaused(true)
  }

  resume(): void {
    this.setPaused(false)
  }

  togglePause(): void {
    this.setPaused(!this._paused)
  }

  dispose(): void {
    this.stop()
    window.removeEventListener('resize', this.handleResize)
  }

  private handleResize = (): void => {
    const dpr = window.devicePixelRatio || 1
    const { width, height } = this.canvas.getBoundingClientRect()

    const displayWidth = Math.max(1, Math.floor(width * dpr))
    const displayHeight = Math.max(1, Math.floor(height * dpr))

    if (this.canvas.width !== displayWidth) this.canvas.width = displayWidth
    if (this.canvas.height !== displayHeight) this.canvas.height = displayHeight

    // Default render space is pixel-based; keep ctx coordinates in pixels.
    this.ctx.setTransform(1, 0, 0, 1, 0, 0)
  }
}
