import type { ControlsConfig } from '../controls/ControlsConfig';
import { DEFAULT_CONTROLS } from '../controls/ControlsConfig';
import type { Component } from './Component';
import type { ScreenNavigator } from './ScreenNavigator';
import type { GameController } from '../game/GameController';
import type { ControlsController } from '../controls/ControlsController';
import type { AccessibilityController } from '../a11y/AccessibilityController';
import type { GameSaveController } from '../save/GameSaveController';
import { UiKit } from './components/UiKit';
import { AccountSection, type AccountSectionAuth } from './components/AccountSection';
import { AdminPanel, type AdminPanelAdmin } from './components/AdminPanel';

export type PauseMenuOptions = {
  game: GameController;
  controls: ControlsController;
  accessibility: AccessibilityController;
  save: GameSaveController;
  navigator: ScreenNavigator;

  auth?: AccountSectionAuth;
  admin?: AdminPanelAdmin;
};

type MenuView = 'main' | 'options' | 'admin';

type RebindTarget =
  | { kind: 'shootKey' }
  | { kind: 'movement'; dir: keyof ControlsConfig['movement'] }
  | { kind: 'aim'; dir: keyof ControlsConfig['aim'] };

export class PauseMenu implements Component
{
  private readonly _root: HTMLDivElement;
  private readonly _overlay: HTMLDivElement;
  private readonly _panel: HTMLDivElement;
  private _untrap: (() => void) | null = null;

  private _isOpen = false;
  private _view: MenuView = 'main';
  private _rebindTarget: RebindTarget | null = null;

  private readonly _accountSection: AccountSection | null;
  private readonly _adminPanel: AdminPanel | null;

  readonly options: PauseMenuOptions;

  constructor(options: PauseMenuOptions) 
  {
    this.options = options;

    this._accountSection = options.auth
      ? new AccountSection(options.auth, () => this.render())
      : null;

    this._adminPanel = options.admin
      ? new AdminPanel(
        options.admin,
        () => 
        {
          this._view = 'options';
          this.render();
        },
        () => this.render(),
      )
      : null;

    this._root = document.createElement('div');
    this._root.className = 'ui-root';

    const cog = UiKit.cogButton({
      label: '⚙',
      title: 'Menu (Esc)',
      ariaLabel: 'Open menu',
      onClick: () => this.toggle(),
    });

    this._overlay = UiKit.overlay(() => this.close());

    this._panel = UiKit.panel();
    this._panel.setAttribute('role', 'dialog');
    this._panel.setAttribute('aria-modal', 'true');
    this._panel.setAttribute('aria-label', 'Pause menu');

    this._overlay.appendChild(this._panel);
    const hudActions = document.querySelector<HTMLElement>('#hud-actions');
    if (hudActions) 
    {
      hudActions.appendChild(cog);
    }
    else 
    {
      this._root.appendChild(cog);
    }
    this._root.appendChild(this._overlay);

    window.addEventListener('keydown', (e) => 
    {
      if (this._rebindTarget) 
      {
        e.preventDefault();
        this.applyRebind(e.code);
        return;
      }
      if (e.code === 'Escape') 
      {
        e.preventDefault();
        this.toggle();
      }
    });

    this.render();
  }

  mount(parent: HTMLElement): void 
  {
    parent.appendChild(this._root);
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
    this.options.game.pause();
    this._overlay.classList.remove('ui-hidden');
    this._untrap = UiKit.trapFocus(this._panel, () => this._isOpen);
    this.render();
    UiKit.focusFirstDescendant(this._panel);
  }

  close(): void 
  {
    if (!this._isOpen) 
    {
      return;
    }
    this._isOpen = false;
    this._rebindTarget = null;
    this._view = 'main';
    this._adminPanel?.resetState();
    this.options.game.resume();
    this._overlay.classList.add('ui-hidden');
    this._untrap?.();
    this._untrap = null;
    this.render();
  }

  toggle(): void 
  {
    if (this._isOpen) 
    {
      this.close();
    }
    else 
    {
      this.open();
    }
  }

  private render(): void 
  {
    const controls = this.options.controls.current;
    const title = this._view === 'main' ? 'Paused' : this._view === 'options' ? 'Options' : 'Admin';
    const subtitle = this._rebindTarget ? 'Press a key…' : '';

    this._panel.innerHTML = '';

    const h = UiKit.title(title);
    h.id = 'pause-title';
    this._panel.setAttribute('aria-labelledby', h.id);

    const sub = UiKit.subtitle(subtitle);
    sub.id = 'pause-subtitle';
    if (subtitle) 
    {
      this._panel.setAttribute('aria-describedby', sub.id);
    }
    else 
    {
      this._panel.removeAttribute('aria-describedby');
    }

    const body = UiKit.body();

    if (this._view === 'main') 
    {
      body.appendChild(UiKit.button({ label: 'Resume', onClick: () => this.close() }));

      body.appendChild(
        UiKit.button({ label: 'Save Now', onClick: () => void this.options.save.saveNow() }),
      );
      body.appendChild(
        UiKit.button({ label: 'Load Last Save', onClick: () => void this.options.save.loadNow() }),
      );

      if (this.options.auth?.isLoggedIn()) 
      {
        const busy = this._accountSection?.isBusy ?? false;
        const logoutBtn = UiKit.button({
          label: busy ? 'Working…' : 'Log out',
          onClick: () => void this._accountSection?.triggerLogout(),
        });
        logoutBtn.disabled = busy;
        body.appendChild(logoutBtn);
      }

      body.appendChild(
        UiKit.button({
          label: 'Options',
          onClick: () =>
          {
            this._view = 'options';
            this._rebindTarget = null;
            this.render();
          },
        }),
      );

      body.appendChild(
        UiKit.button({
          label: 'Settings',
          onClick: () =>
          {
            this.close();
            this.options.navigator.openSettings();
          },
        }),
      );

      body.appendChild(
        UiKit.button({
          label: 'How to Play',
          onClick: () =>
          {
            this.close();
            this.options.navigator.openTutorial();
          },
        }),
      );
    }
    else if (this._view === 'options') 
    {
      body.appendChild(
        UiKit.section('Movement (WASD default)', this.bindingsRows('movement', controls.movement)),
      );
      body.appendChild(
        UiKit.section('Aim (Arrow keys default)', this.bindingsRows('aim', controls.aim)),
      );
      body.appendChild(
        UiKit.section('Shoot', [this.rebindRow('shootKey', 'Shoot', controls.shootKey)]),
      );

      body.appendChild(
        UiKit.button({
          label: 'Reset Controls',
          onClick: () => 
          {
            this.options.controls.set(structuredClone(DEFAULT_CONTROLS));
            this._rebindTarget = null;
            this.render();
          },
        }),
      );

      const accessibleEnabled = this.options.accessibility.enabled;
      body.appendChild(
        UiKit.section('Accessibility', [
          UiKit.row(
            'Accessible Mode',
            UiKit.pill(accessibleEnabled ? 'On' : 'Off'),
            UiKit.smallButton({
              label: accessibleEnabled ? 'Disable' : 'Enable',
              onClick: () =>
              {
                this.options.accessibility.setEnabled(!accessibleEnabled);
                this.render();
              },
            }),
          ),
        ]),
      );

      if (this._accountSection) 
      {
        body.appendChild(this._accountSection.render());
      }

      if (this._adminPanel && this.options.admin?.isAdmin()) 
      {
        body.appendChild(
          UiKit.button({
            label: 'Admin Panel',
            onClick: () => 
            {
              this._view = 'admin';
              this._rebindTarget = null;
              void this._adminPanel!.loadUsers();
              this.render();
            },
          }),
        );
      }

      body.appendChild(
        UiKit.button({
          label: 'Back',
          onClick: () => 
          {
            this._view = 'main';
            this._rebindTarget = null;
            this.render();
          },
        }),
      );
    }
    else 
    {
      body.appendChild(this._adminPanel!.render());
    }

    this._panel.appendChild(h);
    if (subtitle) 
    {
      this._panel.appendChild(sub);
    }

    if (this._view === 'options') 
    {
      const scroll = UiKit.el('div', { className: 'ui-scroll' });
      scroll.appendChild(body);
      this._panel.appendChild(scroll);
    }
    else 
    {
      this._panel.appendChild(body);
    }
  }

  private bindingsRows(kind: 'movement' | 'aim', map: Record<string, string>): HTMLElement[] 
  {
    return ['Up', 'Down', 'Left', 'Right'].map((dir) => this.rebindRow(kind, dir, map[dir] ?? ''));
  }

  private rebindRow(
    kind: 'movement' | 'aim' | 'shootKey',
    label: string,
    code: string,
  ): HTMLElement 
  {
    const pill = UiKit.pill(code || 'Unbound');
    const btn = UiKit.smallButton({
      label: this._rebindTarget ? 'Waiting…' : 'Rebind',
      onClick: () => 
      {
        if (kind === 'shootKey') 
        {
          this._rebindTarget = { kind: 'shootKey' };
        }
        else 
        {
          this._rebindTarget = { kind, dir: label as keyof ControlsConfig[typeof kind] };
        }
        this.render();
      },
    });
    btn.disabled = this._rebindTarget !== null;
    return UiKit.row(label, pill, btn);
  }

  private applyRebind(code: string): void 
  {
    const t = this._rebindTarget;
    if (!t) 
    {
      return;
    }

    const current = this.options.controls.current;
    let next: ControlsConfig;

    if (t.kind === 'shootKey') 
    {
      next = { ...current, shootKey: code };
    }
    else if (t.kind === 'movement') 
    {
      next = { ...current, movement: { ...current.movement, [t.dir]: code } };
    }
    else 
    {
      next = { ...current, aim: { ...current.aim, [t.dir]: code } };
    }

    this.options.controls.set(next);
    this._rebindTarget = null;
    this.render();
  }
}
