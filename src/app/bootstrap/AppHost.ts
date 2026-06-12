import type { DomOptions } from '../../config/AppConfig';
import { AppThemeApplier, DefaultTheme } from '../theme/AppTheme';

/** The DOM elements the application mounts into and renders with. */
export interface AppElements
{
  app: HTMLDivElement;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  hudStatus: HTMLDivElement;
  srRegion: HTMLElement;
}

/**
 * Owns DOM bootstrap: applies the theme, injects the app shell markup, and
 * resolves the elements via the configured selectors (no inline id strings).
 */
export class AppHost
{
  static mount(dom: DomOptions): AppElements
  {
    const app = document.querySelector<HTMLDivElement>(dom.appSelector);
    if (!app)
    {
      throw new Error(`Missing ${dom.appSelector}`);
    }

    AppThemeApplier.apply(DefaultTheme);

    app.innerHTML = `
      <div class="hud">
        <div class="hud-actions" id="hud-actions"></div>
        <div class="status" id="hud-status" aria-live="polite"></div>
      </div>
      <div id="sr-instructions" class="sr-only">
        Controls: WASD to move. Arrow keys to aim. Space to shoot. Press Escape to open the hub menu.
        Use Tab and Shift+Tab to navigate menus. The canvas is visual; key events will be announced.
      </div>
      <div id="sr-announce" class="sr-only" role="status" aria-live="polite" aria-atomic="true"></div>
      <canvas id="game" tabindex="0" role="img" aria-label="Game canvas" aria-describedby="sr-instructions">
        This demo is a canvas game. If you cannot see the canvas, use the hub menu (Escape) for options and save/load.
      </canvas>
    `;

    const canvas = AppHost._require<HTMLCanvasElement>(dom.canvasSelector);
    const ctx = canvas.getContext('2d');
    if (!ctx)
    {
      throw new Error('Canvas 2D context unavailable');
    }
    const hudStatus = AppHost._require<HTMLDivElement>(dom.hudStatusSelector);
    const srRegion = AppHost._require<HTMLElement>(dom.srAnnounceSelector);

    return { app, canvas, ctx, hudStatus, srRegion };
  }

  private static _require<T extends Element>(selector: string): T
  {
    const el = document.querySelector<T>(selector);
    if (!el)
    {
      throw new Error(`Missing ${selector}`);
    }
    return el;
  }
}
