import { Component } from '../core/Component';
import type { Camera2D } from './Camera2D';
import { Vec2 } from '../math/Vec2';

export type SpriteShape2D = 'rect' | 'circle' | 'diamond';

export type SpriteRenderer2DOptions = {
  size?: Vec2;

  /** Backwards-compatible alias for `fillColor`. */
  color?: string;

  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  shape?: SpriteShape2D;

  /** Optional 1–2 character label (e.g. P / E) to reduce reliance on color alone. */
  label?: string;
  labelColor?: string;
};

export class SpriteRenderer2D extends Component 
{
  size: Vec2;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  shape: SpriteShape2D;
  label: string;
  labelColor: string;

  constructor(options: SpriteRenderer2DOptions = {}) 
  {
    super();
    this.size = options.size ?? new Vec2(64, 64);
    this.fillColor = options.fillColor ?? options.color ?? '#7dd3fc';
    this.strokeColor = options.strokeColor ?? 'rgba(255,255,255,0.85)';
    this.strokeWidth = options.strokeWidth ?? 2;
    this.shape = options.shape ?? 'rect';
    this.label = options.label ?? '';
    this.labelColor = options.labelColor ?? 'rgba(0,0,0,0.86)';
  }

  override render(ctx: CanvasRenderingContext2D, camera: Camera2D): void 
  {
    const go = this.gameObject;
    if (!go) 
    {
      return;
    }

    const pos = camera.worldToScreen(go.transform.position);
    const w = camera.sizeToScreen(this.size.x * go.transform.scale.x);
    const h = camera.sizeToScreen(this.size.y * go.transform.scale.y);

    ctx.save();
    ctx.translate(pos.x, pos.y);

    // World rotation is CCW with +Y up, but canvas is +Y down.
    ctx.rotate(-go.transform.rotation);

    ctx.fillStyle = this.fillColor;

    if (this.shape === 'circle') 
    {
      const r = Math.min(w, h) / 2;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fill();
      if (this.strokeWidth > 0) 
      {
        ctx.strokeStyle = this.strokeColor;
        ctx.lineWidth = this.strokeWidth;
        ctx.stroke();
      }
    }
    else if (this.shape === 'diamond') 
    {
      ctx.beginPath();
      ctx.moveTo(0, -h / 2);
      ctx.lineTo(w / 2, 0);
      ctx.lineTo(0, h / 2);
      ctx.lineTo(-w / 2, 0);
      ctx.closePath();
      ctx.fill();
      if (this.strokeWidth > 0) 
      {
        ctx.strokeStyle = this.strokeColor;
        ctx.lineWidth = this.strokeWidth;
        ctx.stroke();
      }
    }
    else 
    {
      // rect
      ctx.fillRect(-w / 2, -h / 2, w, h);
      if (this.strokeWidth > 0) 
      {
        ctx.strokeStyle = this.strokeColor;
        ctx.lineWidth = this.strokeWidth;
        ctx.strokeRect(-w / 2, -h / 2, w, h);
      }
    }

    if (this.label) 
    {
      const fontPx = Math.max(10, Math.floor(Math.min(w, h) * 0.35));
      ctx.fillStyle = this.labelColor;
      ctx.font = `700 ${fontPx}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.label.slice(0, 2), 0, 0);
    }

    ctx.restore();
  }
}
