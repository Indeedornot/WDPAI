import type { Component } from './Component';
import {
  focusFirstDescendant,
  trapFocus,
  uiBody,
  uiButton,
  uiOverlay,
  uiPanel,
  uiSubtitle,
  uiTitle,
} from './components/UiKit';

export type TutorialOptions = {
  onClose: () => void;
};

export class Tutorial implements Component
{
  private readonly _overlay: HTMLDivElement;
  private readonly _panel: HTMLDivElement;
  private _untrap: (() => void) | null = null;
  private _isOpen = false;
  private _unblockKeys: (() => void) | null = null;

  readonly options: TutorialOptions;

  constructor(options: TutorialOptions)
  {
    this.options = options;

    this._overlay = uiOverlay(() =>
    {
      this.close();
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

  open(): void
  {
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
        this.close();
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

    this.options.onClose();
  }

  private render(): void
  {
    this._panel.innerHTML = '';

    const h = uiTitle('How to Play');
    h.id = 'tutorial-title';
    this._panel.setAttribute('aria-labelledby', h.id);

    const sub = uiSubtitle('Master the basics and survive as long as possible.');
    sub.id = 'tutorial-sub';
    this._panel.setAttribute('aria-describedby', sub.id);

    const body = uiBody();

    const content = document.createElement('div');
    content.style.cssText = 'display: grid; gap: 1rem; font-size: 0.9rem; line-height: 1.5;';

    const sections = [
      {
        title: 'Movement',
        text: 'Use WASD keys to move in any direction. Stay mobile to avoid enemy fire.',
      },
      {
        title: 'Aiming & Shooting',
        text: 'Use Arrow keys to aim. Press Space to shoot. Continuous fire eliminates enemies faster.',
      },
      {
        title: 'Enemies',
        text: 'Defeat enemies to gain XP and level up. Watch out for armored (purple) and fast (orange) variants.',
      },
      {
        title: 'Powerups',
        text: 'Collect powerups dropped by enemies. Double Shot (2x) and Sticky Projectiles (S) boost your damage.',
      },
      {
        title: 'Difficulty',
        text: 'Survive longer to face harder waves. Difficulty increases every 30 seconds. Can you reach level 10?',
      },
      {
        title: 'Pause & Menu',
        text: 'Press Escape to open the hub menu. You can pause, adjust controls, or save your progress.',
      },
    ];

    for (const section of sections)
    {
      const sectionEl = document.createElement('div');
      const titleEl = document.createElement('strong');
      titleEl.textContent = section.title;
      const textEl = document.createElement('p');
      textEl.textContent = section.text;
      textEl.style.margin = '0.25rem 0 0 0';
      sectionEl.appendChild(titleEl);
      sectionEl.appendChild(textEl);
      content.appendChild(sectionEl);
    }

    body.appendChild(content);

    body.appendChild(
      uiButton({
        label: 'Got it!',
        title: 'Close tutorial',
        onClick: () =>
        {
          this.close();
        },
      }),
    );

    this._panel.appendChild(h);
    this._panel.appendChild(sub);
    this._panel.appendChild(body);
  }
}
