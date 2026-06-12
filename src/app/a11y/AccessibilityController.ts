import type { AccessibleOverlay } from '../ui/AccessibleOverlay';
import type { SettingsStore } from '../settings/SettingsStore';
import type { Announcer } from './Announcer';

/**
 * Owns the accessible-mode state: persistence, applying it to the overlay and
 * canvas, and announcing the change. Replaces the get/setAccessibleMode +
 * applyAccessibleMode lambdas from the bootstrap.
 */
export class AccessibilityController
{
  private readonly _store: SettingsStore;
  private readonly _overlay: AccessibleOverlay;
  private readonly _canvas: HTMLCanvasElement;
  private readonly _announcer: Announcer;

  constructor(store: SettingsStore, overlay: AccessibleOverlay, canvas: HTMLCanvasElement, announcer: Announcer)
  {
    this._store = store;
    this._overlay = overlay;
    this._canvas = canvas;
    this._announcer = announcer;
  }

  get enabled(): boolean
  {
    return this._store.accessibleMode;
  }

  /** Applies the persisted mode to the overlay/canvas without announcing. */
  apply(): void
  {
    this._applyMode(this._store.accessibleMode);
  }

  setEnabled(enabled: boolean): void
  {
    this._store.setAccessibleMode(enabled);
    this._applyMode(enabled);
    this._announcer.announce(
      enabled ? 'Accessible mode enabled.' : 'Accessible mode disabled.',
      'polite',
    );
  }

  private _applyMode(enabled: boolean): void
  {
    this._overlay.setEnabled(enabled);
    this._canvas.style.opacity = enabled ? '0.22' : '1';
    this._canvas.setAttribute('aria-hidden', enabled ? 'true' : 'false');
  }
}
