import { LogLevels, type LogLevel, type LogEntry } from './LogLevel';

const MAX_LOGS = 200;
const STORAGE_KEY = 'app:logs';

function encodeBase64(str: string): string
{
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16))));
}

export class Logger
{
  private static _instance: Logger | null = null;
  private static _namedCache = new Map<string, Logger>();
  private static _logs: LogEntry[] = Logger._loadStoredLogs();

  readonly name: string;

  private constructor(name: string)
  {
    this.name = name;
  }

  private static _loadStoredLogs(): LogEntry[]
  {
    try
    {
      const stored = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
      if (stored)
      {
        return JSON.parse(stored) as LogEntry[];
      }
    }
    catch
    {
      // ignore
    }
    return [];
  }

  private static _saveLogs(): void
  {
    try
    {
      const toStore = Logger._logs.slice(-MAX_LOGS);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    }
    catch
    {
      // localStorage full or unavailable
    }
  }

  static getInstance(): Logger
  {
    if (!Logger._instance)
    {
      Logger._instance = new Logger('App');
    }
    return Logger._instance;
  }

  // Returns a Logger whose log entries are tagged with the given name.
  // Same name always returns the same instance; the shared log store is unaffected.
  static named(name: string): Logger
  {
    let cached = Logger._namedCache.get(name);
    if (!cached)
    {
      cached = new Logger(name);
      Logger._namedCache.set(name, cached);
    }
    return cached;
  }

  private _log(level: LogLevel, message: string, data?: unknown): void
  {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      name: this.name,
      message,
      data,
    };

    Logger._logs.push(entry);
    if (Logger._logs.length > MAX_LOGS)
    {
      Logger._logs = Logger._logs.slice(-MAX_LOGS);
    }

    Logger._saveLogs();

    if (level === LogLevels.Error)
    {
      console.error(`[${this.name}]`, message, data);
    }
    else if (level === LogLevels.Warn)
    {
      console.warn(`[${this.name}]`, message, data);
    }
    else if (level === LogLevels.Info)
    {
      console.info(`[${this.name}]`, message, data);
    }
    else
    {
      console.debug(`[${this.name}]`, message, data);
    }
  }

  debug(message: string, data?: unknown): void
  {
    this._log(LogLevels.Debug, message, data);
  }

  info(message: string, data?: unknown): void
  {
    this._log(LogLevels.Info, message, data);
  }

  warn(message: string, data?: unknown): void
  {
    this._log(LogLevels.Warn, message, data);
  }

  error(message: string, data?: unknown): void
  {
    this._log(LogLevels.Error, message, data);
  }

  getAllLogs(): LogEntry[]
  {
    return [...Logger._logs];
  }

  clearLogs(): void
  {
    Logger._logs = [];
    try
    {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    catch
    {
      // ignore
    }
  }

  getLogsAsBase64(): string
  {
    if (Logger._logs.length === 0)
    {
      return '';
    }
    const json = JSON.stringify(Logger._logs);
    return encodeBase64(json);
  }
}
