import type { ControlsConfig } from '../controls/ControlsConfig';
import { DEFAULT_CONTROLS } from '../controls/ControlsConfig';
import {
  el,
  focusFirstDescendant,
  trapFocus,
  uiBody,
  uiButton,
  uiCogButton,
  uiOverlay,
  uiPanel,
  uiPill,
  uiRow,
  uiSection,
  uiSmallButton,
  uiSubtitle,
  uiTitle,
} from './components/UiKit';
import { AccountSection, type AccountSectionAuth } from './components/AccountSection';
import { AdminPanel, type AdminPanelAdmin } from './components/AdminPanel';

export type PauseMenuOptions = {
  onResume: () => void;
  onPause: () => void;
  getControls: () => ControlsConfig;
  setControls: (next: ControlsConfig) => void;

  getAccessibleMode?: () => boolean;
  setAccessibleMode?: (enabled: boolean) => void;

  onSaveNow?: () => void | Promise<void>;
  onLoadNow?: () => void | Promise<void>;

  auth?: AccountSectionAuth;
  admin?: AdminPanelAdmin;
};

type MenuView = 'main' | 'options' | 'admin';

type RebindTarget =
  | { kind: 'shootKey' }
  | { kind: 'movement'; dir: keyof ControlsConfig['movement'] }
  | { kind: 'aim'; dir: keyof ControlsConfig['aim'] };

export class PauseMenu {
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

  constructor(options: PauseMenuOptions) {
    this.options = options;

    this._accountSection = options.auth
      ? new AccountSection(options.auth, () => this.render())
      : null;

    this._adminPanel = options.admin
      ? new AdminPanel(
          options.admin,
          () => {
            this._view = 'options';
            this.render();
          },
          () => this.render(),
        )
      : null;

    this._root = document.createElement('div');
    this._root.className = 'ui-root';

    const cog = uiCogButton({
      label: '⚙',
      title: 'Menu (Esc)',
      ariaLabel: 'Open menu',
      onClick: () => this.toggle(),
    });

    this._overlay = uiOverlay(() => this.close());

    this._panel = uiPanel();
    this._panel.setAttribute('role', 'dialog');
    this._panel.setAttribute('aria-modal', 'true');
    this._panel.setAttribute('aria-label', 'Pause menu');

    this._overlay.appendChild(this._panel);
    const hudActions = document.querySelector<HTMLElement>('#hud-actions');
    if (hudActions) hudActions.appendChild(cog);
    else this._root.appendChild(cog);
    this._root.appendChild(this._overlay);

    window.addEventListener('keydown', (e) => {
      if (this._rebindTarget) {
        e.preventDefault();
        this.applyRebind(e.code);
        return;
      }
      if (e.code === 'Escape') {
        e.preventDefault();
        this.toggle();
      }
    });

    this.render();
  }

  mount(parent: HTMLElement): void {
    parent.appendChild(this._root);
  }

  refresh(): void {
    this.render();
  }

  open(): void {
    if (this._isOpen) return;
    this._isOpen = true;
    this.options.onPause();
    this._overlay.classList.remove('ui-hidden');
    this._untrap = trapFocus(this._panel, () => this._isOpen);
    this.render();
    focusFirstDescendant(this._panel);
  }

  close(): void {
    if (!this._isOpen) return;
    this._isOpen = false;
    this._rebindTarget = null;
    this._view = 'main';
    this._adminPanel?.resetState();
    this.options.onResume();
    this._overlay.classList.add('ui-hidden');
    this._untrap?.();
    this._untrap = null;
    this.render();
  }

  toggle(): void {
    if (this._isOpen) this.close();
    else this.open();
  }

  private render(): void {
    const controls = this.options.getControls();
    const title = this._view === 'main' ? 'Paused' : this._view === 'options' ? 'Options' : 'Admin';
    const subtitle = this._rebindTarget ? 'Press a key…' : '';

    this._panel.innerHTML = '';

    const h = uiTitle(title);
    h.id = 'pause-title';
    this._panel.setAttribute('aria-labelledby', h.id);

    const sub = uiSubtitle(subtitle);
    sub.id = 'pause-subtitle';
    if (subtitle) this._panel.setAttribute('aria-describedby', sub.id);
    else this._panel.removeAttribute('aria-describedby');

    const body = uiBody();

    if (this._view === 'main') {
      body.appendChild(uiButton({ label: 'Resume', onClick: () => this.close() }));

      if (this.options.onSaveNow) {
        body.appendChild(
          uiButton({ label: 'Save Now', onClick: () => void this.options.onSaveNow?.() }),
        );
      }
      if (this.options.onLoadNow) {
        body.appendChild(
          uiButton({ label: 'Load Last Save', onClick: () => void this.options.onLoadNow?.() }),
        );
      }

      if (this.options.auth?.isLoggedIn()) {
        const busy = this._accountSection?.isBusy ?? false;
        const logoutBtn = uiButton({
          label: busy ? 'Working…' : 'Log out',
          onClick: () => void this._accountSection?.triggerLogout(),
        });
        logoutBtn.disabled = busy;
        body.appendChild(logoutBtn);
      }

      body.appendChild(
        uiButton({
          label: 'Options',
          onClick: () => {
            this._view = 'options';
            this._rebindTarget = null;
            this.render();
          },
        }),
      );
    } else if (this._view === 'options') {
      body.appendChild(
        uiSection('Movement (WASD default)', this.bindingsRows('movement', controls.movement)),
      );
      body.appendChild(
        uiSection('Aim (Arrow keys default)', this.bindingsRows('aim', controls.aim)),
      );
      body.appendChild(
        uiSection('Shoot', [this.rebindRow('shootKey', 'Shoot', controls.shootKey)]),
      );

      body.appendChild(
        uiButton({
          label: 'Reset Controls',
          onClick: () => {
            this.options.setControls(structuredClone(DEFAULT_CONTROLS));
            this._rebindTarget = null;
            this.render();
          },
        }),
      );

      if (this.options.getAccessibleMode && this.options.setAccessibleMode) {
        const enabled = this.options.getAccessibleMode();
        body.appendChild(
          uiSection('Accessibility', [
            uiRow(
              'Accessible Mode',
              uiPill(enabled ? 'On' : 'Off'),
              uiSmallButton({
                label: enabled ? 'Disable' : 'Enable',
                onClick: () => {
                  this.options.setAccessibleMode?.(!enabled);
                  this.render();
                },
              }),
            ),
          ]),
        );
      }

      if (this._accountSection) {
        body.appendChild(this._accountSection.render());
      }

      if (this._adminPanel && this.options.admin?.isAdmin()) {
        body.appendChild(
          uiButton({
            label: 'Admin Panel',
            onClick: () => {
              this._view = 'admin';
              this._rebindTarget = null;
              void this._adminPanel!.loadUsers();
              this.render();
            },
          }),
        );
      }

      body.appendChild(
        uiButton({
          label: 'Back',
          onClick: () => {
            this._view = 'main';
            this._rebindTarget = null;
            this.render();
          },
        }),
      );
    } else {
      body.appendChild(this._adminPanel!.render());
    }

    this._panel.appendChild(h);
    if (subtitle) this._panel.appendChild(sub);

    if (this._view === 'options') {
      const scroll = el('div', { className: 'ui-scroll' });
      scroll.appendChild(body);
      this._panel.appendChild(scroll);
    } else {
      this._panel.appendChild(body);
    }
  }

  private bindingsRows(kind: 'movement' | 'aim', map: Record<string, string>): HTMLElement[] {
    return ['Up', 'Down', 'Left', 'Right'].map((dir) => this.rebindRow(kind, dir, map[dir] ?? ''));
  }

  private rebindRow(
    kind: 'movement' | 'aim' | 'shootKey',
    label: string,
    code: string,
  ): HTMLElement {
    const pill = uiPill(code || 'Unbound');
    const btn = uiSmallButton({
      label: this._rebindTarget ? 'Waiting…' : 'Rebind',
      onClick: () => {
        if (kind === 'shootKey') this._rebindTarget = { kind: 'shootKey' };
        else this._rebindTarget = { kind, dir: label as keyof ControlsConfig[typeof kind] };
        this.render();
      },
    });
    btn.disabled = this._rebindTarget !== null;
    return uiRow(label, pill, btn);
  }

  private applyRebind(code: string): void {
    const t = this._rebindTarget;
    if (!t) return;

    const current = this.options.getControls();
    let next: ControlsConfig;

    if (t.kind === 'shootKey') {
      next = { ...current, shootKey: code };
    } else if (t.kind === 'movement') {
      next = { ...current, movement: { ...current.movement, [t.dir]: code } };
    } else {
      next = { ...current, aim: { ...current.aim, [t.dir]: code } };
    }

    this.options.setControls(next);
    this._rebindTarget = null;
    this.render();
  }
}
