/** Minimal contracts so the navigator does not import concrete screens. */
export interface IOpenable
{
  open(): void;
}

export interface IClosable
{
  close(): void;
}

/**
 * Central place to open/close screens and return focus to the game, so views
 * navigate via a service rather than via inline lambdas to other views. Screens
 * register themselves after construction, which also avoids import cycles.
 */
export class ScreenNavigator
{
  private readonly _canvas: HTMLCanvasElement;
  private _settings: IOpenable | null = null;
  private _tutorial: IOpenable | null = null;
  private _register: IOpenable | null = null;
  private _welcome: IClosable | null = null;

  constructor(canvas: HTMLCanvasElement)
  {
    this._canvas = canvas;
  }

  registerSettings(screen: IOpenable): void
  {
    this._settings = screen;
  }

  registerTutorial(screen: IOpenable): void
  {
    this._tutorial = screen;
  }

  registerRegister(screen: IOpenable): void
  {
    this._register = screen;
  }

  registerWelcome(screen: IClosable): void
  {
    this._welcome = screen;
  }

  openSettings(): void
  {
    this._settings?.open();
  }

  openTutorial(): void
  {
    this._tutorial?.open();
  }

  openRegister(): void
  {
    this._register?.open();
  }

  closeWelcome(): void
  {
    this._welcome?.close();
  }

  focusGame(): void
  {
    this._canvas.focus();
  }
}
