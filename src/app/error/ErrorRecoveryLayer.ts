import { Logger } from '../logging/Logger';
import { HttpClient } from '../http/HttpClient';

export interface ErrorEvent
{
  type: string;
  message: string;
  stack?: string;
  timestamp: number;
  url?: string;
  userAgent: string;
}

export class ErrorRecoveryLayer
{
  private logger = Logger.named('ErrorRecovery');
  private errors: ErrorEvent[] = [];
  private http?: HttpClient;

  constructor()
  {
    this.setupGlobalErrorHandler();
  }

  setHttpClient(http: HttpClient): void
  {
    this.http = http;
  }

  private setupGlobalErrorHandler(): void
  {
    window.addEventListener('error', (event) =>
    {
      const errorEvent = this.createErrorEvent('UncaughtError', event.error?.message || event.message);
      this.logError(errorEvent);
    });

    window.addEventListener('unhandledrejection', (event) =>
    {
      const message = event.reason?.message || String(event.reason);
      const errorEvent = this.createErrorEvent('UnhandledRejection', message);
      this.logError(errorEvent);
    });
  }

  private createErrorEvent(type: string, message: string): ErrorEvent
  {
    return {
      type,
      message,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    };
  }

  logError(error: ErrorEvent | Error | string): void
  {
    const errorEvent = typeof error === 'string'
      ? this.createErrorEvent('AppError', error)
      : error instanceof Error
        ? this.createErrorEvent('Error', error.message)
        : error;

    this.errors.push(errorEvent);
    this.logger.error(errorEvent.message, { type: errorEvent.type });

    if (this.errors.length > 50)
    {
      this.errors = this.errors.slice(-50);
    }
  }

  async sendErrorsToBackend(): Promise<void>
  {
    if (!this.http || this.errors.length === 0)
    {
      return;
    }

    try
    {
      await this.http.post.json('/api/errors', {
        logs: JSON.stringify(this.errors),
        clientLogs: Logger.getInstance().getLogsAsBase64(),
      });

      this.errors = [];
    }
    catch (e)
    {
      this.logger.warn('Failed to send errors to backend', { error: String(e) });
    }
  }

  getErrors(): ErrorEvent[]
  {
    return [...this.errors];
  }

  clearErrors(): void
  {
    this.errors = [];
  }
}
