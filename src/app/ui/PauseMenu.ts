import type { ControlsConfig } from '../controls/ControlsConfig'
import { DEFAULT_CONTROLS } from '../controls/ControlsConfig'
import type { AuthUser } from '../auth/AuthClient'
import {
  focusFirstDescendant,
  trapFocus,
  uiBody,
  uiButton,
  uiCogButton,
  el,
  uiOverlay,
  uiPanel,
  uiPill,
  uiSection,
  uiSmallButton,
  uiSubtitle,
  uiTitle,
} from './components/UiKit'

export type PauseMenuOptions = {
  onResume: () => void
  onPause: () => void
  getControls: () => ControlsConfig
  setControls: (next: ControlsConfig) => void

  getAccessibleMode?: () => boolean
  setAccessibleMode?: (enabled: boolean) => void

  onSaveNow?: () => void | Promise<void>
  onLoadNow?: () => void | Promise<void>

  auth?: {
    getUser: () => AuthUser | null
    isLoggedIn: () => boolean
    getSessionExpiresAt: () => string | null
    isExpiringSoon: () => boolean
    register: (email: string, password: string) => Promise<void>
    login: (email: string, password: string) => Promise<void>
    refreshSession: () => Promise<AuthUser>
    logout: () => Promise<void>
  }

  admin?: {
    isAdmin: () => boolean
    getUser: () => AuthUser | null
    listUsers: () => Promise<Array<{ id: number; email: string; role: string; createdAt: string; lastLoginAt: string | null; bannedAt: string | null; bannedReason: string | null }>>
    listSaves: (userId: number) => Promise<Array<{ slot: string; version: number; updatedAt: string }>>
    listRuns: (userId: number) => Promise<Array<{ createdAt: string; timeSeconds: number; level: number; xp: number; kills: number; shotsFired: number; shotsHit: number }>>
    listLoginAudit: () => Promise<Array<{ id: string; email: string; ip: string | null; attempted_at: string; reason: string }>>
    setBan: (userId: number, banned: boolean, reason?: string) => Promise<void>
  }
}

type MenuView = 'main' | 'options' | 'admin'

type RebindTarget =
  | { kind: 'shootKey' }
  | { kind: 'movement'; dir: keyof ControlsConfig['movement'] }
  | { kind: 'aim'; dir: keyof ControlsConfig['aim'] }

export class PauseMenu {
  private readonly _root: HTMLDivElement
  private readonly _overlay: HTMLDivElement
  private readonly _panel: HTMLDivElement
  private _untrap: (() => void) | null = null

  private _isOpen = false
  private _view: MenuView = 'main'
  private _rebindTarget: RebindTarget | null = null

  private _authEmail = ''
  private _authPassword = ''
  private _authStatus = ''
  private _authBusy = false

  private _adminStatus = ''
  private _adminBusy = false
  private _adminUsers: Array<{ id: number; email: string; role: string; createdAt: string; lastLoginAt: string | null; bannedAt: string | null; bannedReason: string | null }> = []
  private _adminSaves: Array<{ slot: string; version: number; updatedAt: string }> = []
  private _adminRuns: Array<{ createdAt: string; timeSeconds: number; level: number; xp: number; kills: number; shotsFired: number; shotsHit: number }> = []
  private _adminAudit: Array<{ id: string; email: string; ip: string | null; attempted_at: string; reason: string }> = []
  private _adminSelectedUserId: number | null = null

  readonly options: PauseMenuOptions

  constructor(options: PauseMenuOptions) {
    this.options = options
    this._root = document.createElement('div')
    this._root.className = 'ui-root'

    const cog = uiCogButton({
      label: '⚙',
      title: 'Menu (Esc)',
      ariaLabel: 'Open menu',
      onClick: () => this.toggle(),
    })

    this._overlay = uiOverlay(() => this.close())

    this._panel = uiPanel()
    this._panel.setAttribute('role', 'dialog')
    this._panel.setAttribute('aria-modal', 'true')
    this._panel.setAttribute('aria-label', 'Pause menu')

    this._overlay.appendChild(this._panel)
    const hudActions = document.querySelector<HTMLElement>('#hud-actions')
    if (hudActions) hudActions.appendChild(cog)
    else this._root.appendChild(cog)
    this._root.appendChild(this._overlay)

    window.addEventListener('keydown', (e) => {
      if (this._rebindTarget) {
        e.preventDefault()
        this.applyRebind(e.code)
        return
      }

      if (e.code === 'Escape') {
        e.preventDefault()
        this.toggle()
      }
    })

    this.render()
  }

  mount(parent: HTMLElement): void {
    parent.appendChild(this._root)
  }

  refresh(): void {
    this.render()
  }

  open(): void {
    if (this._isOpen) return
    this._isOpen = true
    this.options.onPause()
    this._overlay.classList.remove('ui-hidden')
    this._untrap = trapFocus(this._panel, () => this._isOpen)
    this.render()
    focusFirstDescendant(this._panel)
  }

  close(): void {
    if (!this._isOpen) return
    this._isOpen = false
    this._rebindTarget = null
    this._view = 'main'
    this._adminStatus = ''
    this._adminBusy = false
    this._adminAudit = []
    this.options.onResume()
    this._overlay.classList.add('ui-hidden')
    this._untrap?.()
    this._untrap = null
    this.render()
  }

  toggle(): void {
    if (this._isOpen) this.close()
    else this.open()
  }

  private render(): void {
    const controls = this.options.getControls()

    const title = this._view === 'main' ? 'Paused' : 'Options'
    const subtitle = this._rebindTarget ? 'Press a key…' : ''

    this._panel.innerHTML = ''

    const h = uiTitle(title)
    h.id = 'pause-title'
    this._panel.setAttribute('aria-labelledby', h.id)

    const sub = uiSubtitle(subtitle)
    sub.id = 'pause-subtitle'
    if (subtitle) this._panel.setAttribute('aria-describedby', sub.id)
    else this._panel.removeAttribute('aria-describedby')
    const body = uiBody()

    if (this._view === 'main') {
      body.appendChild(uiButton({ label: 'Resume', onClick: () => this.close() }))
      if (this.options.onSaveNow) {
        body.appendChild(uiButton({ label: 'Save Now', onClick: () => void this.options.onSaveNow?.() }))
      }
      if (this.options.onLoadNow) {
        body.appendChild(uiButton({ label: 'Load Last Save', onClick: () => void this.options.onLoadNow?.() }))
      }

      if (this.options.auth?.isLoggedIn()) {
        const logoutBtn = uiButton({
          label: this._authBusy ? 'Working…' : 'Log out',
          onClick: () => void this.handleLogout(),
        })
        logoutBtn.disabled = this._authBusy
        body.appendChild(logoutBtn)
      }

      body.appendChild(
        uiButton({
          label: 'Options',
          onClick: () => {
            this._view = 'options'
            this._rebindTarget = null
            this.render()
          },
        }),
      )
    } else if (this._view === 'options') {
      body.appendChild(uiSection('Movement (WASD default)', this.bindingsRows('movement', controls.movement)))
      body.appendChild(uiSection('Aim (Arrow keys default)', this.bindingsRows('aim', controls.aim)))
      body.appendChild(uiSection('Shoot', [this.rebindRow('shootKey', 'Shoot', controls.shootKey)]))

      body.appendChild(
        uiButton({
          label: 'Reset Controls',
          onClick: () => {
            this.options.setControls(structuredClone(DEFAULT_CONTROLS))
            this._rebindTarget = null
            this.render()
          },
        }),
      )

      if (this.options.getAccessibleMode && this.options.setAccessibleMode) {
        const enabled = this.options.getAccessibleMode()
        const row = document.createElement('div')
        row.className = 'ui-row'

        const left = document.createElement('div')
        left.className = 'ui-row-label'
        left.textContent = 'Accessible Mode'

        const right = document.createElement('div')
        right.className = 'ui-row-value'

        right.appendChild(uiPill(enabled ? 'On' : 'Off'))
        right.appendChild(
          uiSmallButton({
            label: enabled ? 'Disable' : 'Enable',
            onClick: () => {
              this.options.setAccessibleMode?.(!enabled)
              this.render()
            },
          }),
        )

        row.appendChild(left)
        row.appendChild(right)

        body.appendChild(uiSection('Accessibility', [row]))
      }

      if (this.options.auth) {
        body.appendChild(this.renderAccountSection())
      }

      if (this.options.admin && this.options.admin.isAdmin()) {
        body.appendChild(
          uiButton({
            label: 'Admin Panel',
            onClick: () => {
              this._view = 'admin'
              this._rebindTarget = null
              void this.refreshAdminUsers()
              this.render()
            },
          }),
        )
      }

      body.appendChild(
        uiButton({
          label: 'Back',
          onClick: () => {
            this._view = 'main'
            this._rebindTarget = null
            this.render()
          },
        }),
      )
    } else {
      body.appendChild(this.renderAdminPanel())
    }

    this._panel.appendChild(h)
    if (subtitle) this._panel.appendChild(sub)

    if (this._view === 'options') {
      const scroll = el('div', { className: 'ui-scroll' })
      scroll.appendChild(body)
      this._panel.appendChild(scroll)
    } else {
      this._panel.appendChild(body)
    }
  }

  private renderAdminPanel(): HTMLDivElement {
    const admin = this.options.admin
    const rows: HTMLElement[] = []

    const user = admin?.getUser()
    const header = el('div', { className: 'ui-hint', text: user ? `Signed in as ${user.email} (${user.role})` : 'Not signed in.' })
    rows.push(header)

    const topRow = el('div', { className: 'ui-row' })
    topRow.appendChild(el('div', { className: 'ui-row-label', text: 'Users' }))
    const topRight = el('div', { className: 'ui-row-value' })
    const refreshBtn = uiSmallButton({
      label: this._adminBusy ? 'Working…' : 'Refresh',
      onClick: () => void this.refreshAdminUsers(),
    })
    refreshBtn.disabled = this._adminBusy
    topRight.appendChild(refreshBtn)
    topRow.appendChild(topRight)
    rows.push(topRow)

    if (this._adminUsers.length === 0) {
      rows.push(el('div', { className: 'ui-hint', text: 'No users loaded yet.' }))
    } else {
      for (const u of this._adminUsers) {
        const row = el('div', { className: 'ui-row' })
        row.appendChild(el('div', { className: 'ui-row-label', text: `#${u.id}` }))

        const right = el('div', { className: 'ui-row-value' })
        right.appendChild(uiPill(u.email))
        right.appendChild(uiPill(u.role))
        right.appendChild(uiPill(u.bannedAt ? 'Banned' : 'Active'))

        if (u.bannedAt && u.bannedReason) {
          right.appendChild(uiPill(u.bannedReason))
        }

        const inspect = uiSmallButton({
          label: this._adminBusy ? 'Working…' : 'Inspect Saves',
          onClick: () => void this.inspectUserSaves(u.id),
        })
        inspect.disabled = this._adminBusy
        right.appendChild(inspect)

        const inspectRuns = uiSmallButton({
          label: this._adminBusy ? 'Working…' : 'Inspect Runs',
          onClick: () => void this.inspectUserRuns(u.id),
        })
        inspectRuns.disabled = this._adminBusy
        right.appendChild(inspectRuns)

        const banBtn = uiSmallButton({
          label: this._adminBusy ? 'Working…' : u.bannedAt ? 'Unban' : 'Ban',
          onClick: () => void this.toggleBan(u.id, !u.bannedAt),
        })
        banBtn.disabled = this._adminBusy
        right.appendChild(banBtn)

        row.appendChild(right)
        rows.push(row)
      }
    }

    const savesTitle = this._adminSelectedUserId != null ? `Saves for userId=${this._adminSelectedUserId}` : 'Saves'
    const saveRows: HTMLElement[] = []
    if (this._adminSelectedUserId == null) {
      saveRows.push(el('div', { className: 'ui-hint', text: 'Pick a user to inspect their save slots.' }))
    } else if (this._adminSaves.length === 0) {
      saveRows.push(el('div', { className: 'ui-hint', text: 'No saves found.' }))
    } else {
      for (const s of this._adminSaves) {
        const r = el('div', { className: 'ui-row' })
        r.appendChild(el('div', { className: 'ui-row-label', text: s.slot }))
        const right = el('div', { className: 'ui-row-value' })
        right.appendChild(uiPill(`v${s.version}`))
        right.appendChild(uiPill(s.updatedAt))
        r.appendChild(right)
        saveRows.push(r)
      }
    }
    rows.push(uiSection(savesTitle, saveRows))

    const runsTitle = this._adminSelectedUserId != null ? `Runs for userId=${this._adminSelectedUserId}` : 'Runs'
    const runRows: HTMLElement[] = []
    if (this._adminSelectedUserId == null) {
      runRows.push(el('div', { className: 'ui-hint', text: 'Pick a user to inspect their runs.' }))
    } else if (this._adminRuns.length === 0) {
      runRows.push(el('div', { className: 'ui-hint', text: 'No runs found.' }))
    } else {
      for (const r of this._adminRuns) {
        const accuracy = r.shotsFired <= 0 ? 0 : r.shotsHit / r.shotsFired
        const row = el('div', { className: 'ui-row' })
        row.appendChild(el('div', { className: 'ui-row-label', text: r.createdAt }))
        const right = el('div', { className: 'ui-row-value' })
        right.appendChild(uiPill(`t=${r.timeSeconds}s`))
        right.appendChild(uiPill(`Lv ${r.level}`))
        right.appendChild(uiPill(`XP ${r.xp}`))
        right.appendChild(uiPill(`Kills ${r.kills}`))
        right.appendChild(uiPill(`Acc ${Math.round(accuracy * 100)}%`))
        row.appendChild(right)
        runRows.push(row)
      }
    }
    rows.push(uiSection(runsTitle, runRows))

    const auditRows: HTMLElement[] = []
    if (this._adminAudit.length === 0) {
      auditRows.push(el('div', { className: 'ui-hint', text: 'No audit events loaded yet.' }))
    } else {
      for (const entry of this._adminAudit) {
        const row = el('div', { className: 'ui-row' })
        row.appendChild(el('div', { className: 'ui-row-label', text: entry.attempted_at }))
        const right = el('div', { className: 'ui-row-value' })
        right.appendChild(uiPill(entry.email))
        right.appendChild(uiPill(entry.reason))
        if (entry.ip) right.appendChild(uiPill(entry.ip))
        row.appendChild(right)
        auditRows.push(row)
      }
    }
    rows.push(uiSection('Login audit', auditRows))

    if (this._adminStatus) {
      rows.push(el('div', { className: 'ui-hint', text: this._adminStatus }))
    }

    const backBtn = uiButton({
      label: 'Back',
      onClick: () => {
        this._view = 'options'
        this._rebindTarget = null
        this.render()
      },
    })
    rows.push(backBtn)

    return uiSection('Admin', rows)
  }

  private async toggleBan(userId: number, banned: boolean): Promise<void> {
    const admin = this.options.admin
    if (!admin) return
    if (!admin.isAdmin()) {
      this._adminStatus = 'Forbidden (not an admin).'
      this.render()
      return
    }

    let reason: string | undefined
    if (banned) {
      const r = window.prompt('Ban reason (optional):', '')
      if (r !== null) reason = r
    }

    this._adminBusy = true
    this._adminStatus = ''
    this.render()

    try {
      await admin.setBan(userId, banned, reason)
      this._adminStatus = banned ? 'User banned.' : 'User unbanned.'
      this._adminSelectedUserId = null
      this._adminSaves = []
      await this.refreshAdminUsers()
    } catch (e) {
      this._adminStatus = `Failed: ${e instanceof Error ? e.message : 'unknown_error'}`
    } finally {
      this._adminBusy = false
      this.render()
    }
  }

  private async refreshAdminUsers(): Promise<void> {
    const admin = this.options.admin
    if (!admin) return
    if (!admin.isAdmin()) {
      this._adminStatus = 'Forbidden (not an admin).'
      this.render()
      return
    }

    this._adminBusy = true
    this._adminStatus = ''
    this.render()

    try {
      this._adminUsers = await admin.listUsers()
      this._adminAudit = await admin.listLoginAudit()
      this._adminStatus = `Loaded ${this._adminUsers.length} user(s).`
    } catch (e) {
      this._adminStatus = `Failed to load users: ${e instanceof Error ? e.message : 'unknown_error'}`
    } finally {
      this._adminBusy = false
      this.render()
    }
  }

  private async inspectUserSaves(userId: number): Promise<void> {
    const admin = this.options.admin
    if (!admin) return
    if (!admin.isAdmin()) {
      this._adminStatus = 'Forbidden (not an admin).'
      this.render()
      return
    }

    this._adminBusy = true
    this._adminStatus = ''
    this._adminSelectedUserId = userId
    this._adminSaves = []
    this._adminRuns = []
    this.render()

    try {
      this._adminSaves = await admin.listSaves(userId)
      this._adminStatus = `Loaded ${this._adminSaves.length} save slot(s).`
    } catch (e) {
      this._adminStatus = `Failed to load saves: ${e instanceof Error ? e.message : 'unknown_error'}`
    } finally {
      this._adminBusy = false
      this.render()
    }
  }

  private async inspectUserRuns(userId: number): Promise<void> {
    const admin = this.options.admin
    if (!admin) return
    if (!admin.isAdmin()) {
      this._adminStatus = 'Forbidden (not an admin).'
      this.render()
      return
    }

    this._adminBusy = true
    this._adminStatus = ''
    this._adminSelectedUserId = userId
    this._adminRuns = []
    this.render()

    try {
      this._adminRuns = await admin.listRuns(userId)
      this._adminStatus = `Loaded ${this._adminRuns.length} run(s).`
    } catch (e) {
      this._adminStatus = `Failed to load runs: ${e instanceof Error ? e.message : 'unknown_error'}`
    } finally {
      this._adminBusy = false
      this.render()
    }
  }

  private renderAccountSection(): HTMLDivElement {
    const auth = this.options.auth
    if (!auth) return uiSection('Account', [])

    const rows: HTMLElement[] = []
    const user = auth.getUser()

    if (auth.isLoggedIn() && user) {
      const row = el('div', { className: 'ui-row' })
      row.appendChild(el('div', { className: 'ui-row-label', text: 'Signed in' }))

      const right = el('div', { className: 'ui-row-value' })
      right.appendChild(uiPill(user.email))
      right.appendChild(uiPill(user.role))
      const expiresAt = auth.getSessionExpiresAt()
      if (expiresAt) {
        right.appendChild(uiPill(`Expires ${new Date(expiresAt).toLocaleString()}`))
      }
      if (auth.isExpiringSoon()) {
        right.appendChild(uiPill('Refresh recommended'))
      }
      right.appendChild(
        uiSmallButton({
          label: this._authBusy ? 'Working…' : 'Refresh token',
          onClick: () => void this.handleRefreshSession(),
        }),
      )
      const logoutBtn = uiSmallButton({
        label: this._authBusy ? 'Working…' : 'Log out',
        onClick: () => void this.handleLogout(),
      })
      logoutBtn.disabled = this._authBusy
      right.appendChild(logoutBtn)

      row.appendChild(right)
      rows.push(row)
    } else {
      const email = this.makeInput('Email', 'email', this._authEmail, (v) => {
        this._authEmail = v
      })
      const pass = this.makeInput('Password', 'password', this._authPassword, (v) => {
        this._authPassword = v
      })
      rows.push(email)
      rows.push(pass)

      const btnRow = el('div', { className: 'ui-row' })
      btnRow.appendChild(el('div', { className: 'ui-row-label', text: 'Actions' }))
      const right = el('div', { className: 'ui-row-value' })

      const loginBtn = uiSmallButton({
        label: this._authBusy ? 'Working…' : 'Log in',
        onClick: () => void this.handleLogin(),
      })
      loginBtn.disabled = this._authBusy

      const regBtn = uiSmallButton({
        label: this._authBusy ? 'Working…' : 'Register',
        onClick: () => void this.handleRegister(),
      })
      regBtn.disabled = this._authBusy

      right.appendChild(loginBtn)
      right.appendChild(regBtn)
      btnRow.appendChild(right)
      rows.push(btnRow)
    }

    if (this._authStatus) {
      rows.push(el('div', { className: 'ui-hint', text: this._authStatus }))
    }

    return uiSection('Account', rows)
  }

  private makeInput(label: string, type: string, value: string, onValue: (v: string) => void): HTMLElement {
    const row = el('div', { className: 'ui-row' })
    row.appendChild(el('div', { className: 'ui-row-label', text: label }))

    const right = el('div', { className: 'ui-row-value' })
    const input = document.createElement('input')
    input.className = 'ui-input'
    input.type = type
    input.value = value
    input.autocomplete = type === 'password' ? 'current-password' : 'email'
    input.addEventListener('input', () => onValue(input.value))
    right.appendChild(input)

    row.appendChild(right)
    return row
  }

  private async handleRegister(): Promise<void> {
    const auth = this.options.auth
    if (!auth) return

    this._authBusy = true
    this._authStatus = ''
    this.render()

    try {
      await auth.register(this._authEmail.trim(), this._authPassword)
      this._authPassword = ''
      this._authStatus = 'Registered and signed in.'
    } catch (e) {
      this._authStatus = `Register failed: ${e instanceof Error ? e.message : 'unknown_error'}`
    } finally {
      this._authBusy = false
      this.render()
    }
  }

  private async handleLogin(): Promise<void> {
    const auth = this.options.auth
    if (!auth) return

    this._authBusy = true
    this._authStatus = ''
    this.render()

    try {
      await auth.login(this._authEmail.trim(), this._authPassword)
      this._authPassword = ''
      this._authStatus = 'Signed in.'
    } catch (e) {
      this._authStatus = `Login failed: ${e instanceof Error ? e.message : 'unknown_error'}`
    } finally {
      this._authBusy = false
      this.render()
    }
  }

  private async handleLogout(): Promise<void> {
    const auth = this.options.auth
    if (!auth) return

    this._authBusy = true
    this._authStatus = ''
    this.render()

    try {
      await auth.logout()
      this._authStatus = 'Signed out.'
    } catch (e) {
      this._authStatus = `Logout failed: ${e instanceof Error ? e.message : 'unknown_error'}`
    } finally {
      this._authBusy = false
      this.render()
    }
  }

  private async handleRefreshSession(): Promise<void> {
    const auth = this.options.auth
    if (!auth) return

    this._authBusy = true
    this._authStatus = ''
    this.render()

    try {
      const user = await auth.refreshSession()
      this._authStatus = `Token refreshed for ${user.email}.`
    } catch (e) {
      this._authStatus = `Refresh failed: ${e instanceof Error ? e.message : 'unknown_error'}`
    } finally {
      this._authBusy = false
      this.render()
    }
  }

  private bindingsRows(kind: 'movement' | 'aim', map: Record<string, string>): HTMLElement[] {
    const order = ['Up', 'Down', 'Left', 'Right']
    return order.map((dir) => this.rebindRow(kind, dir, map[dir] ?? ''))
  }

  private rebindRow(kind: 'movement' | 'aim' | 'shootKey', label: string, code: string): HTMLElement {
    const row = document.createElement('div')
    row.className = 'ui-row'

    const left = document.createElement('div')
    left.className = 'ui-row-label'
    left.textContent = label

    const right = document.createElement('div')
    right.className = 'ui-row-value'

    const pill = uiPill(code || 'Unbound')

    const btn = uiSmallButton({
      label: this._rebindTarget ? 'Waiting…' : 'Rebind',
      onClick: () => {
        if (kind === 'shootKey') this._rebindTarget = { kind: 'shootKey' }
        else this._rebindTarget = { kind, dir: label as keyof ControlsConfig[typeof kind] }
        this.render()
      },
    })
    btn.disabled = this._rebindTarget !== null

    right.appendChild(pill)
    right.appendChild(btn)

    row.appendChild(left)
    row.appendChild(right)
    return row
  }

  private applyRebind(code: string): void {
    const t = this._rebindTarget
    if (!t) return

    const current = this.options.getControls()
    let next: ControlsConfig

    if (t.kind === 'shootKey') {
      next = { ...current, shootKey: code }
    } else if (t.kind === 'movement') {
      next = { ...current, movement: { ...current.movement, [t.dir]: code } }
    } else {
      next = { ...current, aim: { ...current.aim, [t.dir]: code } }
    }

    this.options.setControls(next)
    this._rebindTarget = null
    this.render()
  }
}
