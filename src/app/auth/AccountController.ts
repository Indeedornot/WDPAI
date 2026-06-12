import type { Announcer } from '../a11y/Announcer';
import type { AccountSectionAuth } from '../ui/components/AccountSection';
import { AuthClient, type AuthUser } from './AuthClient';

/**
 * Adapts AuthClient to the AccountSectionAuth / RegisterGate auth interfaces,
 * adding the screen-reader announcements that used to live as inline lambdas in
 * the app bootstrap. Self-configures from its injected dependencies.
 */
export class AccountController implements AccountSectionAuth
{
  private readonly _auth: AuthClient;
  private readonly _announcer: Announcer;

  constructor(auth: AuthClient, announcer: Announcer)
  {
    this._auth = auth;
    this._announcer = announcer;
  }

  getUser(): AuthUser | null
  {
    return this._auth.user;
  }

  isLoggedIn(): boolean
  {
    return this._auth.isLoggedIn();
  }

  getSessionExpiresAt(): string | null
  {
    return this._auth.sessionExpiresAt;
  }

  isExpiringSoon(): boolean
  {
    return this._auth.isExpiringSoon();
  }

  async register(email: string, password: string): Promise<AuthUser>
  {
    const user = await this._auth.register(email, password);
    this._announcer.announce(`Registered. Signed in as ${user.email}.`, 'polite');
    return user;
  }

  async login(email: string, password: string): Promise<void>
  {
    const user = await this._auth.login(email, password);
    this._announcer.announce(`Signed in as ${user.email}.`, 'polite');
  }

  async logout(): Promise<void>
  {
    await this._auth.logout();
    this._announcer.announce('Signed out.', 'polite');
  }

  async refreshSession(): Promise<AuthUser>
  {
    const user = await this._auth.refreshSession();
    this._announcer.announce(`Token refreshed for ${user.email}.`, 'polite');
    return user;
  }
}
