export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export const LogLevels = {
  Debug: 'DEBUG' as LogLevel,
  Info: 'INFO' as LogLevel,
  Warn: 'WARN' as LogLevel,
  Error: 'ERROR' as LogLevel,
} as const;

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  name: string;
  message: string;
  data?: unknown;
}
