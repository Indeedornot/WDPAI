import type { GameObject } from './GameObject';
import type { Scene } from './Scene';
import type { Camera2D } from '../render/Camera2D';
import type { Collision2D } from '../physics/Collision2D';

export abstract class Component {
  gameObject: GameObject | null = null;
  enabled = true;

  private _started = false;

  get scene(): Scene | null {
    return this.gameObject?.scene ?? null;
  }

  /** Called when the component becomes part of a Scene (not in constructor). */
  onAdded(_scene: Scene): void {}

  /** Called when the component is removed from its Scene. */
  onRemoved(_scene: Scene): void {}

  /** Called once, before the first Update/UpdatePhysics after being added. */
  start(): void {}

  update(_dt: number): void {}

  fixedUpdate(_dt: number): void {}

  render(_ctx: CanvasRenderingContext2D, _camera: Camera2D): void {}

  onCollisionEnter2D(_collision: Collision2D): void {}

  onCollisionStay2D(_collision: Collision2D): void {}

  onCollisionExit2D(_collision: Collision2D): void {}

  /** @internal */
  __internalOnAdded(scene: Scene): void {
    this.onAdded(scene);
  }

  /** @internal */
  __internalOnRemoved(scene: Scene): void {
    this.onRemoved(scene);
  }

  /** @internal */
  __internalTryStart(): void {
    if (this._started) return;
    this._started = true;
    this.start();
  }
}
