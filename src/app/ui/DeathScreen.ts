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
};

export class DeathScreen {
  private readonly _overlay: HTMLDivElement;
  private readonly _panel: HTMLDivElement;
  private _untrap: (() => void) | null = null;
  private _isOpen = false;
  private _unblockKeys: (() => void) | null = null;

  private _stats: DeathScreenStats | null = null;

  readonly options: DeathScreenOptions;

  constructor(options: DeathScreenOptions) {
    this.options = options;

    this._overlay = uiOverlay(() => {
      // Don't close by background click.
    });

    this._panel = uiPanel();
    this._panel.setAttribute('role', 'dialog');
    this._panel.setAttribute('aria-modal', 'true');

    this._overlay.appendChild(this._panel);
    this.render();
  }

  mount(parent: HTMLElement): void {
    parent.appendChild(this._overlay);
  }

  open(stats: DeathScreenStats): void {
    this._stats = stats;
    this.render();

    if (this._isOpen) return;
    this._isOpen = true;
    this._overlay.classList.remove('ui-hidden');

    this._untrap = trapFocus(this._panel, () => this._isOpen);

    const blockKeys = (e: KeyboardEvent) => {
      if (!this._isOpen) return;
      if (e.code === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };
    window.addEventListener('keydown', blockKeys, { capture: true });
    this._unblockKeys = () => window.removeEventListener('keydown', blockKeys, { capture: true });

    focusFirstDescendant(this._panel);
  }

  close(): void {
    if (!this._isOpen) return;
    this._isOpen = false;
    this._overlay.classList.add('ui-hidden');

    this._untrap?.();
    this._untrap = null;

    this._unblockKeys?.();
    this._unblockKeys = null;
  }

  private render(): void {
    this._panel.innerHTML = '';

    const h = uiTitle('You Died');
    h.id = 'death-title';
    this._panel.setAttribute('aria-labelledby', h.id);

    const sub = uiSubtitle('Your run is over. Review stats, then restart.');
    sub.id = 'death-sub';
    this._panel.setAttribute('aria-describedby', sub.id);

    const body = uiBody();

    const stats = this._stats;
    if (stats) {
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
    }

    body.appendChild(
      uiButton({
        label: 'Restart',
        title: 'Restart the run',
        onClick: () => {
          this.options.onRestart();
          this.close();
        },
      }),
    );

    this._panel.appendChild(h);
    this._panel.appendChild(sub);
    this._panel.appendChild(body);
  }
}

function formatSeconds(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${mm}:${ss.toString().padStart(2, '0')}`;
}
