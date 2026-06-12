import type { AuthUser } from '../auth/AuthClient';
import type { Component } from './Component';
import {
  focusFirstDescendant,
  trapFocus,
  uiBody,
  uiButton,
  uiHint,
  uiInputRow,
  uiOverlay,
  uiPanel,
  uiRow,
  uiSection,
  uiSmallButton,
  uiSubtitle,
  uiTitle,
} from './components/UiKit';

export type RegisterGateOptions = {
  title?: string;
  subtitle?: string;

  auth: {
    isLoggedIn: () => boolean;
    getUser: () => AuthUser | null;
    register: (email: string, password: string) => Promise<AuthUser>;
  };

  onRegistered?: (user: AuthUser) => void;
};

export class RegisterGate implements Component
{
  private readonly _overlay: HTMLDivElement;
  private readonly _panel: HTMLDivElement;
  private _untrap: (() => void) | null = null;
  private _isOpen = false;
  private _unblockKeys: (() => void) | null = null;

  private _email = '';
  private _password = '';
  private _status = '';
  private _busy = false;

  readonly options: RegisterGateOptions;

  constructor(options: RegisterGateOptions) 
  {
    this.options = options;

    this._overlay = uiOverlay(() => 
    {
      // Don't close by background click; registration is required.
    });

    this._panel = uiPanel();
    this._panel.setAttribute('role', 'dialog');
    this._panel.setAttribute('aria-modal', 'true');
    this._panel.setAttribute('aria-label', 'Registration required');

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
        // Avoid opening the pause hub behind the gate.
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

    const titleText = this.options.title ?? 'Create an account';
    const subtitleText = this.options.subtitle ?? 'Registration is required before playing.';

    const h = uiTitle(titleText);
    h.id = 'register-title';
    this._panel.setAttribute('aria-labelledby', h.id);

    const sub = uiSubtitle(subtitleText);
    sub.id = 'register-sub';
    this._panel.setAttribute('aria-describedby', sub.id);

    const body = uiBody();

    const auth = this.options.auth;
    const loggedIn = auth.isLoggedIn();
    const user = auth.getUser();

    if (loggedIn && user) 
    {
      body.appendChild(uiSection('Account', [uiHint(`Signed in as ${user.email}.`)]));
      body.appendChild(
        uiButton({ label: 'Continue', title: 'Continue to the game', onClick: () => this.close() }),
      );
    }
    else 
    {
      const rows: HTMLElement[] = [];

      rows.push(
        uiInputRow(
          'Email',
          'email',
          this._email,
          (v) => 
          {
            this._email = v;
          },
          'email',
        ),
      );
      rows.push(
        uiInputRow(
          'Password',
          'password',
          this._password,
          (v) => 
          {
            this._password = v;
          },
          'new-password',
        ),
      );

      const regBtn = uiSmallButton({
        label: this._busy ? 'Working…' : 'Register',
        onClick: () => void this.handleRegister(),
      });
      regBtn.disabled = this._busy;
      rows.push(uiRow('Actions', regBtn));

      if (this._status) 
      {
        rows.push(uiHint(this._status));
      }

      body.appendChild(uiSection('Account', rows));
    }

    this._panel.appendChild(h);
    this._panel.appendChild(sub);
    this._panel.appendChild(body);
  }

  private validate(): string | null
  {
    const email = this._email.trim();
    if (!email) 
    {
      return 'Email is required.';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) 
    {
      return 'Enter a valid email address.';
    }
    if (!this._password) 
    {
      return 'Password is required.';
    }
    if (this._password.length < 8) 
    {
      return 'Password must be at least 8 characters.';
    }
    return null;
  }

  private async handleRegister(): Promise<void>
  {
    const auth = this.options.auth;

    const validationError = this.validate();
    if (validationError)
    {
      this._status = validationError;
      this.render();
      return;
    }

    this._busy = true;
    this._status = '';
    this.render();

    try
    {
      const user = await auth.register(this._email.trim(), this._password);
      this._password = '';
      this._status = `Registered. Signed in as ${user.email}.`;
      this.options.onRegistered?.(user);
      this.close();
    }
    catch (e) 
    {
      this._status = `Register failed: ${e instanceof Error ? e.message : 'unknown_error'}`;
    }
    finally 
    {
      this._busy = false;
      this.render();
    }
  }
}
