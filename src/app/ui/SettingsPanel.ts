import type { Component } from './Component';
import { UiKit } from './components/UiKit';

export type SettingsPanelOptions = {
  onClose: () => void;
  onDifficultyChange?: (difficulty: 'easy' | 'normal' | 'hard') => void;
  onEffectsToggle?: (enabled: boolean) => void;
};

export class SettingsPanel implements Component
{
  private readonly _overlay: HTMLDivElement;
  private readonly _panel: HTMLDivElement;
  private _untrap: (() => void) | null = null;
  private _isOpen = false;
  private _unblockKeys: (() => void) | null = null;

  private _difficulty: 'easy' | 'normal' | 'hard' = 'normal';
  private _effectsEnabled = true;

  readonly options: SettingsPanelOptions;

  constructor(options: SettingsPanelOptions)
  {
    this.options = options;

    this._overlay = UiKit.overlay(() =>
    {
      this.close();
    });

    this._panel = UiKit.panel();
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
        e.preventDefault();
        e.stopImmediatePropagation();
        this.close();
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

    this.options.onClose();
  }

  private render(): void
  {
    this._panel.innerHTML = '';

    const h = UiKit.title('Settings');
    h.id = 'settings-title';
    this._panel.setAttribute('aria-labelledby', h.id);

    const body = UiKit.body();

    const difficultyOptions = [
      {
        label: 'Easy',
        value: 'easy' as const,
        selected: this._difficulty === 'easy',
      },
      {
        label: 'Normal',
        value: 'normal' as const,
        selected: this._difficulty === 'normal',
      },
      {
        label: 'Hard',
        value: 'hard' as const,
        selected: this._difficulty === 'hard',
      },
    ];

    const difficultySection: HTMLElement[] = [];
    for (const option of difficultyOptions)
    {
      const label = UiKit.el('label', { text: option.label });
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'difficulty';
      input.value = option.value;
      input.checked = option.selected;
      input.addEventListener('change', () =>
      {
        this._difficulty = option.value;
        this.options.onDifficultyChange?.(option.value);
        this.render();
      });
      const wrapper = UiKit.el('div');
      wrapper.appendChild(input);
      wrapper.appendChild(label);
      difficultySection.push(wrapper);
    }
    body.appendChild(UiKit.section('Difficulty', difficultySection));

    const effectsLabel = UiKit.el('label', { text: 'Visual Effects' });
    const effectsInput = document.createElement('input');
    effectsInput.type = 'checkbox';
    effectsInput.checked = this._effectsEnabled;
    effectsInput.addEventListener('change', () =>
    {
      this._effectsEnabled = effectsInput.checked;
      this.options.onEffectsToggle?.(this._effectsEnabled);
      this.render();
    });
    const effectsWrapper = UiKit.el('div');
    effectsWrapper.appendChild(effectsInput);
    effectsWrapper.appendChild(effectsLabel);
    body.appendChild(UiKit.section('Display', [effectsWrapper]));

    body.appendChild(
      UiKit.button({
        label: 'Close',
        title: 'Close settings',
        onClick: () =>
        {
          this.close();
        },
      }),
    );

    this._panel.appendChild(h);
    this._panel.appendChild(body);
  }
}
