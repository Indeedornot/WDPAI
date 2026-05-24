import { Component } from '../core/Component';
import { Vec2 } from '../math/Vec2';

export class Mover2D extends Component 
{
  velocity = new Vec2(0, 0);
  impulse = new Vec2(0, 0);

  fixedUpdate(dt: number): void 
  {
    const go = this.gameObject;
    if (!go) 
    {
      return;
    }

    go.transform.position.x += (this.velocity.x + this.impulse.x) * dt;
    go.transform.position.y += (this.velocity.y + this.impulse.y) * dt;
  }
}
