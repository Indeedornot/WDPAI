import type { Scene } from '../../engine/core/Scene';
import { Vec2 } from '../../engine/math/Vec2';
import { Health } from '../../engine/components/Health';

export type AccessibleOverlayOptions = {
  getPaused: () => boolean;
};

type EntitySnapshot = {
  name: string;
  tag: string;
  hp?: { current: number; max: number };
  position: { x: number; y: number };
  distanceToPlayer?: number;
};

export class AccessibleOverlay 
{
  private readonly _root: HTMLDivElement;
  private readonly _panel: HTMLDivElement;
  private readonly _title: HTMLDivElement;
  private readonly _meta: HTMLDivElement;
  private readonly _list: HTMLOListElement;

  private _enabled = false;
  private _timer: number | null = null;

  readonly scene: Scene;
  readonly options: AccessibleOverlayOptions;

  constructor(scene: Scene, options: AccessibleOverlayOptions) 
  {
    this.scene = scene;
    this.options = options;

    this._root = document.createElement('div');
    this._root.className = 'a11y-root ui-hidden';

    this._panel = document.createElement('div');
    this._panel.className = 'a11y-panel';
    this._panel.setAttribute('role', 'region');
    this._panel.setAttribute('aria-label', 'Accessible game status');

    this._title = document.createElement('div');
    this._title.className = 'ui-title';
    this._title.textContent = 'Accessible Mode';

    this._meta = document.createElement('div');
    this._meta.className = 'ui-subtitle';

    this._list = document.createElement('ol');
    this._list.className = 'a11y-list';

    this._panel.appendChild(this._title);
    this._panel.appendChild(this._meta);
    this._panel.appendChild(this._list);
    this._root.appendChild(this._panel);
  }

  mount(parent: HTMLElement): void 
  {
    parent.appendChild(this._root);
  }

  setEnabled(enabled: boolean): void 
  {
    if (this._enabled === enabled) 
    {
      return;
    }
    this._enabled = enabled;

    if (enabled) 
    {
      this._root.classList.remove('ui-hidden');
      this.start();
    }
    else 
    {
      this._root.classList.add('ui-hidden');
      this.stop();
    }
  }

  get enabled(): boolean 
  {
    return this._enabled;
  }

  private start(): void 
  {
    if (this._timer != null) 
    {
      return;
    }
    this.render();
    this._timer = window.setInterval(() => this.render(), 350);
  }

  private stop(): void 
  {
    if (this._timer == null) 
    {
      return;
    }
    window.clearInterval(this._timer);
    this._timer = null;
  }

  private render(): void 
  {
    const objects = this.scene.getGameObjects();

    let player = null;
    for (const o of objects) 
    {
      if (o.tag === 'Player') 
      {
        player = o; break; 
      } 
    }
    const playerPos = player?.transform.position ?? new Vec2(0, 0);

    const rows: EntitySnapshot[] = [];

    for (const o of objects) 
    {
      if (!o.active) 
      {
        continue;
      }

      const h = o.getComponent(Health);
      const pos = o.transform.position;

      const row: EntitySnapshot = {
        name: o.name,
        tag: o.tag,
        position: { x: pos.x, y: pos.y },
      };

      if (h) 
      {
        row.hp = { current: h.current, max: h.max };
      }

      if (o !== player) 
      {
        const dx = pos.x - playerPos.x;
        const dy = pos.y - playerPos.y;
        row.distanceToPlayer = Math.sqrt(dx * dx + dy * dy);
      }

      rows.push(row);
    }

    const enemies = rows.filter((r) => r.tag === 'Enemy');
    const playerRow = rows.find((r) => r.tag === 'Player');

    const hpText = playerRow?.hp
      ? `${Math.round(playerRow.hp.current)}/${Math.round(playerRow.hp.max)}`
      : 'n/a';
    this._meta.textContent = `Status: ${this.options.getPaused() ? 'Paused' : 'Running'} · Player HP: ${hpText} · Enemies: ${enemies.length}`;

    enemies.sort((a, b) => (a.distanceToPlayer ?? 0) - (b.distanceToPlayer ?? 0));

    const top = [playerRow, ...enemies.slice(0, 5)].filter(Boolean) as EntitySnapshot[];

    this._list.innerHTML = '';
    for (const r of top) 
    {
      const li = document.createElement('li');
      const hp = r.hp ? `HP ${Math.round(r.hp.current)}/${Math.round(r.hp.max)}` : '';
      const dist =
        r.distanceToPlayer != null ? `· ${Math.round(r.distanceToPlayer)} units away` : '';
      li.textContent = `${r.tag || 'Untagged'}: ${r.name}${hp ? ' · ' + hp : ''} ${dist}`.trim();
      this._list.appendChild(li);
    }
  }
}
