import type { AuthClient } from '../auth/AuthClient'
import type { AuthUser } from '../auth/AuthClient'

export type AdminUser = {
  id: number
  email: string
  role: string
  createdAt: string
  lastLoginAt: string | null
  bannedAt: string | null
  bannedReason: string | null
}

export type AdminSave = {
  slot: string
  version: number
  updatedAt: string
}

export type AdminRun = {
  createdAt: string
  timeSeconds: number
  level: number
  xp: number
  kills: number
  shotsFired: number
  shotsHit: number
}

export type AdminLoginAudit = {
  id: string
  email: string
  ip: string | null
  attempted_at: string
  reason: string
}

type UsersOk = { ok: true; users: AdminUser[] }
type UsersErr = { ok: false; error: string; message?: string }
type UsersResponse = UsersOk | UsersErr

type SavesOk = { ok: true; userId: number; saves: AdminSave[] }
type SavesErr = { ok: false; error: string; message?: string }
type SavesResponse = SavesOk | SavesErr

type RunsOk = { ok: true; userId: number; runs: AdminRun[] }
type RunsErr = { ok: false; error: string; message?: string }
type RunsResponse = RunsOk | RunsErr

type BanOk = { ok: true }
type BanErr = { ok: false; error: string; message?: string }
type BanResponse = BanOk | BanErr

type AuditOk = { ok: true; entries: AdminLoginAudit[] }
type AuditErr = { ok: false; error: string; message?: string }
type AuditResponse = AuditOk | AuditErr

export class AdminClient {
  private readonly _baseUrl: string
  private readonly _auth: AuthClient

  constructor(baseUrl: string, auth: AuthClient) {
    this._baseUrl = baseUrl.replace(/\/$/, '')
    this._auth = auth
  }

  isAdminUser(): boolean {
    const u = this._auth.user
    return !!u && u.role === 'admin'
  }

  currentUser(): AuthUser | null {
    return this._auth.user
  }

  async listUsers(): Promise<AdminUser[]> {
    const res = await fetch(this.url('/admin/users'), {
      method: 'GET',
      credentials: 'include',
      headers: {
        ...this._auth.authHeaders(),
      },
    })

    const body = (await res.json()) as UsersResponse
    if (!res.ok || !body || body.ok !== true) {
      const msg = body && body.ok === false ? body.message ?? body.error : undefined
      throw new Error(msg ?? `admin_users_failed_${res.status}`)
    }

    return body.users
  }

  async listSaves(userId: number): Promise<AdminSave[]> {
    const res = await fetch(this.url(`/admin/saves?userId=${encodeURIComponent(String(userId))}`), {
      method: 'GET',
      credentials: 'include',
      headers: {
        ...this._auth.authHeaders(),
      },
    })

    const body = (await res.json()) as SavesResponse
    if (!res.ok || !body || body.ok !== true) {
      const msg = body && body.ok === false ? body.message ?? body.error : undefined
      throw new Error(msg ?? `admin_saves_failed_${res.status}`)
    }

    return body.saves
  }

  async listRuns(userId: number): Promise<AdminRun[]> {
    const res = await fetch(this.url(`/admin/runs?userId=${encodeURIComponent(String(userId))}`), {
      method: 'GET',
      credentials: 'include',
      headers: {
        ...this._auth.authHeaders(),
      },
    })

    const body = (await res.json()) as RunsResponse
    if (!res.ok || !body || body.ok !== true) {
      const msg = body && body.ok === false ? body.message ?? body.error : undefined
      throw new Error(msg ?? `admin_runs_failed_${res.status}`)
    }

    return body.runs
  }

  async setBan(userId: number, banned: boolean, reason?: string): Promise<void> {
    const res = await fetch(this.url('/admin/ban'), {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...this._auth.authHeaders(),
      },
      body: JSON.stringify({ userId, banned, reason }),
    })

    const body = (await res.json()) as BanResponse
    if (!res.ok || !body || body.ok !== true) {
      const msg = body && body.ok === false ? body.message ?? body.error : undefined
      throw new Error(msg ?? `admin_ban_failed_${res.status}`)
    }
  }

  async listLoginAudit(): Promise<AdminLoginAudit[]> {
    const res = await fetch(this.url('/admin/login-audit'), {
      method: 'GET',
      credentials: 'include',
      headers: {
        ...this._auth.authHeaders(),
      },
    })

    const body = (await res.json()) as AuditResponse
    if (!res.ok || !body || body.ok !== true) {
      const msg = body && body.ok === false ? body.message ?? body.error : undefined
      throw new Error(msg ?? `admin_audit_failed_${res.status}`)
    }

    return body.entries
  }

  private url(path: string): string {
    return `${this._baseUrl}${path}`
  }
}
