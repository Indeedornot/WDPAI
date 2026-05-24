import { Component } from '../core/Component';
import { Vec2 } from '../math/Vec2';

let nextColliderId = 1;

export abstract class Collider2D extends Component {
  readonly id: number;

  /** Size in world units (width, height). */
  size: Vec2;

  /** Offset from GameObject position in world units. */
  offset: Vec2;

  /** If true, only events are fired (no resolution either way currently). */
  isTrigger = false;

  constructor(size: Vec2 = new Vec2(50, 50), offset: Vec2 = new Vec2(0, 0)) {
    super();
    this.id = nextColliderId++;
    this.size = size;
    this.offset = offset;
  }

  getWorldAabb(): { minX: number; minY: number; maxX: number; maxY: number } {
    const go = this.gameObject;
    if (!go) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };

    const cx = go.transform.position.x + this.offset.x;
    const cy = go.transform.position.y + this.offset.y;

    const halfW = this.size.x * 0.5;
    const halfH = this.size.y * 0.5;

    return {
      minX: cx - halfW,
      maxX: cx + halfW,
      minY: cy - halfH,
      maxY: cy + halfH,
    };
  }
}
