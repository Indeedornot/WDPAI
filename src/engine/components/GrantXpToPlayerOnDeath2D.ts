import { Component } from '../core/Component';
import { Health } from './Health';
import { Experience } from './Experience';

export type GrantXpToPlayerOnDeath2DOptions = {
  playerTag?: string;
  xp?: number;
};

export class GrantXpToPlayerOnDeath2D extends Component 
{
  playerTag: string;
  xp: number;

  private _done = false;

  constructor(options: GrantXpToPlayerOnDeath2DOptions = {}) 
  {
    super();
    this.playerTag = options.playerTag ?? 'Player';
    this.xp = options.xp ?? 10;
  }

  update(_dt: number): void 
  {
    if (this._done) 
    {
      return;
    }

    const go = this.gameObject;
    const scene = this.scene;
    if (!go || !scene) 
    {
      return;
    }

    const health = go.getComponent(Health);
    if (!health || !health.isDead) 
    {
      return;
    }

    let player = null;
    for (const o of scene.getGameObjects()) 
    {
      if (o.active && o.tag === this.playerTag) 
      {
        player = o; break; 
      } 
    }
    if (!player) 
    {
      this._done = true;
      return;
    }

    const xp = player.getComponent(Experience);
    if (xp) 
    {
      xp.add(this.xp);
    }

    this._done = true;
  }
}
