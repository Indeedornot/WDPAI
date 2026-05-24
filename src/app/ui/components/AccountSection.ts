import type { AuthUser } from '../../auth/AuthClient';
import { uiHint, uiInputRow, uiPill, uiRow, uiSection, uiSmallButton } from './UiKit';

export type AccountSectionAuth = {
  getUser: () => AuthUser | null;
  isLoggedIn: () => boolean;
  getSessionExpiresAt: () => string | null;
  isExpiringSoon: () => boolean;
  register: (email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  refreshSession: () => Promise<AuthUser>;
  logout: () => Promise<void>;
};

export class AccountSection {
  private readonly _auth: AccountSectionAuth;
  private readonly _onNeedRender: () => void;
  private _email = '';
  private _password = '';
  private _status = '';
  private _busy = false;

  constructor(auth: AccountSectionAuth, onNeedRender: () => void) {
    this._auth = auth;
    this._onNeedRender = onNeedRender;
  }

  get isBusy(): boolean {
    return this._busy;
  }

  render(): HTMLDivElement {
    const rows: HTMLElement[] = [];
    const user = this._auth.getUser();

    if (this._auth.isLoggedIn() && user) {
      const expiresAt = this._auth.getSessionExpiresAt();

      const refreshBtn = uiSmallButton({
        label: this._busy ? 'Working…' : 'Refresh token',
        onClick: () => void this._handleRefreshSession(),
      });
      refreshBtn.disabled = this._busy;

      const logoutBtn = uiSmallButton({
        label: this._busy ? 'Working…' : 'Log out',
        onClick: () => void this._handleLogout(),
      });
      logoutBtn.disabled = this._busy;

      const pills: HTMLElement[] = [
        uiPill(user.email),
        uiPill(user.role),
        ...(expiresAt ? [uiPill(`Expires ${new Date(expiresAt).toLocaleString()}`)] : []),
        ...(this._auth.isExpiringSoon() ? [uiPill('Refresh recommended')] : []),
        refreshBtn,
        logoutBtn,
      ];
      rows.push(uiRow('Signed in', ...pills));
    } else {
      rows.push(
        uiInputRow(
          'Email',
          'email',
          this._email,
          (v) => {
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
          (v) => {
            this._password = v;
          },
          'current-password',
        ),
      );

      const loginBtn = uiSmallButton({
        label: this._busy ? 'Working…' : 'Log in',
        onClick: () => void this._handleLogin(),
      });
      loginBtn.disabled = this._busy;

      const regBtn = uiSmallButton({
        label: this._busy ? 'Working…' : 'Register',
        onClick: () => void this._handleRegister(),
      });
      regBtn.disabled = this._busy;

      rows.push(uiRow('Actions', loginBtn, regBtn));
    }

    if (this._status) rows.push(uiHint(this._status));

    return uiSection('Account', rows);
  }

  async triggerLogout(): Promise<void> {
    return this._handleLogout();
  }

  private async _runBusy(errorLabel: string, fn: () => Promise<void>): Promise<void> {
    this._busy = true;
    this._status = '';
    this._onNeedRender();
    try {
      await fn();
    } catch (e) {
      this._status = `${errorLabel}: ${e instanceof Error ? e.message : 'unknown_error'}`;
    } finally {
      this._busy = false;
      this._onNeedRender();
    }
  }

  private async _handleRegister(): Promise<void> {
    await this._runBusy('Register failed', async () => {
      await this._auth.register(this._email.trim(), this._password);
      this._password = '';
      this._status = 'Registered and signed in.';
    });
  }

  private async _handleLogin(): Promise<void> {
    await this._runBusy('Login failed', async () => {
      await this._auth.login(this._email.trim(), this._password);
      this._password = '';
      this._status = 'Signed in.';
    });
  }

  private async _handleLogout(): Promise<void> {
    await this._runBusy('Logout failed', async () => {
      await this._auth.logout();
      this._status = 'Signed out.';
    });
  }

  private async _handleRefreshSession(): Promise<void> {
    await this._runBusy('Refresh failed', async () => {
      const user = await this._auth.refreshSession();
      this._status = `Token refreshed for ${user.email}.`;
    });
  }
}
