import type { Component } from '../../engine/core/Component';
import { ChasePlayer2D } from '../../engine/components/ChasePlayer2D';
import { CountKillToPlayerStatsOnDeath2D } from '../../engine/components/CountKillToPlayerStatsOnDeath2D';
import { DamageOnCollision2D } from '../../engine/components/DamageOnCollision2D';
import { DestroyOnCollision2D } from '../../engine/components/DestroyOnCollision2D';
import { DestroyWhenDead } from '../../engine/components/DestroyWhenDead';
import { DropPowerupOnDeath2D } from '../../engine/components/DropPowerupOnDeath2D';
import { Experience } from '../../engine/components/Experience';
import { GrantXpToPlayerOnDeath2D } from '../../engine/components/GrantXpToPlayerOnDeath2D';
import { Health } from '../../engine/components/Health';
import { KeyboardMove2D } from '../../engine/components/KeyboardMove2D';
import { KnockbackOnCollision2D } from '../../engine/components/KnockbackOnCollision2D';
import { Lifetime } from '../../engine/components/Lifetime';
import { Mover2D } from '../../engine/components/Mover2D';
import { PowerupController2D } from '../../engine/components/PowerupController2D';
import { RunStats } from '../../engine/components/RunStats';
import { Shooter2D } from '../../engine/components/Shooter2D';
import { Spin2D } from '../../engine/components/Spin2D';
import { VelocityDamping2D } from '../../engine/components/VelocityDamping2D';
import { WrapAroundBounds2D } from '../../engine/components/WrapAroundBounds2D';
import { Vec2 } from '../../engine/math/Vec2';
import { AabbCollider2D } from '../../engine/physics/AabbCollider2D';
import { HealthBarRenderer2D } from '../../engine/render/HealthBarRenderer2D';
import { SpriteRenderer2D } from '../../engine/render/SpriteRenderer2D';
import type { MovementBindings2D, ShootingBindings2D } from '../../engine/input/DirectionalBindings2D';

export type LoadContext = {
  getObjectById: (id: string) => { id: string } | null;
};

export type ComponentSerializer<T extends Component> = {
  type: string;
  supports: (c: Component) => c is T;
  serialize: (c: T) => unknown;
  /** Create a new component instance from saved data. */
  deserialize: (data: unknown) => T;
  /** Optional linking pass for cross-object references. */
  link?: (c: T, data: unknown, ctx: LoadContext) => void;
};

/**
 * Type-erased serializer used to store serializers for many different
 * component types in one homogeneous collection. Its methods are typed
 * against the base Component so the registry can iterate without `any`.
 */
export type AnyComponentSerializer = {
  type: string;
  supports: (c: Component) => boolean;
  serialize: (c: Component) => unknown;
  deserialize: (data: unknown) => Component;
  link?: (c: Component, data: unknown, ctx: LoadContext) => void;
};

/**
 * Factory that captures a strongly-typed ComponentSerializer<T> and erases it
 * to AnyComponentSerializer. T is inferred from the `supports` type guard, so
 * each serializer body stays fully typed while the result is storable in an
 * AnyComponentSerializer[]. This is the single place the erasure happens.
 */
export function defineComponentSerializer<T extends Component>(
  serializer: ComponentSerializer<T>,
): AnyComponentSerializer 
{
  return serializer as unknown as AnyComponentSerializer;
}

/** Safe readers for untrusted snapshot data, grouped as static helpers. */
export class SnapshotRead 
{
  static number(v: unknown, fallback: number): number 
  {
    return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
  }

  static string(v: unknown, fallback: string): string 
  {
    return typeof v === 'string' ? v : fallback;
  }

  static boolean(v: unknown, fallback: boolean): boolean 
  {
    return typeof v === 'boolean' ? v : fallback;
  }

  static vec2(v: unknown, fallback: Vec2): Vec2 
  {
    if (typeof v !== 'object' || v === null) 
    {
      return fallback;
    }
    const rec = v as Record<string, unknown>;
    return new Vec2(SnapshotRead.number(rec['x'], fallback.x), SnapshotRead.number(rec['y'], fallback.y));
  }

  /** Returns v when it is one of the allowed literals, otherwise the fallback. */
  static literal<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T 
  {
    return typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
  }

  /** Coerces unknown snapshot data into a plain record for keyed access. */
  static record(v: unknown): Record<string, unknown> 
  {
    return typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : {};
  }
}

const EXPIRE_MODES = ['destroy', 'freeze'] as const;
const KNOCKBACK_DIRECTION_MODES = ['awayFromOther', 'alongSelfVelocity'] as const;

export function defaultComponentSerializers(): AnyComponentSerializer[]
{
  return [
    defineComponentSerializer({
      type: 'Mover2D',
      supports: (c): c is Mover2D => c instanceof Mover2D,
      serialize: (c) => ({
        velocity: { x: c.velocity.x, y: c.velocity.y },
        impulse: { x: c.impulse.x, y: c.impulse.y },
      }),
      deserialize: (data) =>
      {
        const m = new Mover2D();
        const rec = SnapshotRead.record(data);
        const v = SnapshotRead.vec2(rec['velocity'], Vec2.zero());
        const i = SnapshotRead.vec2(rec['impulse'], Vec2.zero());
        m.velocity.set(v.x, v.y);
        m.impulse.set(i.x, i.y);
        return m;
      },
    }),
    defineComponentSerializer({
      type: 'Health',
      supports: (c): c is Health => c instanceof Health,
      serialize: (c) => ({ max: c.max, current: c.current }),
      deserialize: (data) =>
      {
        const rec = SnapshotRead.record(data);
        return new Health({
          max: SnapshotRead.number(rec['max'], 100),
          current: SnapshotRead.number(rec['current'], SnapshotRead.number(rec['max'], 100)),
        });
      },
    }),
    defineComponentSerializer({
      type: 'Lifetime',
      supports: (c): c is Lifetime => c instanceof Lifetime,
      serialize: (c) => ({ secondsRemaining: c.secondsRemaining, expireMode: c.expireMode }),
      deserialize: (data) =>
      {
        const rec = SnapshotRead.record(data);
        const secondsRemaining = SnapshotRead.number(rec['secondsRemaining'], 1);
        const expireMode = SnapshotRead.literal(rec['expireMode'], EXPIRE_MODES, 'destroy');
        const lt = new Lifetime({ seconds: secondsRemaining, expireMode });
        lt.secondsRemaining = secondsRemaining;
        return lt;
      },
    }),
    defineComponentSerializer({
      type: 'Experience',
      supports: (c): c is Experience => c instanceof Experience,
      serialize: (c) => ({ level: c.level, xp: c.xp }),
      deserialize: (data) =>
      {
        const rec = SnapshotRead.record(data);
        return new Experience({
          level: SnapshotRead.number(rec['level'], 1),
          xp: SnapshotRead.number(rec['xp'], 0),
        });
      },
    }),
    defineComponentSerializer({
      type: 'PowerupController2D',
      supports: (c): c is PowerupController2D => c instanceof PowerupController2D,
      serialize: (c) => ({
        doubleShotSeconds: c.doubleShotSeconds,
        stickyProjectilesSeconds: c.stickyProjectilesSeconds,
        doubleShotSpreadRadians: c.doubleShotSpreadRadians,
      }),
      deserialize: (data) =>
      {
        const rec = SnapshotRead.record(data);
        const c = new PowerupController2D({
          doubleShotSpreadRadians: SnapshotRead.number(rec['doubleShotSpreadRadians'], 0.22),
        });
        c.doubleShotSeconds = SnapshotRead.number(rec['doubleShotSeconds'], 0);
        c.stickyProjectilesSeconds = SnapshotRead.number(rec['stickyProjectilesSeconds'], 0);
        return c;
      },
    }),
    defineComponentSerializer({
      type: 'AabbCollider2D',
      supports: (c): c is AabbCollider2D => c instanceof AabbCollider2D,
      serialize: (c) => ({
        size: { x: c.size.x, y: c.size.y },
        offset: { x: c.offset.x, y: c.offset.y },
        isTrigger: c.isTrigger,
      }),
      deserialize: (data) =>
      {
        const rec = SnapshotRead.record(data);
        const size = SnapshotRead.vec2(rec['size'], new Vec2(50, 50));
        const offset = SnapshotRead.vec2(rec['offset'], new Vec2(0, 0));
        const col = new AabbCollider2D(size, offset);
        col.isTrigger = Boolean(rec['isTrigger']);
        return col;
      },
    }),
    defineComponentSerializer({
      type: 'SpriteRenderer2D',
      supports: (c): c is SpriteRenderer2D => c instanceof SpriteRenderer2D,
      serialize: (c) => ({ size: { x: c.size.x, y: c.size.y }, color: c.fillColor }),
      deserialize: (data) =>
      {
        const rec = SnapshotRead.record(data);
        return new SpriteRenderer2D({
          size: SnapshotRead.vec2(rec['size'], new Vec2(64, 64)),
          color: SnapshotRead.string(rec['color'], '#7dd3fc'),
        });
      },
    }),
    defineComponentSerializer({
      type: 'HealthBarRenderer2D',
      supports: (c): c is HealthBarRenderer2D => c instanceof HealthBarRenderer2D,
      serialize: (c) => ({
        size: { x: c.size.x, y: c.size.y },
        offset: { x: c.offset.x, y: c.offset.y },
        backgroundColor: c.backgroundColor,
        fillColor: c.fillColor,
        borderColor: c.borderColor,
      }),
      deserialize: (data) =>
      {
        const rec = SnapshotRead.record(data);
        return new HealthBarRenderer2D({
          size: SnapshotRead.vec2(rec['size'], new Vec2(90, 12)),
          offset: SnapshotRead.vec2(rec['offset'], new Vec2(0, -70)),
          backgroundColor: SnapshotRead.string(rec['backgroundColor'], 'rgba(255,255,255,0.12)'),
          fillColor: SnapshotRead.string(rec['fillColor'], '#22c55e'),
          borderColor: SnapshotRead.string(rec['borderColor'], 'rgba(255,255,255,0.35)'),
        });
      },
    }),
    defineComponentSerializer({
      type: 'Shooter2D',
      supports: (c): c is Shooter2D => c instanceof Shooter2D,
      serialize: (c) => ({
        shootKey: c.shootKey,
        aimBindings: c.aimBindings,
        fallbackToMoveVelocity: c.fallbackToMoveVelocity,
        fireRatePerSecond: c.fireRatePerSecond,

        shotsPerFire: c.shotsPerFire,
        spreadRadians: c.spreadRadians,

        projectileSpeed: c.projectileSpeed,
        projectileSize: { x: c.projectileSize.x, y: c.projectileSize.y },
        projectileColor: c.projectileColor,
        projectileDamage: c.projectileDamage,
        projectileKnockback: c.projectileKnockback,
        projectileVictimTag: c.projectileVictimTag,
        projectileLifetimeSeconds: c.projectileLifetimeSeconds,
        projectileExpireMode: c.projectileExpireMode,
        projectileStickyTotalLifetimeSeconds: c.projectileStickyTotalLifetimeSeconds,
      }),
      deserialize: (data) =>
      {
        const rec = SnapshotRead.record(data);
        const s = new Shooter2D({
          shootKey: SnapshotRead.string(rec['shootKey'], 'Space'),
          aimBindings: (rec['aimBindings'] as Partial<ShootingBindings2D>) ?? {},
          fallbackToMoveVelocity: SnapshotRead.boolean(rec['fallbackToMoveVelocity'], true),
          fireRatePerSecond: SnapshotRead.number(rec['fireRatePerSecond'], 6),

          shotsPerFire: SnapshotRead.number(rec['shotsPerFire'], 1),
          spreadRadians: SnapshotRead.number(rec['spreadRadians'], 0),

          projectileSpeed: SnapshotRead.number(rec['projectileSpeed'], 600),
          projectileSize: SnapshotRead.vec2(rec['projectileSize'], new Vec2(18, 10)),
          projectileColor: SnapshotRead.string(rec['projectileColor'], '#eab308'),
          projectileDamage: SnapshotRead.number(rec['projectileDamage'], 10),
          projectileKnockback: SnapshotRead.number(rec['projectileKnockback'], 520),
          projectileVictimTag: SnapshotRead.string(rec['projectileVictimTag'], 'Enemy'),
          projectileLifetimeSeconds: SnapshotRead.number(rec['projectileLifetimeSeconds'], 1.5),
          projectileExpireMode: SnapshotRead.literal(rec['projectileExpireMode'], EXPIRE_MODES, 'destroy'),
          projectileStickyTotalLifetimeSeconds: SnapshotRead.number(
            rec['projectileStickyTotalLifetimeSeconds'],
            0,
          ),
        });
        return s;
      },
    }),
    defineComponentSerializer({
      type: 'KeyboardMove2D',
      supports: (c): c is KeyboardMove2D => c instanceof KeyboardMove2D,
      serialize: (c) => ({ speed: c.speed, bindings: c.bindings }),
      deserialize: (data) =>
      {
        const rec = SnapshotRead.record(data);
        return new KeyboardMove2D({
          speed: SnapshotRead.number(rec['speed'], 250),
          bindings: (rec['bindings'] as Partial<MovementBindings2D>) ?? {},
        });
      },
    }),
    defineComponentSerializer({
      type: 'VelocityDamping2D',
      supports: (c): c is VelocityDamping2D => c instanceof VelocityDamping2D,
      serialize: (c) => ({ damping: c.damping, minSpeed: c.minSpeed }),
      deserialize: (data) =>
      {
        const rec = SnapshotRead.record(data);
        return new VelocityDamping2D({
          damping: SnapshotRead.number(rec['damping'], 8),
          minSpeed: SnapshotRead.number(rec['minSpeed'], 1),
        });
      },
    }),
    defineComponentSerializer({
      type: 'DamageOnCollision2D',
      supports: (c): c is DamageOnCollision2D => c instanceof DamageOnCollision2D,
      serialize: (c) => ({
        damage: c.damage,
        victimTag: c.victimTag,
        oncePerContact: c.oncePerContact,
      }),
      deserialize: (data) =>
      {
        const rec = SnapshotRead.record(data);
        return new DamageOnCollision2D({
          damage: SnapshotRead.number(rec['damage'], 10),
          victimTag: SnapshotRead.string(rec['victimTag'], ''),
          oncePerContact: Boolean(rec['oncePerContact']),
        });
      },
    }),
    defineComponentSerializer({
      type: 'DestroyOnCollision2D',
      supports: (c): c is DestroyOnCollision2D => c instanceof DestroyOnCollision2D,
      serialize: (c) => ({ otherTag: c.otherTag }),
      deserialize: (data) =>
      {
        const rec = SnapshotRead.record(data);
        return new DestroyOnCollision2D({ otherTag: SnapshotRead.string(rec['otherTag'], '') });
      },
    }),
    defineComponentSerializer({
      type: 'DestroyWhenDead',
      supports: (c): c is DestroyWhenDead => c instanceof DestroyWhenDead,
      serialize: () => ({}),
      deserialize: () => new DestroyWhenDead(),
    }),
    defineComponentSerializer({
      // These are runtime-only gameplay helpers; keep them loadable if present.
      type: 'GrantXpToPlayerOnDeath2D',
      supports: (c): c is GrantXpToPlayerOnDeath2D => c instanceof GrantXpToPlayerOnDeath2D,
      serialize: (c) => ({ playerTag: c.playerTag, xp: c.xp }),
      deserialize: (data) =>
      {
        const rec = SnapshotRead.record(data);
        return new GrantXpToPlayerOnDeath2D({
          playerTag: SnapshotRead.string(rec['playerTag'], 'Player'),
          xp: SnapshotRead.number(rec['xp'], 10),
        });
      },
    }),
    defineComponentSerializer({
      // This depends on a factory callback; we can only deserialize a harmless no-op.
      type: 'DropPowerupOnDeath2D',
      supports: (c): c is DropPowerupOnDeath2D => c instanceof DropPowerupOnDeath2D,
      serialize: (c) => ({ chance: c.chance }),
      deserialize: (data) =>
      {
        const rec = SnapshotRead.record(data);
        const c = new DropPowerupOnDeath2D({ chance: SnapshotRead.number(rec['chance'], 0.25) });
        c.enabled = false;
        return c;
      },
    }),
    defineComponentSerializer({
      type: 'KnockbackOnCollision2D',
      supports: (c): c is KnockbackOnCollision2D => c instanceof KnockbackOnCollision2D,
      serialize: (c) => ({
        otherTag: c.otherTag,
        force: c.force,
        directionMode: c.directionMode,
        applyToSelf: c.applyToSelf,
        applyToOther: c.applyToOther,
        otherForceMultiplier: c.otherForceMultiplier,
      }),
      deserialize: (data) =>
      {
        const rec = SnapshotRead.record(data);
        return new KnockbackOnCollision2D({
          otherTag: SnapshotRead.string(rec['otherTag'], ''),
          force: SnapshotRead.number(rec['force'], 350),
          directionMode: SnapshotRead.literal(rec['directionMode'], KNOCKBACK_DIRECTION_MODES, 'awayFromOther'),
          applyToSelf: rec['applyToSelf'] == null ? true : Boolean(rec['applyToSelf']),
          applyToOther: Boolean(rec['applyToOther']),
          otherForceMultiplier: SnapshotRead.number(rec['otherForceMultiplier'], 1),
        });
      },
    }),
    defineComponentSerializer({
      type: 'RunStats',
      supports: (c): c is RunStats => c instanceof RunStats,
      serialize: (c) => ({
        elapsedSeconds: c.elapsedSeconds,
        kills: c.kills,
        shotsFired: c.shotsFired,
        shotsHit: c.shotsHit,
      }),
      deserialize: (data) =>
      {
        const rec = SnapshotRead.record(data);
        const s = new RunStats();
        s.elapsedSeconds = SnapshotRead.number(rec['elapsedSeconds'], 0);
        s.kills = SnapshotRead.number(rec['kills'], 0);
        s.shotsFired = SnapshotRead.number(rec['shotsFired'], 0);
        s.shotsHit = SnapshotRead.number(rec['shotsHit'], 0);
        return s;
      },
    }),
    defineComponentSerializer({
      type: 'WrapAroundBounds2D',
      supports: (c): c is WrapAroundBounds2D => c instanceof WrapAroundBounds2D,
      serialize: (c) => ({ minX: c.minX, maxX: c.maxX, minY: c.minY, maxY: c.maxY }),
      deserialize: (data) =>
      {
        const rec = SnapshotRead.record(data);
        return new WrapAroundBounds2D({
          minX: SnapshotRead.number(rec['minX'], -1100),
          maxX: SnapshotRead.number(rec['maxX'], 1100),
          minY: SnapshotRead.number(rec['minY'], -1100),
          maxY: SnapshotRead.number(rec['maxY'], 1100),
        });
      },
    }),
    defineComponentSerializer({
      type: 'Spin2D',
      supports: (c): c is Spin2D => c instanceof Spin2D,
      serialize: (c) => ({ radiansPerSecond: c.radiansPerSecond }),
      deserialize: (data) =>
      {
        const rec = SnapshotRead.record(data);
        return new Spin2D({ radiansPerSecond: SnapshotRead.number(rec['radiansPerSecond'], Math.PI) });
      },
    }),
    defineComponentSerializer({
      type: 'CountKillToPlayerStatsOnDeath2D',
      supports: (c): c is CountKillToPlayerStatsOnDeath2D => c instanceof CountKillToPlayerStatsOnDeath2D,
      serialize: (c) => ({ playerTag: c.playerTag }),
      deserialize: (data) =>
      {
        const rec = SnapshotRead.record(data);
        return new CountKillToPlayerStatsOnDeath2D({ playerTag: SnapshotRead.string(rec['playerTag'], 'Player') });
      },
    }),
    defineComponentSerializer({
      type: 'ChasePlayer2D',
      supports: (c): c is ChasePlayer2D => c instanceof ChasePlayer2D,
      serialize: (c) => ({
        speed: c.speed,
        targetTag: c.targetTag,
        stopDistance: c.stopDistance,
        reacquireSeconds: c.reacquireSeconds,
      }),
      deserialize: (data) =>
      {
        const rec = SnapshotRead.record(data);
        return new ChasePlayer2D({
          speed: SnapshotRead.number(rec['speed'], 160),
          targetTag: SnapshotRead.string(rec['targetTag'], 'Player'),
          stopDistance: SnapshotRead.number(rec['stopDistance'], 18),
          reacquireSeconds: SnapshotRead.number(rec['reacquireSeconds'], 0.25),
        });
      },
    }),
  ];
}
