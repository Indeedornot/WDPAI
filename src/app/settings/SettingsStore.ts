/** Loads, holds and persists user settings (currently the accessible mode flag). */
export class SettingsStore
{
  private readonly _key: string;
  private _accessibleMode: boolean;

  constructor(key: string)
  {
    this._key = key;
    this._accessibleMode = this._load();
  }

  get accessibleMode(): boolean
  {
    return this._accessibleMode;
  }

  setAccessibleMode(enabled: boolean): void
  {
    this._accessibleMode = enabled;
    window.localStorage.setItem(this._key, JSON.stringify({ accessibleMode: enabled }));
  }

  private _load(): boolean
  {
    try
    {
      const raw = window.localStorage.getItem(this._key);
      if (!raw)
      {
        return false;
      }
      const parsed = JSON.parse(raw) as { accessibleMode?: unknown };
      return Boolean(parsed?.accessibleMode);
    }
    catch
    {
      return false;
    }
  }
}
