import { uiBody, uiButton, uiOverlay, uiPanel, uiSubtitle, uiTitle, focusFirstDescendant, trapFocus } from './components/UiKit'

export type WelcomeScreenOptions = {
  title?: string
  subtitle?: string
  onStart: () => void
}

export class WelcomeScreen {
  private readonly _overlay: HTMLDivElement
  private readonly _panel: HTMLDivElement
  private _untrap: (() => void) | null = null
  private _isOpen = false
  private _unblockKeys: (() => void) | null = null

  readonly options: WelcomeScreenOptions

  constructor(options: WelcomeScreenOptions) {
    this.options = options

    this._overlay = uiOverlay(() => {
      // Don’t close on background click; welcome is an explicit action.
    })

    this._panel = uiPanel()
    this._panel.setAttribute('role', 'dialog')
    this._panel.setAttribute('aria-modal', 'true')

    this._overlay.appendChild(this._panel)
    this.render()
  }

  mount(parent: HTMLElement): void {
    parent.appendChild(this._overlay)
  }

  open(): void {
    if (this._isOpen) return
    this._isOpen = true
    this._overlay.classList.remove('ui-hidden')

    this._untrap = trapFocus(this._panel, () => this._isOpen)

    const blockKeys = (e: KeyboardEvent) => {
      if (!this._isOpen) return
      if (e.code === 'Escape') {
        // Avoid opening the pause hub behind the welcome dialog.
        e.preventDefault()
        e.stopImmediatePropagation()
      }
    }
    window.addEventListener('keydown', blockKeys, { capture: true })
    this._unblockKeys = () => window.removeEventListener('keydown', blockKeys, { capture: true })

    focusFirstDescendant(this._panel)
  }

  close(): void {
    if (!this._isOpen) return
    this._isOpen = false
    this._overlay.classList.add('ui-hidden')
    this._untrap?.()
    this._untrap = null

    this._unblockKeys?.()
    this._unblockKeys = null
  }

  private render(): void {
    this._panel.innerHTML = ''

    const titleText = this.options.title ?? 'Welcome'
    const subtitleText =
      this.options.subtitle ??
      'Play the demo, then press Esc for the hub (options, save/load, rebind controls).'

    const h = uiTitle(titleText)
    h.id = 'welcome-title'
    this._panel.setAttribute('aria-labelledby', h.id)

    const sub = uiSubtitle(subtitleText)
    sub.id = 'welcome-sub'
    this._panel.setAttribute('aria-describedby', sub.id)

    const body = uiBody()

    body.appendChild(
      uiButton({
        label: 'Start',
        title: 'Start the game',
        onClick: () => {
          this.options.onStart()
          this.close()
        },
      }),
    )

    body.appendChild(
      uiButton({
        label: 'Focus Canvas',
        title: 'Move keyboard focus to the canvas',
        onClick: () => {
          const canvas = document.querySelector<HTMLCanvasElement>('#game')
          canvas?.focus()
        },
      }),
    )

    const tips = document.createElement('div')
    tips.className = 'hint'
    tips.textContent = 'Controls: WASD move, arrows aim, Space shoot. Tip: use Tab/Shift+Tab to navigate UI.'

    this._panel.appendChild(h)
    this._panel.appendChild(sub)
    this._panel.appendChild(body)
    this._panel.appendChild(tips)
  }
}
