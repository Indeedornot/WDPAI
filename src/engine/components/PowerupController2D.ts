import { Component } from '../core/Component';
import { Shooter2D } from './Shooter2D';

export type PowerupKind = 'doubleShot' | 'stickyProjectiles';

export type PowerupController2DOptions = {
  doubleShotSpreadRadians?: number;
};

export class PowerupController2D extends Component 
{
  doubleShotSeconds = 0;
  stickyProjectilesSeconds = 0;

  doubleShotSpreadRadians: number;

  constructor(options: PowerupController2DOptions = {}) 
  {
    super();
    this.doubleShotSpreadRadians = options.doubleShotSpreadRadians ?? 0.22;
  }

  apply(kind: PowerupKind, durationSeconds: number): void 
  {
    const d = Math.max(0, durationSeconds);
    if (d <= 0) 
    {
      return;
    }

    if (kind === 'doubleShot') 
    {
      this.doubleShotSeconds = Math.max(this.doubleShotSeconds, d);
    }
    else if (kind === 'stickyProjectiles') 
    {
      this.stickyProjectilesSeconds = Math.max(this.stickyProjectilesSeconds, d);
    }
  }

  update(dt: number): void 
  {
    const go = this.gameObject;
    if (!go) 
    {
      return;
    }

    this.doubleShotSeconds = Math.max(0, this.doubleShotSeconds - dt);
    this.stickyProjectilesSeconds = Math.max(0, this.stickyProjectilesSeconds - dt);

    const shooter = go.getComponent(Shooter2D);
    if (!shooter) 
    {
      return;
    }

    const hasDouble = this.doubleShotSeconds > 0;
    shooter.shotsPerFire = hasDouble ? 2 : 1;
    shooter.spreadRadians = hasDouble ? this.doubleShotSpreadRadians : 0;

    const hasSticky = this.stickyProjectilesSeconds > 0;
    shooter.projectileExpireMode = hasSticky ? 'freeze' : 'destroy';
    shooter.projectileStickyTotalLifetimeSeconds = hasSticky ? this.stickyProjectilesSeconds : 0;
  }
}
