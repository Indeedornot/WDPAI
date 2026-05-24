import { HttpClient, HttpError } from '../http/HttpClient';

export type AuthUser = {
  id: number;
  email: string;
  role: string;
};

export type AuthSession = {
  user: AuthUser;
  expiresAt: string;
};

export type AuthErrorCode =
  | 'invalid_credentials'
  | 'banned'
  | 'invalid_email'
  | 'weak_password'
  | 'email_taken'
  | 'unauthorized'
  | 'forbidden'
  | 'server_error'
  | string;

type SessionOk = { ok: true; user: AuthUser; expiresAt: string };
type SessionErr = { ok: false; error: AuthErrorCode; message?: string };
type CsrfOk = { ok: true; csrfToken: string };
type CsrfErr = { ok: false; error: AuthErrorCode; message?: string };

type AuthResponse = SessionOk | SessionErr;
type CsrfResponse = CsrfOk | CsrfErr;

const REFRESH_LEAD_MS = 2 * 60 * 1000;
const REFRESH_RETRY_MS = 30 * 1000;

export class AuthClient {
  private readonly _http: HttpClient;
  private readonly _userKey = 'my-ts-app:auth:user';
  private readonly _expiresKey = 'my-ts-app:auth:expiresAt';
  private readonly _csrfKey = 'my-ts-app:auth:csrf';
  private _csrfToken: string | null = null;
  private _refreshTimer: number | null = null;
  private readonly _listeners = new Set<() => void>();

  constructor(baseUrl: string) {
    this._csrfToken = this.loadCsrfToken();
    this._http = new HttpClient(baseUrl, {
      credentials: 'include',
      headersProvider: () => this.authHeaders(),
    });

    window.addEventListener('focus', () => void this.refreshIfActive());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void this.refreshIfActive();
    });

    this.planAutoRefresh();
  }

  get user(): AuthUser | null {
    const raw = window.localStorage.getItem(this._userKey);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (!parsed || typeof parsed['email'] !== 'string' || typeof parsed['id'] !== 'number')
        return null;
      return { id: parsed['id'], email: parsed['email'], role: String(parsed['role'] ?? 'player') };
    } catch {
      return null;
    }
  }

  get sessionExpiresAt(): string | null {
    const raw = window.localStorage.getItem(this._expiresKey);
    return typeof raw === 'string' && raw.trim() !== '' ? raw : null;
  }

  get csrfToken(): string | null {
    return this._csrfToken;
  }

  isLoggedIn(): boolean {
    const expiresAt = this.sessionExpiresAt;
    const user = this.user;
    if (!user || !expiresAt) return false;
    const ms = Date.parse(expiresAt);
    if (Number.isNaN(ms)) return true;
    if (ms <= Date.now()) {
      this.clearSession();
      return false;
    }
    return true;
  }

  isExpiringSoon(thresholdMs = REFRESH_LEAD_MS): boolean {
    const expiresAt = this.sessionExpiresAt;
    if (!expiresAt) return false;
    const ms = Date.parse(expiresAt);
    if (Number.isNaN(ms)) return false;
    return ms - Date.now() <= thresholdMs;
  }

  authHeaders(): Record<string, string> {
    return this._csrfToken ? { 'X-CSRF-Token': this._csrfToken } : ({} as Record<string, string>);
  }

  subscribe(listener: () => void): () => void {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  async bootstrapSession(): Promise<void> {
    try {
      const body = await this._http.get.json<AuthResponse>('/auth/session');
      if (!body.ok) {
        this.clearSession();
        return;
      }
      this.saveSession(body.user, body.expiresAt);
      await this.ensureCsrfToken();
    } catch {
      this.clearSession();
    }
  }

  async ensureCsrfToken(): Promise<string> {
    if (this._csrfToken) return this._csrfToken;

    const body = await this._http.get.json<CsrfResponse>('/auth/csrf');
    if (!body.ok || body.csrfToken.trim() === '') {
      throw new Error('csrf_failed');
    }
    this.setCsrfToken(body.csrfToken);
    return body.csrfToken;
  }

  async register(email: string, password: string): Promise<AuthUser> {
    return this.authMutation('/auth/register', { email, password });
  }

  async login(email: string, password: string): Promise<AuthUser> {
    return this.authMutation('/auth/login', { email, password });
  }

  async refreshSession(): Promise<AuthUser> {
    await this.ensureCsrfToken();
    try {
      const body = await this._http.post.json<AuthResponse>('/auth/refresh', {});
      if (!body.ok) throw new Error(body.message ?? body.error);
      this.saveSession(body.user, body.expiresAt);
      return body.user;
    } catch (e) {
      if (e instanceof HttpError && (e.status === 401 || e.status === 403)) {
        this.clearSession();
      }
      throw e;
    }
  }

  async logout(): Promise<void> {
    void this._http.post.json('/auth/logout', {}).catch(() => {});
    this.clearSession();
  }

  async refreshIfActive(): Promise<void> {
    if (!this.isLoggedIn() || !this.isExpiringSoon()) {
      this.planAutoRefresh();
      return;
    }
    if (document.visibilityState !== 'visible' || !document.hasFocus()) {
      this.planAutoRefresh(REFRESH_RETRY_MS);
      return;
    }
    try {
      await this.refreshSession();
    } catch {
      this.planAutoRefresh(REFRESH_RETRY_MS);
    }
  }

  clearSession(): void {
    window.localStorage.removeItem(this._userKey);
    window.localStorage.removeItem(this._expiresKey);
    this.planAutoRefresh();
    this.notify();
  }

  clearCsrfToken(): void {
    this._csrfToken = null;
    window.localStorage.removeItem(this._csrfKey);
    this.notify();
  }

  private async authMutation(path: string, payload: Record<string, string>): Promise<AuthUser> {
    await this.ensureCsrfToken();
    try {
      const body = await this._http.post.json<AuthResponse>(path, payload);
      if (!body.ok) throw new Error(body.message ?? body.error);
      this.saveSession(body.user, body.expiresAt);
      return body.user;
    } catch (e) {
      if (e instanceof HttpError && (e.status === 401 || e.status === 403)) {
        this.clearSession();
      }
      throw e;
    }
  }

  private saveSession(user: AuthUser, expiresAt: string): void {
    window.localStorage.setItem(this._userKey, JSON.stringify(user));
    window.localStorage.setItem(this._expiresKey, expiresAt);
    this.planAutoRefresh();
    this.notify();
  }

  private setCsrfToken(token: string): void {
    this._csrfToken = token;
    window.localStorage.setItem(this._csrfKey, token);
    this.notify();
  }

  private loadCsrfToken(): string | null {
    const raw = window.localStorage.getItem(this._csrfKey);
    return raw && raw.trim() !== '' ? raw : null;
  }

  private planAutoRefresh(delayMs?: number): void {
    if (this._refreshTimer !== null) {
      window.clearTimeout(this._refreshTimer);
      this._refreshTimer = null;
    }
    const expiresAt = this.sessionExpiresAt;
    if (!expiresAt || !this.user) return;
    const expiresMs = Date.parse(expiresAt);
    if (Number.isNaN(expiresMs)) return;
    const nextDelay = delayMs ?? Math.max(0, expiresMs - Date.now() - REFRESH_LEAD_MS);
    this._refreshTimer = window.setTimeout(() => void this.refreshIfActive(), nextDelay);
  }

  private notify(): void {
    for (const listener of this._listeners) listener();
  }
}
