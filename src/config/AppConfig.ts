/**
 * Strongly-typed application configuration, bound from appsettings.json with
 * environment overrides. Each section is registered as IOptions<T> so the rest
 * of the app declares exactly what configuration it needs at startup.
 */

export interface BackendOptions
{
  baseUrl: string;
}

export interface StorageOptions
{
  controlsKey: string;
  settingsKey: string;
  saveSlot: string;
  autosaveMs: number;
}

/** CSS selectors for the DOM elements the app mounts into. */
export interface DomOptions
{
  appSelector: string;
  canvasSelector: string;
  hudStatusSelector: string;
  srAnnounceSelector: string;
}

export interface AppConfig
{
  backend: BackendOptions;
  storage: StorageOptions;
  dom: DomOptions;
}
