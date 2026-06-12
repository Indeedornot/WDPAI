import type { Component } from './Component';
import { UiKit } from './components/UiKit';

export type WelcomeScreenOptions = {
  title?: string;
  subtitle?: string;
  /** Return false to keep the welcome dialog open. */
  onStart: () => void | boolean;
};

export class WelcomeScreen implements Component
{
  private readonly _overlay: HTMLDivElement;
  private readonly _panel: HTMLDivElement;
  private _untrap: (() => void) | null = null;
  private _isOpen = false;
  private _unblockKeys: (() => void) | null = null;

  readonly options: WelcomeScreenOptions;

  constructor(options: WelcomeScreenOptions) 
  {
    this.options = options;

    this._overlay = UiKit.overlay(() => 
    {
      // Don’t close on background click; welcome is an explicit action.
    });

    this._panel = UiKit.panel();
    this._panel.classList.add('ui-panel--welcome');
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

  open(): void 
  {
    if (this._isOpen) 
    {
      return;
    }
    this._isOpen = true;
    this._overlay.classList.remove('ui-hidden');

    this._untrap = UiKit.trapFocus(this._panel, () => this._isOpen);

    const blockKeys = (e: KeyboardEvent) => 
    {
      if (!this._isOpen) 
      {
        return;
      }
      if (e.code === 'Escape') 
      {
        // Avoid opening the pause hub behind the welcome dialog.
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };
    window.addEventListener('keydown', blockKeys, { capture: true });
    this._unblockKeys = () => window.removeEventListener('keydown', blockKeys, { capture: true });

    UiKit.focusFirstDescendant(this._panel);
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

    const titleText = this.options.title ?? 'Arcade Survival — Demo';
    const subtitleText =
      this.options.subtitle ??
      'A small top-down survival shooter. Survive, level up, and keep your accuracy high.';

    const h = UiKit.title(titleText);
    h.id = 'welcome-title';
    this._panel.setAttribute('aria-labelledby', h.id);

    const sub = UiKit.subtitle(subtitleText);
    sub.id = 'welcome-sub';
    this._panel.setAttribute('aria-describedby', sub.id);

    const body = UiKit.body();

    const tutorial = document.createElement('div');
    tutorial.className = 'ui-tutorial';
    tutorial.innerHTML = `
      <div class="ui-tutorial-title">Quick start</div>
      <ol class="ui-tutorial-list">
        <li><span class="ui-kbd">WASD</span> move, <span class="ui-kbd">Arrow keys</span> aim, <span class="ui-kbd">Space</span> shoot.</li>
        <li>Press <span class="ui-kbd">Esc</span> for the hub: options, rebind controls, save/load, accessibility.</li>
        <li>If keys don’t seem to work, click <strong>Focus Game</strong> to move keyboard focus onto the canvas.</li>
      </ol>
      <div class="ui-hint">
        Why focus? Browsers route keyboard events to the element that has focus. The game canvas is focusable so you can
        explicitly “enter” gameplay with the keyboard and screen readers can announce the canvas region.
      </div>
    `.trim();

    const startBtn = UiKit.button({
      label: 'Start',
      title: 'Start the game',
      onClick: () => 
      {
        const res = this.options.onStart();
        if (res === false) 
        {
          return;
        }
        this.close();
      },
    });
    body.appendChild(startBtn);

    body.appendChild(
      UiKit.button({
        label: 'Focus Game',
        title: 'Move keyboard focus to the game canvas (keyboard controls)',
        onClick: () => 
        {
          const canvas = document.querySelector<HTMLCanvasElement>('#game');
          canvas?.focus();
        },
      }),
    );

    this._panel.appendChild(h);
    this._panel.appendChild(sub);
    this._panel.appendChild(tutorial);
    this._panel.appendChild(body);
  }
}
