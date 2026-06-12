import { Component } from '../core/Component';
import type { GameObject } from '../core/GameObject';
import { Health } from './Health';

export type EnemyDeathEffectCallback = (gameObject: GameObject) => void;

export class EnemyDeathEffect extends Component
{
  private _wasAlive = true;
  private onDeath?: EnemyDeathEffectCallback;

  constructor(onDeath?: EnemyDeathEffectCallback)
  {
    super();
    this.onDeath = onDeath;
  }

  update(_dt: number): void
  {
    const go = this.gameObject;
    if (!go)
    {
      return;
    }

    const health = go.getComponent(Health);
    if (!health)
    {
      return;
    }

    if (this._wasAlive && health.isDead)
    {
      this._wasAlive = false;
      this.onDeath?.(go);
    }
  }
}
