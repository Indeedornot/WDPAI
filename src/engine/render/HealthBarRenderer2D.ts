import { Component } from '../core/Component';
import type { Camera2D } from './Camera2D';
import { Vec2 } from '../math/Vec2';
import { Health } from '../components/Health';

export type HealthBarRenderer2DOptions = {
  /** Bar size in world units (width, height). */
  size?: Vec2;

  /** Offset from GameObject position in world units. (Below = negative Y). */
  offset?: Vec2;

  backgroundColor?: string;
  fillColor?: string;
  borderColor?: string;
};

export class HealthBarRenderer2D extends Component 
{
  size: Vec2;
  offset: Vec2;
  backgroundColor: string;
  fillColor: string;
  borderColor: string;

  constructor(options: HealthBarRenderer2DOptions = {}) 
  {
    super();
    this.size = options.size ?? new Vec2(90, 12);
    this.offset = options.offset ?? new Vec2(0, -70);
    this.backgroundColor = options.backgroundColor ?? 'rgba(255,255,255,0.12)';
    this.fillColor = options.fillColor ?? '#22c55e';
    this.borderColor = options.borderColor ?? 'rgba(255,255,255,0.35)';
  }

  render(ctx: CanvasRenderingContext2D, camera: Camera2D): void 
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

    const worldPos = new Vec2(
      go.transform.position.x + this.offset.x,
      go.transform.position.y + this.offset.y,
    );
    const pos = camera.worldToScreen(worldPos);

    const w = camera.sizeToScreen(this.size.x);
    const h = camera.sizeToScreen(this.size.y);

    const x = pos.x - w / 2;
    const y = pos.y - h / 2;

    // Background
    ctx.fillStyle = this.backgroundColor;
    ctx.fillRect(x, y, w, h);

    // Fill
    const fillW = Math.max(0, Math.min(1, health.normalized)) * w;
    ctx.fillStyle = this.fillColor;
    ctx.fillRect(x, y, fillW, h);

    // Border
    ctx.strokeStyle = this.borderColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
  }
}
