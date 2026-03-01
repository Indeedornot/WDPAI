export type AuthUser = {
  id: number
  email: string
  role: string
}

export type AuthErrorCode =
  | 'invalid_credentials'
  | 'banned'
  | 'invalid_email'
  | 'weak_password'
  | 'email_taken'
  | 'unauthorized'
  | 'forbidden'
  | 'server_error'
  | string

type AuthOk = {
  ok: true
  token: string
  user: AuthUser
}

type AuthErr = {
  ok: false
  error: AuthErrorCode
  message?: string
}

type AuthResponse = AuthOk | AuthErr

export class AuthClient {
  private readonly _baseUrl: string
  private readonly _tokenKey = 'my-ts-app:auth:token'
  private readonly _userKey = 'my-ts-app:auth:user'

  constructor(baseUrl: string) {
    this._baseUrl = baseUrl.replace(/\/$/, '')
  }

  get token(): string | null {
    const t = window.localStorage.getItem(this._tokenKey)
    return t && t.trim() ? t : null
  }

  get user(): AuthUser | null {
    const raw = window.localStorage.getItem(this._userKey)
    if (!raw) return null
    try {
      const parsed = JSON.parse(raw) as any
      if (!parsed || typeof parsed.email !== 'string' || typeof parsed.id !== 'number') return null
      return { id: parsed.id, email: parsed.email, role: String(parsed.role ?? 'player') }
    } catch {
      return null
    }
  }

  isLoggedIn(): boolean {
    return this.token != null
  }

  authHeaders(): Record<string, string> {
    const t = this.token
    if (!t) return {}
    return { Authorization: `Bearer ${t}` }
  }

  clearLocal(): void {
    window.localStorage.removeItem(this._tokenKey)
    window.localStorage.removeItem(this._userKey)
  }

  private saveLocal(token: string, user: AuthUser): void {
    window.localStorage.setItem(this._tokenKey, token)
    window.localStorage.setItem(this._userKey, JSON.stringify(user))
  }

  async register(email: string, password: string): Promise<AuthUser> {
    const res = await fetch(this.url('/auth/register'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    const body = (await res.json()) as AuthResponse
    if (!res.ok || !body || body.ok !== true) {
      const msg = body && body.ok === false ? body.message ?? body.error : undefined
      throw new Error(msg ?? `register_failed_${res.status}`)
    }

    this.saveLocal(body.token, body.user)
    return body.user
  }

  async login(email: string, password: string): Promise<AuthUser> {
    const res = await fetch(this.url('/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    const body = (await res.json()) as AuthResponse
    if (!res.ok || !body || body.ok !== true) {
      const msg = body && body.ok === false ? body.message ?? body.error : undefined
      throw new Error(msg ?? `login_failed_${res.status}`)
    }

    this.saveLocal(body.token, body.user)
    return body.user
  }

  async logout(): Promise<void> {
    const headers = this.authHeaders()
    if (!headers.Authorization) {
      this.clearLocal()
      return
    }

    try {
      await fetch(this.url('/auth/logout'), {
        method: 'POST',
        headers,
      })
    } finally {
      this.clearLocal()
    }
  }

  private url(path: string): string {
    return `${this._baseUrl}${path}`
  }
}
