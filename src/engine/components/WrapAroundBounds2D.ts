import { Component } from '../core/Component';

export type WrapAroundBounds2DOptions = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

export class WrapAroundBounds2D extends Component 
{
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;

  constructor(options: WrapAroundBounds2DOptions) 
  {
    super();
    this.minX = options.minX;
    this.maxX = options.maxX;
    this.minY = options.minY;
    this.maxY = options.maxY;
  }

  update(_dt: number): void 
  {
    const go = this.gameObject;
    if (!go) 
    {
      return;
    }

    const w = this.maxX - this.minX;
    const h = this.maxY - this.minY;
    if (w <= 0 || h <= 0) 
    {
      return;
    }

    const p = go.transform.position;

    // Wrap to [min, max) so going past one edge reappears on the other.
    p.x = WrapAroundBounds2D.wrap(p.x, this.minX, w);
    p.y = WrapAroundBounds2D.wrap(p.y, this.minY, h);
  }

  private static wrap(v: number, min: number, size: number): number
  {
    const x = v - min;
    const m = ((x % size) + size) % size;
    return min + m;
  }
}
