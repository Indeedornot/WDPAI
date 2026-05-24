import { Component } from '../core/Component';
import type { Collision2D } from '../physics/Collision2D';
import { PowerupController2D, type PowerupKind } from './PowerupController2D';

export type PowerupPickup2DOptions = {
  otherTag?: string;
  kind: PowerupKind;
  durationSeconds: number;
};

export class PowerupPickup2D extends Component 
{
  otherTag: string;
  kind: PowerupKind;
  durationSeconds: number;

  constructor(options: PowerupPickup2DOptions) 
  {
    super();
    this.otherTag = options.otherTag ?? 'Player';
    this.kind = options.kind;
    this.durationSeconds = options.durationSeconds;
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

    const ctrl = otherGo.getComponent(PowerupController2D);
    if (ctrl) 
    {
      ctrl.apply(this.kind, this.durationSeconds);
    }

    go.destroy();
  }
}
