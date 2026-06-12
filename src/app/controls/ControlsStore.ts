import type { ControlsConfig } from './ControlsConfig';
import { DEFAULT_CONTROLS, ControlsConfigParser } from './ControlsConfig';

/** Loads, holds and persists the player's control bindings in localStorage. */
export class ControlsStore
{
  private readonly _key: string;
  private _controls: ControlsConfig;

  constructor(key: string)
  {
    this._key = key;
    this._controls = this._load();
  }

  get current(): ControlsConfig
  {
    return this._controls;
  }

  set(next: ControlsConfig): void
  {
    this._controls = next;
    window.localStorage.setItem(this._key, JSON.stringify(next));
  }

  private _load(): ControlsConfig
  {
    try
    {
      const raw = window.localStorage.getItem(this._key);
      if (!raw)
      {
        return structuredClone(DEFAULT_CONTROLS);
      }
      return ControlsConfigParser.parse(JSON.parse(raw) as unknown);
    }
    catch
    {
      return structuredClone(DEFAULT_CONTROLS);
    }
  }
}
