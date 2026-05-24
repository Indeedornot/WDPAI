import { Component } from '../core/Component';
import { Mover2D } from './Mover2D';

export type LifetimeExpireMode = 'destroy' | 'freeze';

export type LifetimeOptions = {
  seconds?: number;
  expireMode?: LifetimeExpireMode;
};

export class Lifetime extends Component 
{
  secondsRemaining: number;
  expireMode: LifetimeExpireMode;

  constructor(options: LifetimeOptions = {}) 
  {
    super();
    this.secondsRemaining = options.seconds ?? 2;
    this.expireMode = options.expireMode ?? 'destroy';
  }

  update(dt: number): void 
  {
    const go = this.gameObject;
    if (!go) 
    {
      return;
    }

    this.secondsRemaining -= dt;
    if (this.secondsRemaining > 0) 
    {
      return;
    }

    if (this.expireMode === 'destroy') 
    {
      go.destroy();
      return;
    }

    // Freeze in place.
    const mover = go.getComponent(Mover2D);
    if (mover) 
    {
      mover.velocity.set(0, 0);
      mover.impulse.set(0, 0);
    }

    // Note: keep collider + collision behaviors enabled so enemies can still run into it.
    // (This allows the projectile to be destroyed on collision and optionally still deal damage.)
    // If you ever want purely decorative frozen objects, disable their colliders explicitly.

    this.enabled = false;
  }
}
