export class Input {
  private readonly _keysDown = new Set<string>();
  private readonly _keysPressedThisFrame = new Set<string>();

  readonly target: Window;

  constructor(target: Window = window) {
    this.target = target;

    target.addEventListener('keydown', this.onKeyDown);
    target.addEventListener('keyup', this.onKeyUp);
    target.addEventListener('blur', this.onBlur);
  }

  isKeyDown(code: string): boolean {
    return this._keysDown.has(code);
  }

  /** True only on the first frame a key is pressed (edge-trigger). */
  wasKeyPressed(code: string): boolean {
    return this._keysPressedThisFrame.has(code);
  }

  /** Call once per rendered frame. */
  beginFrame(): void {
    this._keysPressedThisFrame.clear();
  }

  /** Clears all tracked key state (useful when opening/closing overlays). */
  clear(): void {
    this._keysDown.clear();
    this._keysPressedThisFrame.clear();
  }

  dispose(): void {
    this.target.removeEventListener('keydown', this.onKeyDown);
    this.target.removeEventListener('keyup', this.onKeyUp);
    this.target.removeEventListener('blur', this.onBlur);
    this._keysDown.clear();
    this._keysPressedThisFrame.clear();
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (!this._keysDown.has(e.code)) this._keysPressedThisFrame.add(e.code);
    this._keysDown.add(e.code);
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this._keysDown.delete(e.code);
  };

  private onBlur = (): void => {
    this._keysDown.clear();
  };
}
