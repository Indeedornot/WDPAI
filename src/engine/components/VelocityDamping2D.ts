import { Component } from '../core/Component';
import { Mover2D } from './Mover2D';

export type VelocityDamping2DOptions = {
  /** Higher values damp faster. Units: 1/seconds. */
  damping?: number;
  minSpeed?: number;
};

export class VelocityDamping2D extends Component {
  damping: number;
  minSpeed: number;

  constructor(options: VelocityDamping2DOptions = {}) {
    super();
    this.damping = options.damping ?? 8;
    this.minSpeed = options.minSpeed ?? 1;
  }

  fixedUpdate(dt: number): void {
    const go = this.gameObject;
    if (!go) return;

    const mover = go.getComponent(Mover2D);
    if (!mover) return;

    // Exponential-ish decay approximation.
    const factor = Math.max(0, 1 - this.damping * dt);
    mover.impulse.scale(factor);

    if (mover.impulse.length() < this.minSpeed) mover.impulse.set(0, 0);
  }
}
