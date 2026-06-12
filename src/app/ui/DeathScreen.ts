import type { Component } from './Component';
import type { Leaderboard, LeaderboardEntry } from '../game/Leaderboard';
import type { AchievementView } from '../game/RunsClient';
import {
  el,
  focusFirstDescendant,
  trapFocus,
  uiBody,
  uiButton,
  uiOverlay,
  uiPanel,
  uiRow,
  uiSection,
  uiSubtitle,
  uiTitle,
} from './components/UiKit';

export type DeathScreenStats = {
  timeSeconds: number;
  level: number;
  xp: number;
  kills: number;
  shotsFired: number;
  shotsHit: number;
};

export type DeathScreenOptions = {
  onRestart: () => void;
  leaderboard: Leaderboard;
  personalBestTime?: number;
  totalPlayTime?: number;
  runCount?: number;
  /** Optional remote data sources (used when the player is logged in). */
  loadLeaderboard?: () => Promise<LeaderboardEntry[]>;
  loadAchievements?: () => Promise<AchievementView[]>;
};

export class DeathScreen implements Component
{
  private readonly _overlay: HTMLDivElement;
  private readonly _panel: HTMLDivElement;
  private _untrap: (() => void) | null = null;
  private _isOpen = false;
  private _unblockKeys: (() => void) | null = null;

  private _stats: DeathScreenStats | null = null;
  private _globalEntries: LeaderboardEntry[] = [];
  private _achievements: AchievementView[] = [];
  /** Bumped on each open() so stale async responses are ignored. */
  private _loadToken = 0;

  readonly options: DeathScreenOptions;

  constructor(options: DeathScreenOptions) 
  {
    this.options = options;

    this._overlay = uiOverlay(() => 
    {
      // Don't close by background click.
    });

    this._panel = uiPanel();
    this._panel.setAttribute('role', 'dialog');
    this._panel.setAttribute('aria-modal', 'true');

    this._overlay.appendChild(this._panel);
    this.render();
  }

  mount(parent: HTMLElement): void
  {
    parent.appendChild(this._overlay);
  }

  refresh(): void
  {
    this.render();
  }

  open(stats: DeathScreenStats): void
  {
    this._stats = stats;
    this._globalEntries = [];
    this._achievements = [];
    this.render();
    this.loadRemote();

    if (this._isOpen)
    {
      return;
    }
    this._isOpen = true;
    this._overlay.classList.remove('ui-hidden');

    this._untrap = trapFocus(this._panel, () => this._isOpen);

    const blockKeys = (e: KeyboardEvent) => 
    {
      if (!this._isOpen) 
      {
        return;
      }
      if (e.code === 'Escape') 
      {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };
    window.addEventListener('keydown', blockKeys, { capture: true });
    this._unblockKeys = () => window.removeEventListener('keydown', blockKeys, { capture: true });

    focusFirstDescendant(this._panel);
  }

  close(): void 
  {
    if (!this._isOpen) 
    {
      return;
    }
    this._isOpen = false;
    this._overlay.classList.add('ui-hidden');

    this._untrap?.();
    this._untrap = null;

    this._unblockKeys?.();
    this._unblockKeys = null;
  }

  private render(): void 
  {
    this._panel.innerHTML = '';

    const h = uiTitle('You Died');
    h.id = 'death-title';
    this._panel.setAttribute('aria-labelledby', h.id);

    const sub = uiSubtitle('Your run is over. Review stats, then restart.');
    sub.id = 'death-sub';
    this._panel.setAttribute('aria-describedby', sub.id);

    const body = uiBody();

    const stats = this._stats;
    if (stats)
    {
      const accuracy = stats.shotsFired <= 0 ? 0 : stats.shotsHit / stats.shotsFired;

      const rows: HTMLElement[] = [];
      rows.push(uiRow('Time', el('span', { text: `${formatSeconds(stats.timeSeconds)}` })));
      rows.push(uiRow('Level', el('span', { text: `${stats.level}` })));
      rows.push(uiRow('XP', el('span', { text: `${stats.xp}` })));
      rows.push(uiRow('Kills', el('span', { text: `${stats.kills}` })));
      rows.push(uiRow('Shots fired', el('span', { text: `${stats.shotsFired}` })));
      rows.push(uiRow('Shots hit', el('span', { text: `${stats.shotsHit}` })));
      rows.push(uiRow('Accuracy', el('span', { text: `${Math.round(accuracy * 100)}%` })));

      body.appendChild(uiSection('Run Stats', rows));

      const personalBest = this.options.leaderboard.getPersonalBest();
      if (personalBest && stats.timeSeconds > personalBest.timeSeconds)
      {
        const pbLabel = el('span', { text: '✨ New Personal Best!' });
        pbLabel.style.fontWeight = 'bold';
        pbLabel.style.color = '#fbbf24';
        body.appendChild(pbLabel);
        this.options.leaderboard.setPersonalBest({
          name: 'You',
          timeSeconds: stats.timeSeconds,
          kills: stats.kills,
          level: stats.level,
        });
      }

      // Prefer the global (server) leaderboard when available; otherwise show
      // the local session scores.
      const useGlobal = this._globalEntries.length > 0;
      const topEntries = useGlobal ? this._globalEntries.slice(0, 5) : this.options.leaderboard.getTop(5);
      if (topEntries.length > 0)
      {
        const leaderboardRows: HTMLElement[] = topEntries.map((entry) =>
          uiRow(
            `#${entry.rank} ${entry.name}`,
            el('span', {
              text: `${formatSeconds(entry.timeSeconds)} · Lvl ${entry.level} · ${entry.kills} kills`,
            }),
          ),
        );
        body.appendChild(uiSection(useGlobal ? 'Top Scores (Global)' : 'Top Scores', leaderboardRows));
      }

      if (this._achievements.length > 0)
      {
        const achievementRows: HTMLElement[] = this._achievements.map((a) =>
          uiRow('🏆', el('span', { text: a.title })),
        );
        body.appendChild(uiSection('Achievements', achievementRows));
      }
    }

    body.appendChild(
      uiButton({
        label: 'Restart',
        title: 'Restart the run',
        onClick: () => 
        {
          this.options.onRestart();
          this.close();
        },
      }),
    );

    this._panel.appendChild(h);
    this._panel.appendChild(sub);
    this._panel.appendChild(body);
  }

  /**
   * Fetch the global leaderboard and earned achievements (best-effort).
   * Uses a load token so a slow response from a previous run can't overwrite
   * the current screen.
   */
  private loadRemote(): void
  {
    const { loadLeaderboard, loadAchievements } = this.options;
    if (!loadLeaderboard && !loadAchievements)
    {
      return;
    }

    const token = ++this._loadToken;

    void Promise.allSettled([
      loadLeaderboard?.() ?? Promise.resolve([]),
      loadAchievements?.() ?? Promise.resolve([]),
    ]).then(([lb, ach]) =>
    {
      if (token !== this._loadToken)
      {
        return;
      }
      if (lb.status === 'fulfilled')
      {
        this._globalEntries = lb.value;
      }
      if (ach.status === 'fulfilled')
      {
        this._achievements = ach.value as AchievementView[];
      }
      this.render();
    });
  }
}

function formatSeconds(totalSeconds: number): string 
{
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${mm}:${ss.toString().padStart(2, '0')}`;
}
