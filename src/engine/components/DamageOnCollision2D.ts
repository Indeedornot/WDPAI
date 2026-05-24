import { Component } from '../core/Component';
import type { Collision2D } from '../physics/Collision2D';
import { Health } from './Health';
import type { RunStats } from './RunStats';

export type DamageOnCollision2DOptions = {
  damage?: number;
  victimTag?: string;
  oncePerContact?: boolean;
};

export class DamageOnCollision2D extends Component {
  damage: number;
  victimTag: string;
  oncePerContact: boolean;
  /** Optional stats sink (e.g., player's RunStats) for counting successful hits. */
  stats: RunStats | null = null;

  constructor(options: DamageOnCollision2DOptions = {}) {
    super();
    this.damage = options.damage ?? 10;
    this.victimTag = options.victimTag ?? '';
    this.oncePerContact = options.oncePerContact ?? true;
  }

  onCollisionEnter2D(collision: Collision2D): void {
    if (!this.oncePerContact) return;
    this.tryDamage(collision);
  }

  onCollisionStay2D(collision: Collision2D): void {
    if (this.oncePerContact) return;
    this.tryDamage(collision);
  }

  private tryDamage(collision: Collision2D): void {
    const otherGo = collision.other.gameObject;
    if (!otherGo) return;

    if (this.victimTag && otherGo.tag !== this.victimTag) return;

    const health = otherGo.getComponent(Health);
    if (!health) return;

    if (health.isDead) return;

    health.damage(this.damage);

    if (this.stats) this.stats.shotsHit += 1;
  }
}
