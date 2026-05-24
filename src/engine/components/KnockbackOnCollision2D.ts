import { Component } from '../core/Component';
import type { Collision2D } from '../physics/Collision2D';
import { Vec2 } from '../math/Vec2';
import { Mover2D } from './Mover2D';

export type KnockbackDirectionMode = 'awayFromOther' | 'alongSelfVelocity';

export type KnockbackOnCollision2DOptions = {
  otherTag?: string;
  force?: number;
  directionMode?: KnockbackDirectionMode;

  applyToSelf?: boolean;
  applyToOther?: boolean;
  otherForceMultiplier?: number;
};

export class KnockbackOnCollision2D extends Component 
{
  otherTag: string;
  force: number;
  directionMode: KnockbackDirectionMode;

  applyToSelf: boolean;
  applyToOther: boolean;
  otherForceMultiplier: number;

  constructor(options: KnockbackOnCollision2DOptions = {}) 
  {
    super();
    this.otherTag = options.otherTag ?? '';
    this.force = options.force ?? 350;
    this.directionMode = options.directionMode ?? 'awayFromOther';

    this.applyToSelf = options.applyToSelf ?? true;
    this.applyToOther = options.applyToOther ?? false;
    this.otherForceMultiplier = options.otherForceMultiplier ?? 1;
  }

  onCollisionEnter2D(collision: Collision2D): void 
  {
    const go = this.gameObject;
    const otherGo = collision.other.gameObject;
    if (!go || !otherGo) 
    {
      return;
    }

    if (this.otherTag && otherGo.tag !== this.otherTag) 
    {
      return;
    }

    const dir = this.computeDirection(go.transform.position, otherGo.transform.position);
    if (dir.length() <= 1e-6) 
    {
      return;
    }

    if (this.applyToSelf) 
    {
      const selfMover = go.getComponent(Mover2D);
      if (selfMover) 
      {
        selfMover.impulse.add(dir.scaled(this.force));
      }
    }

    if (this.applyToOther) 
    {
      const otherMover = otherGo.getComponent(Mover2D);
      // For the default "awayFromOther" direction, applying the opposite direction to the
      // other object pushes both objects away from each other.
      // For "alongSelfVelocity" we typically want to push the other *along* self's travel
      // direction (e.g. projectiles knocking enemies back).
      const sign = this.directionMode === 'alongSelfVelocity' ? 1 : -1;
      if (otherMover)
      {
        otherMover.impulse.add(dir.scaled(sign * this.force * this.otherForceMultiplier));
      }
    }
  }

  private computeDirection(selfPos: Vec2, otherPos: Vec2): Vec2 
  {
    if (this.directionMode === 'alongSelfVelocity') 
    {
      const go = this.gameObject;
      const mover = go?.getComponent(Mover2D);
      if (mover && mover.velocity.length() > 1e-6) 
      {
        return mover.velocity.clone().normalize();
      }
    }

    // Default: push away from the other object.
    return Vec2.sub(selfPos, otherPos).normalize();
  }
}
