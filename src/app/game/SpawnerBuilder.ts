import { GameObject } from '../../engine/core/GameObject';
import { Vec2 } from '../../engine/math/Vec2';
import { AabbCollider2D } from '../../engine/physics/AabbCollider2D';
import { HealthBarRenderer2D } from '../../engine/render/HealthBarRenderer2D';
import { SpriteRenderer2D } from '../../engine/render/SpriteRenderer2D';
import { ChasePlayer2D } from '../../engine/components/ChasePlayer2D';
import { CountKillToPlayerStatsOnDeath2D } from '../../engine/components/CountKillToPlayerStatsOnDeath2D';
import { DamageOnCollision2D } from '../../engine/components/DamageOnCollision2D';
import { DestroyWhenDead } from '../../engine/components/DestroyWhenDead';
import { DropPowerupOnDeath2D } from '../../engine/components/DropPowerupOnDeath2D';
import { EnemyDeathEffect } from '../../engine/components/EnemyDeathEffect';
import { GrantXpToPlayerOnDeath2D } from '../../engine/components/GrantXpToPlayerOnDeath2D';
import { Health } from '../../engine/components/Health';
import { Mover2D } from '../../engine/components/Mover2D';
import { PowerupPickup2D } from '../../engine/components/PowerupPickup2D';
import { VelocityDamping2D } from '../../engine/components/VelocityDamping2D';
import { DefaultTheme } from '../theme/AppTheme';
import { ParticleEffect } from './ParticleEffect';

type PowerupKind = 'doubleShot' | 'stickyProjectiles';

interface PowerupSpawner
{
  (x: number, y: number): GameObject;
}

export type EnemyVariant = 'standard' | 'armored' | 'fast';

export interface EnemyConfig
{
  variant: EnemyVariant;
  healthMultiplier: number;
  speedMultiplier: number;
  xpMultiplier: number;
}

export class SpawnerBuilder
{
  static createPowerupSpawner(): PowerupSpawner
  {
    return (x: number, y: number): GameObject =>
    {
      const kinds: Array<{ kind: PowerupKind; label: string; color: string }> = [
        { kind: 'doubleShot', label: '2x', color: DefaultTheme.ok },
        { kind: 'stickyProjectiles', label: 'S', color: DefaultTheme.accent },
      ];
      const pick = kinds[Math.floor(Math.random() * kinds.length)] ?? kinds[0];

      const go = new GameObject('Powerup');
      go.tag = 'Powerup';
      go.transform.position.set(x, y);
      go.addComponent(
        new SpriteRenderer2D({
          size: new Vec2(34, 34),
          color: pick.color,
          strokeColor: DefaultTheme.canvasOutline,
          shape: 'rect',
          label: pick.label,
        }),
      );
      const col = go.addComponent(new AabbCollider2D(new Vec2(34, 34)));
      col.isTrigger = true;
      go.addComponent(new PowerupPickup2D({ kind: pick.kind, durationSeconds: 10 }));
      return go;
    };
  }

  static createEnemy(pos: Vec2, n: number, powerupSpawner: PowerupSpawner, config?: EnemyConfig): GameObject
  {
    const cfg = config ?? {
      variant: 'standard' as EnemyVariant,
      healthMultiplier: 1,
      speedMultiplier: 1,
      xpMultiplier: 1,
    };

    const enemy = new GameObject(`Enemy${n}`);
    enemy.tag = 'Enemy';
    enemy.transform.position.set(pos.x, pos.y);

    const baseSize = 46 + (n % 4) * 6;
    const size = cfg.variant === 'armored' ? baseSize * 1.2 : baseSize;

    const shape = cfg.variant === 'fast' ? 'diamond' : n % 2 === 0 ? 'circle' : 'diamond';
    const color =
      cfg.variant === 'armored'
        ? '#9333ea'
        : cfg.variant === 'fast'
          ? '#f59e0b'
          : DefaultTheme.primary;

    const label = cfg.variant === 'armored' ? 'A' : cfg.variant === 'fast' ? 'F' : 'E';

    enemy.addComponent(
      new SpriteRenderer2D({
        size: new Vec2(size, size),
        color,
        strokeColor: DefaultTheme.canvasOutline,
        shape,
        label,
      }),
    );
    enemy.addComponent(new AabbCollider2D(new Vec2(size, size)));

    const baseHealth = 50 * cfg.healthMultiplier;
    enemy.addComponent(new Health({ max: baseHealth }));
    enemy.addComponent(
      new HealthBarRenderer2D({
        offset: new Vec2(0, -size - 5),
        fillColor: color,
        borderColor: DefaultTheme.canvasOutline,
      }),
    );

    const baseXp = 8 * cfg.xpMultiplier;
    enemy.addComponent(new GrantXpToPlayerOnDeath2D({ xp: baseXp }));
    enemy.addComponent(new CountKillToPlayerStatsOnDeath2D());
    enemy.addComponent(new DropPowerupOnDeath2D({ chance: 0.22, factory: powerupSpawner }));
    enemy.addComponent(new DestroyWhenDead());
    enemy.addComponent(
      new DamageOnCollision2D({ damage: 10, victimTag: 'Player', oncePerContact: true }),
    );
    enemy.addComponent(new Mover2D());
    enemy.addComponent(new VelocityDamping2D({ damping: 6 }));

    const baseSpeed = 170 * cfg.speedMultiplier;
    enemy.addComponent(new ChasePlayer2D({ speed: baseSpeed, stopDistance: 28 }));

    enemy.addComponent(
      new EnemyDeathEffect((go) =>
      {
        const scene = go.scene;
        if (scene)
        {
          const particles = ParticleEffect.createKillExplosion(go.transform.position, color);
          for (const particle of particles)
          {
            scene.add(particle);
          }
        }
      }),
    );

    return enemy;
  }

  static chooseVariant(difficulty: number): EnemyVariant
  {
    const roll = Math.random();
    if (difficulty > 1.5 && roll < 0.2)
      return 'armored';
    if (difficulty > 1.0 && roll < 0.25)
      return 'fast';
    return 'standard';
  }
}
