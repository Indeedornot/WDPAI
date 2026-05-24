import type { Scene } from '../../engine/core/Scene';
import { GameObject } from '../../engine/core/GameObject';
import { Vec2 } from '../../engine/math/Vec2';
import { AabbCollider2D } from '../../engine/physics/AabbCollider2D';
import { DebugGridRenderer2D } from '../../engine/render/DebugGridRenderer2D';
import { HealthBarRenderer2D } from '../../engine/render/HealthBarRenderer2D';
import { SpriteRenderer2D } from '../../engine/render/SpriteRenderer2D';
import { ChasePlayer2D } from '../../engine/components/ChasePlayer2D';
import { CountKillToPlayerStatsOnDeath2D } from '../../engine/components/CountKillToPlayerStatsOnDeath2D';
import { DamageOnCollision2D } from '../../engine/components/DamageOnCollision2D';
import { DestroyWhenDead } from '../../engine/components/DestroyWhenDead';
import { DropPowerupOnDeath2D } from '../../engine/components/DropPowerupOnDeath2D';
import { EnemySpawner2D } from '../../engine/components/EnemySpawner2D';
import { Experience } from '../../engine/components/Experience';
import { GrantXpToPlayerOnDeath2D } from '../../engine/components/GrantXpToPlayerOnDeath2D';
import { Health } from '../../engine/components/Health';
import { KeyboardMove2D } from '../../engine/components/KeyboardMove2D';
import { KnockbackOnCollision2D } from '../../engine/components/KnockbackOnCollision2D';
import { Mover2D } from '../../engine/components/Mover2D';
import { PowerupController2D } from '../../engine/components/PowerupController2D';
import { PowerupPickup2D } from '../../engine/components/PowerupPickup2D';
import { RunStats } from '../../engine/components/RunStats';
import { Shooter2D } from '../../engine/components/Shooter2D';
import { Spin2D } from '../../engine/components/Spin2D';
import { VelocityDamping2D } from '../../engine/components/VelocityDamping2D';
import { WrapAroundBounds2D } from '../../engine/components/WrapAroundBounds2D';
import {
  DefaultMovementBindingsWASD,
  DefaultShootingBindingsArrows,
} from '../../engine/input/DirectionalBindings2D';
import type { ControlsConfig } from '../controls/ControlsConfig';
import { DefaultTheme } from '../theme/AppTheme';

export type RunResult = {
  player: GameObject;
  playerMove: KeyboardMove2D;
  playerShooter: Shooter2D;
};

export const MAP_BOUNDS = { minX: -1100, maxX: 1100, minY: -1100, maxY: 1100 };

export function buildRun(scene: Scene, controls: ControlsConfig): RunResult 
{
  scene.clearImmediate();

  const grid = new GameObject('Grid');
  grid.addComponent(
    new DebugGridRenderer2D({
      step: 100,
      color: DefaultTheme.canvasGrid,
      axisColor: DefaultTheme.canvasAxis,
    }),
  );
  scene.add(grid);

  const spawnPowerup = (x: number, y: number): GameObject => 
  {
    const kinds = [
      { kind: 'doubleShot' as const, label: '2x', color: DefaultTheme.ok },
      { kind: 'stickyProjectiles' as const, label: 'S', color: DefaultTheme.accent },
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

  const spawnEnemy = (pos: Vec2, n: number): GameObject => 
  {
    const enemy = new GameObject(`Enemy${n}`);
    enemy.tag = 'Enemy';
    enemy.transform.position.set(pos.x, pos.y);

    const size = 46 + (n % 4) * 6;
    enemy.addComponent(
      new SpriteRenderer2D({
        size: new Vec2(size, size),
        color: DefaultTheme.primary,
        strokeColor: DefaultTheme.canvasOutline,
        shape: n % 2 === 0 ? 'circle' : 'diamond',
        label: 'E',
      }),
    );
    enemy.addComponent(new AabbCollider2D(new Vec2(size, size)));
    enemy.addComponent(new Health({ max: 50 }));
    enemy.addComponent(
      new HealthBarRenderer2D({
        offset: new Vec2(0, -size - 5),
        fillColor: DefaultTheme.primary,
        borderColor: DefaultTheme.canvasOutline,
      }),
    );
    enemy.addComponent(new GrantXpToPlayerOnDeath2D({ xp: 8 }));
    enemy.addComponent(new CountKillToPlayerStatsOnDeath2D());
    enemy.addComponent(new DropPowerupOnDeath2D({ chance: 0.22, factory: spawnPowerup }));
    enemy.addComponent(new DestroyWhenDead());
    enemy.addComponent(
      new DamageOnCollision2D({ damage: 10, victimTag: 'Player', oncePerContact: true }),
    );
    enemy.addComponent(new Mover2D());
    enemy.addComponent(new VelocityDamping2D({ damping: 6 }));
    enemy.addComponent(new ChasePlayer2D({ speed: 170, stopDistance: 28 }));
    return enemy;
  };

  // Player
  const player = new GameObject('Player');
  player.tag = 'Player';
  player.transform.position.set(200, -200);
  player.addComponent(
    new SpriteRenderer2D({
      size: new Vec2(80, 80),
      color: DefaultTheme.accent,
      strokeColor: DefaultTheme.canvasOutline,
      shape: 'rect',
      label: 'P',
    }),
  );
  player.addComponent(new AabbCollider2D(new Vec2(80, 80)));
  player.addComponent(new Health({ max: 100 }));
  player.addComponent(
    new HealthBarRenderer2D({
      offset: new Vec2(0, -70),
      fillColor: DefaultTheme.ok,
      borderColor: DefaultTheme.canvasOutline,
    }),
  );
  player.addComponent(new Mover2D());
  player.addComponent(new VelocityDamping2D({ damping: 10 }));
  player.addComponent(new Experience({ level: 1, xp: 0 }));
  player.addComponent(new PowerupController2D());
  player.addComponent(new RunStats());
  player.addComponent(new WrapAroundBounds2D(MAP_BOUNDS));
  const playerMove = player.addComponent(new KeyboardMove2D({ speed: 320 }));
  player.addComponent(new Spin2D({ radiansPerSecond: Math.PI * 0.6 }));
  player.addComponent(
    new KnockbackOnCollision2D({
      otherTag: 'Enemy',
      force: 420,
      applyToSelf: true,
      applyToOther: true,
      otherForceMultiplier: 0.8,
    }),
  );
  const playerShooter = player.addComponent(
    new Shooter2D({
      fallbackToMoveVelocity: false,
      projectileVictimTag: 'Enemy',
      projectileDamage: 15,
      fireRatePerSecond: 7,
      projectileColor: DefaultTheme.ok,
    }),
  );

  playerMove.bindings = { ...DefaultMovementBindingsWASD, ...controls.movement };
  playerShooter.aimBindings = { ...DefaultShootingBindingsArrows, ...controls.aim };
  playerShooter.shootKey = controls.shootKey;
  scene.add(player);

  // Two static starter enemies
  const target = new GameObject('Target');
  target.tag = 'Enemy';
  target.transform.position.set(500, -320);
  target.addComponent(
    new SpriteRenderer2D({
      size: new Vec2(60, 60),
      color: DefaultTheme.primary,
      strokeColor: DefaultTheme.canvasOutline,
      shape: 'circle',
      label: 'E',
    }),
  );
  target.addComponent(new AabbCollider2D(new Vec2(60, 60)));
  target.addComponent(new Health({ max: 60 }));
  target.addComponent(
    new HealthBarRenderer2D({
      offset: new Vec2(0, -55),
      fillColor: DefaultTheme.primary,
      borderColor: DefaultTheme.canvasOutline,
    }),
  );
  target.addComponent(new GrantXpToPlayerOnDeath2D({ xp: 12 }));
  target.addComponent(new CountKillToPlayerStatsOnDeath2D());
  target.addComponent(new DropPowerupOnDeath2D({ chance: 0.35, factory: spawnPowerup }));
  target.addComponent(new DestroyWhenDead());
  target.addComponent(
    new DamageOnCollision2D({ damage: 12, victimTag: 'Player', oncePerContact: true }),
  );
  target.addComponent(new Mover2D());
  target.addComponent(new VelocityDamping2D({ damping: 6 }));
  target.addComponent(new ChasePlayer2D({ speed: 150, stopDistance: 34 }));
  scene.add(target);

  const enemy2 = new GameObject('Enemy2');
  enemy2.tag = 'Enemy';
  enemy2.transform.position.set(650, -160);
  enemy2.addComponent(
    new SpriteRenderer2D({
      size: new Vec2(50, 50),
      color: DefaultTheme.primary,
      strokeColor: DefaultTheme.canvasOutline,
      shape: 'diamond',
      label: 'E',
    }),
  );
  enemy2.addComponent(new AabbCollider2D(new Vec2(50, 50)));
  enemy2.addComponent(new Health({ max: 40 }));
  enemy2.addComponent(
    new HealthBarRenderer2D({
      offset: new Vec2(0, -50),
      fillColor: DefaultTheme.primary,
      borderColor: DefaultTheme.canvasOutline,
    }),
  );
  enemy2.addComponent(new GrantXpToPlayerOnDeath2D({ xp: 10 }));
  enemy2.addComponent(new CountKillToPlayerStatsOnDeath2D());
  enemy2.addComponent(new DropPowerupOnDeath2D({ chance: 0.3, factory: spawnPowerup }));
  enemy2.addComponent(new DestroyWhenDead());
  enemy2.addComponent(new Mover2D());
  enemy2.addComponent(new VelocityDamping2D({ damping: 6 }));
  enemy2.addComponent(new ChasePlayer2D({ speed: 190, stopDistance: 28 }));
  enemy2.addComponent(
    new DamageOnCollision2D({ damage: 10, victimTag: 'Player', oncePerContact: true }),
  );
  scene.add(enemy2);

  const spawner = new GameObject('EnemySpawner');
  spawner.addComponent(
    new EnemySpawner2D({
      spawnEverySeconds: 1.1,
      maxAlive: 12,
      spawnDistance: 720,
      spawnDistanceJitter: 220,
      factory: (p, n) => spawnEnemy(p, n),
    }),
  );
  scene.add(spawner);

  return { player, playerMove, playerShooter };
}
