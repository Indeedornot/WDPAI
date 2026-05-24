import { Component } from '../core/Component';
import { GameObject } from '../core/GameObject';
import { Vec2 } from '../math/Vec2';
import { SpriteRenderer2D } from '../render/SpriteRenderer2D';
import { Mover2D } from './Mover2D';
import { AabbCollider2D } from '../physics/AabbCollider2D';
import { DamageOnCollision2D } from './DamageOnCollision2D';
import { DestroyOnCollision2D } from './DestroyOnCollision2D';
import { Lifetime } from './Lifetime';
import { KnockbackOnCollision2D } from './KnockbackOnCollision2D';
import { RunStats } from './RunStats';
import {
  DefaultShootingBindingsArrows,
  type ShootingBindings2D,
  getShootingVector,
} from '../input/DirectionalBindings2D';

export type Shooter2DOptions = {
  shootKey?: string;
  aimBindings?: Partial<ShootingBindings2D>;
  fallbackToMoveVelocity?: boolean;
  fireRatePerSecond?: number;

  shotsPerFire?: number;
  /** Total spread angle across all shots (radians). */
  spreadRadians?: number;

  projectileSpeed?: number;
  projectileSize?: Vec2;
  projectileColor?: string;
  projectileDamage?: number;
  projectileKnockback?: number;
  projectileVictimTag?: string;
  projectileLifetimeSeconds?: number;
  projectileExpireMode?: 'destroy' | 'freeze';
  /** If > 0, destroys the projectile after this many seconds (useful for sticky projectiles). */
  projectileStickyTotalLifetimeSeconds?: number;
};

export class Shooter2D extends Component 
{
  shootKey: string;
  aimBindings: ShootingBindings2D;
  fallbackToMoveVelocity: boolean;
  fireRatePerSecond: number;

  shotsPerFire: number;
  spreadRadians: number;

  projectileSpeed: number;
  projectileSize: Vec2;
  projectileColor: string;
  projectileDamage: number;
  projectileKnockback: number;
  projectileVictimTag: string;
  projectileLifetimeSeconds: number;
  projectileExpireMode: 'destroy' | 'freeze';
  projectileStickyTotalLifetimeSeconds: number;

  private _cooldown = 0;
  private _direction = new Vec2(1, 0);

  constructor(options: Shooter2DOptions = {}) 
  {
    super();
    this.shootKey = options.shootKey ?? 'Space';
    this.aimBindings = {
      ...DefaultShootingBindingsArrows,
      ...(options.aimBindings ?? {}),
    };
    this.fallbackToMoveVelocity = options.fallbackToMoveVelocity ?? true;
    this.fireRatePerSecond = options.fireRatePerSecond ?? 6;

    this.shotsPerFire = options.shotsPerFire ?? 1;
    this.spreadRadians = options.spreadRadians ?? 0;

    this.projectileSpeed = options.projectileSpeed ?? 600;
    this.projectileSize = options.projectileSize ?? new Vec2(18, 10);
    this.projectileColor = options.projectileColor ?? '#eab308';
    this.projectileDamage = options.projectileDamage ?? 10;
    this.projectileKnockback = options.projectileKnockback ?? 520;
    this.projectileVictimTag = options.projectileVictimTag ?? 'Enemy';
    this.projectileLifetimeSeconds = options.projectileLifetimeSeconds ?? 1.5;
    this.projectileExpireMode = options.projectileExpireMode ?? 'destroy';
    this.projectileStickyTotalLifetimeSeconds = options.projectileStickyTotalLifetimeSeconds ?? 0;
  }

  update(dt: number): void 
  {
    const go = this.gameObject;
    const scene = this.scene;
    if (!go || !scene) 
    {
      return;
    }

    const stats = go.getComponent(RunStats);

    this._cooldown = Math.max(0, this._cooldown - dt);

    const input = scene.input;

    const aim = getShootingVector(input, this.aimBindings);
    if (aim.length() > 1e-6) 
    {
      this._direction = aim;
    }
    else if (this.fallbackToMoveVelocity) 
    {
      const mover = go.getComponent(Mover2D);
      if (mover && mover.velocity.length() > 1e-3) 
      {
        this._direction = mover.velocity.clone().normalize();
      }
    }

    if (this._cooldown > 0) 
    {
      return;
    }

    if (!input.wasKeyPressed(this.shootKey)) 
    {
      return;
    }

    this._cooldown = 1 / Math.max(0.001, this.fireRatePerSecond);

    const shots = Math.max(1, Math.floor(this.shotsPerFire));
    const spread = this.spreadRadians;

    for (let i = 0; i < shots; i++) 
    {
      const t = shots === 1 ? 0.5 : i / (shots - 1);
      const angle = (t - 0.5) * spread;
      const dir = rotateUnitVector(this._direction, angle);

      const spawnOffset = dir.scaled(55);
      const spawnPos = Vec2.add(go.transform.position, spawnOffset);

      const projectile = new GameObject('Projectile');
      projectile.tag = 'Projectile';
      projectile.transform.position.set(spawnPos.x, spawnPos.y);

      projectile.addComponent(
        new SpriteRenderer2D({ size: this.projectileSize, color: this.projectileColor }),
      );
      projectile.addComponent(new AabbCollider2D(this.projectileSize.clone()));

      const projMover = projectile.addComponent(new Mover2D());
      projMover.velocity = dir.clone().scale(this.projectileSpeed);

      const dmg = projectile.addComponent(
        new DamageOnCollision2D({
          damage: this.projectileDamage,
          victimTag: this.projectileVictimTag,
          oncePerContact: true,
        }),
      );
      if (stats) 
      {
        dmg.stats = stats;
      }
      projectile.addComponent(
        new KnockbackOnCollision2D({
          otherTag: this.projectileVictimTag,
          force: this.projectileKnockback,
          directionMode: 'alongSelfVelocity',
          applyToSelf: false,
          applyToOther: true,
          otherForceMultiplier: 1,
        }),
      );
      projectile.addComponent(new DestroyOnCollision2D({ otherTag: this.projectileVictimTag }));

      // Phase 1: normal projectile travel; optionally freeze at the end.
      projectile.addComponent(
        new Lifetime({
          seconds: this.projectileLifetimeSeconds,
          expireMode: this.projectileExpireMode,
        }),
      );

      // Phase 2: if this was fired while "sticky" is active, ensure it disappears when the
      // effect would have ended (based on the player's remaining sticky time at fire-time).
      if (this.projectileExpireMode === 'freeze' && this.projectileStickyTotalLifetimeSeconds > 0) 
      {
        projectile.addComponent(
          new Lifetime({
            seconds: this.projectileStickyTotalLifetimeSeconds,
            expireMode: 'destroy',
          }),
        );
      }

      if (stats) 
      {
        stats.shotsFired += 1;
      }
      scene.add(projectile);
    }
  }
}

function rotateUnitVector(v: Vec2, radians: number): Vec2 
{
  if (Math.abs(radians) <= 1e-8) 
  {
    return v.clone();
  }
  const c = Math.cos(radians);
  const s = Math.sin(radians);
  return new Vec2(v.x * c - v.y * s, v.x * s + v.y * c);
}
