import type { AuthClient } from '../auth/AuthClient';
import type { AuthUser } from '../auth/AuthClient';
import { HttpClient } from '../http/HttpClient';

export type AdminUser = {
  id: number;
  email: string;
  role: string;
  createdAt: string;
  lastLoginAt: string | null;
  bannedAt: string | null;
  bannedReason: string | null;
};

export type AdminSave = {
  slot: string;
  version: number;
  updatedAt: string;
};

export type AdminRun = {
  createdAt: string;
  timeSeconds: number;
  level: number;
  xp: number;
  kills: number;
  shotsFired: number;
  shotsHit: number;
};

export type AdminLoginAudit = {
  id: string;
  email: string;
  ip: string | null;
  attempted_at: string;
  reason: string;
};

type UsersOk = { ok: true; users: AdminUser[] };
type UsersErr = { ok: false; error: string; message?: string };
type UsersResponse = UsersOk | UsersErr;

type SavesOk = { ok: true; userId: number; saves: AdminSave[] };
type SavesErr = { ok: false; error: string; message?: string };
type SavesResponse = SavesOk | SavesErr;

type RunsOk = { ok: true; userId: number; runs: AdminRun[] };
type RunsErr = { ok: false; error: string; message?: string };
type RunsResponse = RunsOk | RunsErr;

type BanOk = { ok: true };
type BanErr = { ok: false; error: string; message?: string };
type BanResponse = BanOk | BanErr;

type AuditOk = { ok: true; entries: AdminLoginAudit[] };
type AuditErr = { ok: false; error: string; message?: string };
type AuditResponse = AuditOk | AuditErr;

export class AdminClient {
  private readonly _http: HttpClient;
  private readonly _auth: AuthClient;

  constructor(baseUrl: string, auth: AuthClient) {
    this._auth = auth;
    this._http = new HttpClient(baseUrl, {
      credentials: 'include',
      headersProvider: () => auth.authHeaders(),
    });
  }

  isAdminUser(): boolean {
    return !!this._auth.user && this._auth.user.role === 'admin';
  }

  currentUser(): AuthUser | null {
    return this._auth.user;
  }

  async listUsers(): Promise<AdminUser[]> {
    const body = await this._http.get.json<UsersResponse>('/admin/users');
    if (!body.ok) throw new Error(body.message ?? body.error);
    return body.users;
  }

  async listSaves(userId: number): Promise<AdminSave[]> {
    const body = await this._http.get.json<SavesResponse>('/admin/saves', { userId });
    if (!body.ok) throw new Error(body.message ?? body.error);
    return body.saves;
  }

  async listRuns(userId: number): Promise<AdminRun[]> {
    const body = await this._http.get.json<RunsResponse>('/admin/runs', { userId });
    if (!body.ok) throw new Error(body.message ?? body.error);
    return body.runs;
  }

  async setBan(userId: number, banned: boolean, reason?: string): Promise<void> {
    const body = await this._http.post.json<BanResponse>('/admin/ban', { userId, banned, reason });
    if (!body.ok) throw new Error(body.message ?? body.error);
  }

  async listLoginAudit(): Promise<AdminLoginAudit[]> {
    const body = await this._http.get.json<AuditResponse>('/admin/login-audit');
    if (!body.ok) throw new Error(body.message ?? body.error);
    return body.entries;
  }
}
