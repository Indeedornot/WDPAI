import type { Scene } from '../../engine/core/Scene';
import type { GameLoop } from '../../engine/core/GameLoop';
import type { Input } from '../../engine/input/Input';
import { Health } from '../../engine/components/Health';
import { Experience } from '../../engine/components/Experience';
import { PowerupController2D } from '../../engine/components/PowerupController2D';
import { RunStats } from '../../engine/components/RunStats';
import type { RunStatsPayload } from './RunsClient';
import type { Leaderboard } from './Leaderboard';

export type GameSessionOptions = {
  scene: Scene;
  loop: GameLoop;
  input: Input;
  hudStatus: HTMLDivElement;
  leaderboard: Leaderboard;
  onDeath: (stats: RunStatsPayload) => void;
};

export class GameSession 
{
  private readonly _options: GameSessionOptions;
  private _isDead = false;
  private _timer: number | null = null;

  constructor(options: GameSessionOptions) 
  {
    this._options = options;
  }

  get isDead(): boolean 
  {
    return this._isDead;
  }

  start(): void 
  {
    if (this._timer !== null) 
    {
      return;
    }
    this._timer = window.setInterval(() => this._tick(), 250);
  }

  stop(): void 
  {
    if (this._timer === null) 
    {
      return;
    }
    window.clearInterval(this._timer);
    this._timer = null;
  }

  reset(): void 
  {
    this._isDead = false;
  }

  private _tick(): void
  {
    const { scene, loop, input, hudStatus, leaderboard, onDeath } = this._options;

    let playerHp = 'n/a';
    let playerXp = 'n/a';
    let powerups = '';
    let deadNow = false;
    let statsSnapshot: RunStatsPayload | null = null;

    for (const go of scene.getGameObjects()) 
    {
      if (go.tag !== 'Player') 
      {
        continue;
      }

      const h = go.getComponent(Health);
      if (h) 
      {
        playerHp = `${Math.round(h.current)}/${Math.round(h.max)}`;
        deadNow = h.isDead;
      }

      const xp = go.getComponent(Experience);
      if (xp) 
      {
        playerXp = `Lv ${xp.level} · XP ${xp.xp}/${xp.xpToNext}`;
      }

      const pu = go.getComponent(PowerupController2D);
      if (pu) 
      {
        const active: string[] = [];
        if (pu.doubleShotSeconds > 0) 
        {
          active.push(`Double (${Math.ceil(pu.doubleShotSeconds)}s)`);
        }
        if (pu.stickyProjectilesSeconds > 0)
        {
          active.push(`Sticky (${Math.ceil(pu.stickyProjectilesSeconds)}s)`);
        }
        powerups = active.length ? ` · Powerups: ${active.join(', ')}` : '';
      }

      if (deadNow) 
      {
        const stats = go.getComponent(RunStats);
        statsSnapshot = {
          timeSeconds: Math.floor(stats?.elapsedSeconds ?? 0),
          level: xp?.level ?? 1,
          xp: xp?.xp ?? 0,
          kills: stats?.kills ?? 0,
          shotsFired: stats?.shotsFired ?? 0,
          shotsHit: stats?.shotsHit ?? 0,
        };
      }
    }

    if (deadNow && !this._isDead)
    {
      this._isDead = true;
      loop.pause();
      input.clear();
      const finalStats = statsSnapshot ?? { timeSeconds: 0, level: 1, xp: 0, kills: 0, shotsFired: 0, shotsHit: 0 };
      leaderboard.addEntry({
        email: 'anonymous',
        timeSeconds: finalStats.timeSeconds,
        kills: finalStats.kills,
        level: finalStats.level,
      });
      onDeath(finalStats);
    }

    hudStatus.textContent = `Status: ${loop.paused ? 'Paused' : 'Running'} · Player HP: ${playerHp} · ${playerXp}${powerups}`;
  }
}
