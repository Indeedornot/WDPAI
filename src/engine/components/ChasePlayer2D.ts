import { Component } from '../core/Component';
import type { GameObject } from '../core/GameObject';
import { Mover2D } from './Mover2D';

export type ChasePlayer2DOptions = {
  /** Units: world units / second */
  speed?: number;
  targetTag?: string;
  /** Stop chasing when within this distance. */
  stopDistance?: number;
  /** How often (seconds) to re-scan the scene for the target. */
  reacquireSeconds?: number;
};

export class ChasePlayer2D extends Component 
{
  speed: number;
  targetTag: string;
  stopDistance: number;
  reacquireSeconds: number;

  private _target: GameObject | null = null;
  private _reacquireTimer = 0;

  constructor(options: ChasePlayer2DOptions = {}) 
  {
    super();
    this.speed = options.speed ?? 160;
    this.targetTag = options.targetTag ?? 'Player';
    this.stopDistance = options.stopDistance ?? 18;
    this.reacquireSeconds = options.reacquireSeconds ?? 0.25;
  }

  update(dt: number): void 
  {
    const go = this.gameObject;
    const scene = this.scene;
    if (!go || !scene) 
    {
      return;
    }

    const mover = go.getComponent(Mover2D);
    if (!mover) 
    {
      return;
    }

    const target = this.getTarget(dt);
    if (!target) 
    {
      mover.velocity.set(0, 0);
      return;
    }

    const selfPos = go.transform.position;
    const targetPos = target.transform.position;

    const dx = targetPos.x - selfPos.x;
    const dy = targetPos.y - selfPos.y;

    const distSq = dx * dx + dy * dy;
    const stopDistSq = this.stopDistance * this.stopDistance;
    if (distSq <= stopDistSq) 
    {
      mover.velocity.set(0, 0);
      return;
    }

    const dist = Math.sqrt(distSq);
    if (dist <= 1e-6) 
    {
      mover.velocity.set(0, 0);
      return;
    }

    const inv = 1 / dist;
    mover.velocity.set(dx * inv * this.speed, dy * inv * this.speed);
  }

  private getTarget(dt: number): GameObject | null 
  {
    const scene = this.scene;
    if (!scene) 
    {
      return null;
    }

    if (
      this._target &&
      this._target.scene === scene &&
      this._target.active &&
      this._target.tag === this.targetTag
    ) 
    {
      return this._target;
    }

    this._reacquireTimer -= dt;
    if (this._reacquireTimer > 0) 
    {
      return this._target;
    }

    this._reacquireTimer = this.reacquireSeconds;

    const objects = scene.getGameObjects();
    for (const o of objects) 
    {
      if (!o.active) 
      {
        continue;
      }
      if (o.tag !== this.targetTag) 
      {
        continue;
      }
      this._target = o;
      return o;
    }

    this._target = null;
    return null;
  }
}
