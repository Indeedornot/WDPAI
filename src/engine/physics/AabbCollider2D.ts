import { Collider2D } from './Collider2D'
import { Vec2 } from '../math/Vec2'

export class AabbCollider2D extends Collider2D {
  constructor(size: Vec2 = new Vec2(50, 50), offset: Vec2 = new Vec2(0, 0)) {
    super(size, offset)
  }
}
