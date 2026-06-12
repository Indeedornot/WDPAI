import appsettings from './appsettings.json';
import type { AppConfig } from './AppConfig';

/** Environment values that can override appsettings.json at startup. */
export interface AppEnvironment
{
  VITE_BACKEND_URL?: string;
}

/**
 * Loads appsettings.json and applies environment overrides once, at startup.
 * This is the single place that reads the ambient environment, so the rest of
 * the app depends only on the strongly-typed AppConfig / IOptions sections.
 */
export class ConfigurationLoader
{
  static load(env: AppEnvironment): AppConfig
  {
    const base = appsettings as AppConfig;
    return {
      backend: {
        ...base.backend,
        baseUrl: env.VITE_BACKEND_URL ?? base.backend.baseUrl,
      },
      storage: { ...base.storage },
      dom: { ...base.dom },
    };
  }
}
