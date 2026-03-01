import type { GameObject } from './GameObject'
import type { Scene } from './Scene'
import type { Camera2D } from '../render/Camera2D'
import type { Collision2D } from '../physics/Collision2D'

export abstract class Component {
  gameObject: GameObject | null = null
  enabled = true

  private _started = false

  get scene(): Scene | null {
    return this.gameObject?.scene ?? null
  }

  /** Called when the component becomes part of a Scene (not in constructor). */
  onAdded(_scene: Scene): void {}

  /** Unity-style alias for `onAdded`. Prefer overriding either, not both. */
  OnAdded(scene: Scene): void {
    this.onAdded(scene)
  }

  /** Called when the component is removed from its Scene. */
  onRemoved(_scene: Scene): void {}

  /** Unity-style alias for `onRemoved`. Prefer overriding either, not both. */
  OnRemoved(scene: Scene): void {
    this.onRemoved(scene)
  }

  /** Called once, before the first Update/UpdatePhysics after being added. */
  start(): void {}

  /** Unity-style alias for `start`. Prefer overriding either, not both. */
  Start(): void {
    this.start()
  }

  update(_dt: number): void {}

  /** Unity-style alias for `update`. Prefer overriding either, not both. */
  Update(dt: number): void {
    this.update(dt)
  }

  fixedUpdate(_dt: number): void {}

  /** Unity-style alias for `fixedUpdate`. Prefer overriding either, not both. */
  UpdatePhysics(dt: number): void {
    this.fixedUpdate(dt)
  }

  render(_ctx: CanvasRenderingContext2D, _camera: Camera2D): void {}

  /** Unity-style alias for `render`. Prefer overriding either, not both. */
  Render(ctx: CanvasRenderingContext2D, camera: Camera2D): void {
    this.render(ctx, camera)
  }

  onCollisionEnter2D(_collision: Collision2D): void {}
  OnCollisionEnter2D(collision: Collision2D): void {
    this.onCollisionEnter2D(collision)
  }

  onCollisionStay2D(_collision: Collision2D): void {}
  OnCollisionStay2D(collision: Collision2D): void {
    this.onCollisionStay2D(collision)
  }

  onCollisionExit2D(_collision: Collision2D): void {}
  OnCollisionExit2D(collision: Collision2D): void {
    this.onCollisionExit2D(collision)
  }

  /** @internal */
  __internalOnAdded(scene: Scene): void {
    this.OnAdded(scene)
  }

  /** @internal */
  __internalOnRemoved(scene: Scene): void {
    this.OnRemoved(scene)
  }

  /** @internal */
  __internalTryStart(): void {
    if (this._started) return
    this._started = true
    this.Start()
  }
}
