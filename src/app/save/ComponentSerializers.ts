import {
  AabbCollider2D,
  DropPowerupOnDeath2D,
  Experience,
  Health,
  HealthBarRenderer2D,
  KeyboardMove2D,
  KnockbackOnCollision2D,
  Lifetime,
  Mover2D,
  PowerupController2D,
  PreventDeath,
  Shooter2D,
  SpriteRenderer2D,
  Vec2,
  VelocityDamping2D,
  DamageOnCollision2D,
  DestroyOnCollision2D,
  DestroyWhenDead,
  GrantXpToPlayerOnDeath2D,
} from '../../engine'
import type { Component } from '../../engine'

export type LoadContext = {
  getObjectById: (id: string) => { id: string } | null
}

export type ComponentSerializer<T extends Component> = {
  type: string
  supports: (c: Component) => c is T
  serialize: (c: T) => unknown
  /** Create a new component instance from saved data. */
  deserialize: (data: unknown) => T
  /** Optional linking pass for cross-object references. */
  link?: (c: T, data: unknown, ctx: LoadContext) => void
}

function readNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

function readString(v: unknown, fallback: string): string {
  return typeof v === 'string' ? v : fallback
}

function readBoolean(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback
}

function readVec2(v: unknown, fallback: Vec2): Vec2 {
  if (typeof v !== 'object' || v === null) return fallback
  const rec = v as Record<string, unknown>
  return new Vec2(readNumber(rec['x'], fallback.x), readNumber(rec['y'], fallback.y))
}

export function defaultComponentSerializers(): ComponentSerializer<any>[] {
  return [
    {
      type: 'Mover2D',
      supports: (c): c is Mover2D => c instanceof Mover2D,
      serialize: (c) => ({ velocity: { x: c.velocity.x, y: c.velocity.y }, impulse: { x: c.impulse.x, y: c.impulse.y } }),
      deserialize: (data) => {
        const m = new Mover2D()
        const rec = (data ?? {}) as Record<string, unknown>
        const v = readVec2(rec['velocity'], Vec2.zero())
        const i = readVec2(rec['impulse'], Vec2.zero())
        m.velocity.set(v.x, v.y)
        m.impulse.set(i.x, i.y)
        return m
      },
    },
    {
      type: 'Health',
      supports: (c): c is Health => c instanceof Health,
      serialize: (c) => ({ max: c.max, current: c.current }),
      deserialize: (data) => {
        const rec = (data ?? {}) as Record<string, unknown>
        return new Health({
          max: readNumber(rec['max'], 100),
          current: readNumber(rec['current'], readNumber(rec['max'], 100)),
        })
      },
    },
    {
      type: 'Lifetime',
      supports: (c): c is Lifetime => c instanceof Lifetime,
      serialize: (c) => ({ secondsRemaining: c.secondsRemaining, expireMode: c.expireMode }),
      deserialize: (data) => {
        const rec = (data ?? {}) as Record<string, unknown>
        const secondsRemaining = readNumber(rec['secondsRemaining'], 1)
        const expireMode = readString(rec['expireMode'], 'destroy') as any
        const lt = new Lifetime({ seconds: secondsRemaining, expireMode })
        lt.secondsRemaining = secondsRemaining
        return lt
      },
    },
    {
      type: 'Experience',
      supports: (c): c is Experience => c instanceof Experience,
      serialize: (c) => ({ level: c.level, xp: c.xp }),
      deserialize: (data) => {
        const rec = (data ?? {}) as Record<string, unknown>
        return new Experience({
          level: readNumber(rec['level'], 1),
          xp: readNumber(rec['xp'], 0),
        })
      },
    },
    {
      type: 'PowerupController2D',
      supports: (c): c is PowerupController2D => c instanceof PowerupController2D,
      serialize: (c) => ({
        doubleShotSeconds: c.doubleShotSeconds,
        stickyProjectilesSeconds: c.stickyProjectilesSeconds,
        doubleShotSpreadRadians: c.doubleShotSpreadRadians,
      }),
      deserialize: (data) => {
        const rec = (data ?? {}) as Record<string, unknown>
        const c = new PowerupController2D({
          doubleShotSpreadRadians: readNumber(rec['doubleShotSpreadRadians'], 0.22),
        })
        c.doubleShotSeconds = readNumber(rec['doubleShotSeconds'], 0)
        c.stickyProjectilesSeconds = readNumber(rec['stickyProjectilesSeconds'], 0)
        return c
      },
    },
    {
      type: 'AabbCollider2D',
      supports: (c): c is AabbCollider2D => c instanceof AabbCollider2D,
      serialize: (c) => ({ size: { x: c.size.x, y: c.size.y }, offset: { x: c.offset.x, y: c.offset.y }, isTrigger: c.isTrigger }),
      deserialize: (data) => {
        const rec = (data ?? {}) as Record<string, unknown>
        const size = readVec2(rec['size'], new Vec2(50, 50))
        const offset = readVec2(rec['offset'], new Vec2(0, 0))
        const col = new AabbCollider2D(size, offset)
        col.isTrigger = Boolean(rec['isTrigger'])
        return col
      },
    },
    {
      type: 'SpriteRenderer2D',
      supports: (c): c is SpriteRenderer2D => c instanceof SpriteRenderer2D,
      serialize: (c) => ({ size: { x: c.size.x, y: c.size.y }, color: c.color }),
      deserialize: (data) => {
        const rec = (data ?? {}) as Record<string, unknown>
        return new SpriteRenderer2D({
          size: readVec2(rec['size'], new Vec2(64, 64)),
          color: readString(rec['color'], '#7dd3fc'),
        })
      },
    },
    {
      type: 'HealthBarRenderer2D',
      supports: (c): c is HealthBarRenderer2D => c instanceof HealthBarRenderer2D,
      serialize: (c) => ({
        size: { x: c.size.x, y: c.size.y },
        offset: { x: c.offset.x, y: c.offset.y },
        backgroundColor: c.backgroundColor,
        fillColor: c.fillColor,
        borderColor: c.borderColor,
      }),
      deserialize: (data) => {
        const rec = (data ?? {}) as Record<string, unknown>
        return new HealthBarRenderer2D({
          size: readVec2(rec['size'], new Vec2(90, 12)),
          offset: readVec2(rec['offset'], new Vec2(0, -70)),
          backgroundColor: readString(rec['backgroundColor'], 'rgba(255,255,255,0.12)'),
          fillColor: readString(rec['fillColor'], '#22c55e'),
          borderColor: readString(rec['borderColor'], 'rgba(255,255,255,0.35)'),
        })
      },
    },
    {
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
      deserialize: (data) => {
        const rec = (data ?? {}) as Record<string, unknown>
        const s = new Shooter2D({
          shootKey: readString(rec['shootKey'], 'Space'),
          aimBindings: (rec['aimBindings'] as any) ?? {},
          fallbackToMoveVelocity: readBoolean(rec['fallbackToMoveVelocity'], true),
          fireRatePerSecond: readNumber(rec['fireRatePerSecond'], 6),

          shotsPerFire: readNumber(rec['shotsPerFire'], 1),
          spreadRadians: readNumber(rec['spreadRadians'], 0),

          projectileSpeed: readNumber(rec['projectileSpeed'], 600),
          projectileSize: readVec2(rec['projectileSize'], new Vec2(18, 10)),
          projectileColor: readString(rec['projectileColor'], '#eab308'),
          projectileDamage: readNumber(rec['projectileDamage'], 10),
          projectileKnockback: readNumber(rec['projectileKnockback'], 520),
          projectileVictimTag: readString(rec['projectileVictimTag'], 'Enemy'),
          projectileLifetimeSeconds: readNumber(rec['projectileLifetimeSeconds'], 1.5),
          projectileExpireMode: readString(rec['projectileExpireMode'], 'destroy') as any,
          projectileStickyTotalLifetimeSeconds: readNumber(rec['projectileStickyTotalLifetimeSeconds'], 0),
        })
        return s
      },
    },
    {
      type: 'PreventDeath',
      supports: (c): c is PreventDeath => c instanceof PreventDeath,
      serialize: (c) => ({ minHp: c.minHp }),
      deserialize: (data) => {
        const rec = (data ?? {}) as Record<string, unknown>
        return new PreventDeath({ minHp: readNumber(rec['minHp'], 1) })
      },
    },
    {
      type: 'KeyboardMove2D',
      supports: (c): c is KeyboardMove2D => c instanceof KeyboardMove2D,
      serialize: (c) => ({ speed: c.speed, bindings: c.bindings }),
      deserialize: (data) => {
        const rec = (data ?? {}) as Record<string, unknown>
        return new KeyboardMove2D({
          speed: readNumber(rec['speed'], 250),
          bindings: (rec['bindings'] as any) ?? {},
        })
      },
    },
    {
      type: 'VelocityDamping2D',
      supports: (c): c is VelocityDamping2D => c instanceof VelocityDamping2D,
      serialize: (c) => ({ damping: c.damping, minSpeed: c.minSpeed }),
      deserialize: (data) => {
        const rec = (data ?? {}) as Record<string, unknown>
        return new VelocityDamping2D({
          damping: readNumber(rec['damping'], 8),
          minSpeed: readNumber(rec['minSpeed'], 1),
        })
      },
    },
    {
      type: 'DamageOnCollision2D',
      supports: (c): c is DamageOnCollision2D => c instanceof DamageOnCollision2D,
      serialize: (c) => ({ damage: c.damage, victimTag: c.victimTag, oncePerContact: c.oncePerContact }),
      deserialize: (data) => {
        const rec = (data ?? {}) as Record<string, unknown>
        return new DamageOnCollision2D({
          damage: readNumber(rec['damage'], 10),
          victimTag: readString(rec['victimTag'], ''),
          oncePerContact: Boolean(rec['oncePerContact']),
        })
      },
    },
    {
      type: 'DestroyOnCollision2D',
      supports: (c): c is DestroyOnCollision2D => c instanceof DestroyOnCollision2D,
      serialize: (c) => ({ otherTag: c.otherTag }),
      deserialize: (data) => {
        const rec = (data ?? {}) as Record<string, unknown>
        return new DestroyOnCollision2D({ otherTag: readString(rec['otherTag'], '') })
      },
    },
    {
      type: 'DestroyWhenDead',
      supports: (c): c is DestroyWhenDead => c instanceof DestroyWhenDead,
      serialize: () => ({}),
      deserialize: () => new DestroyWhenDead(),
    },
    {
      // These are runtime-only gameplay helpers; keep them loadable if present.
      type: 'GrantXpToPlayerOnDeath2D',
      supports: (c): c is GrantXpToPlayerOnDeath2D => c instanceof GrantXpToPlayerOnDeath2D,
      serialize: (c) => ({ playerTag: c.playerTag, xp: c.xp }),
      deserialize: (data) => {
        const rec = (data ?? {}) as Record<string, unknown>
        return new GrantXpToPlayerOnDeath2D({
          playerTag: readString(rec['playerTag'], 'Player'),
          xp: readNumber(rec['xp'], 10),
        })
      },
    },
    {
      // This depends on a factory callback; we can only deserialize a harmless no-op.
      type: 'DropPowerupOnDeath2D',
      supports: (c): c is DropPowerupOnDeath2D => c instanceof DropPowerupOnDeath2D,
      serialize: (c) => ({ chance: c.chance }),
      deserialize: (data) => {
        const rec = (data ?? {}) as Record<string, unknown>
        const c = new DropPowerupOnDeath2D({ chance: readNumber(rec['chance'], 0.25) })
        c.enabled = false
        return c
      },
    },
    {
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
      deserialize: (data) => {
        const rec = (data ?? {}) as Record<string, unknown>
        return new KnockbackOnCollision2D({
          otherTag: readString(rec['otherTag'], ''),
          force: readNumber(rec['force'], 350),
          directionMode: (readString(rec['directionMode'], 'awayFromOther') as any),
          applyToSelf: rec['applyToSelf'] == null ? true : Boolean(rec['applyToSelf']),
          applyToOther: Boolean(rec['applyToOther']),
          otherForceMultiplier: readNumber(rec['otherForceMultiplier'], 1),
        })
      },
    },
  ]
}
