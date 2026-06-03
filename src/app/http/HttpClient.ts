export type QueryParams = Record<string, string | number | boolean | null | undefined>;

export type HttpClientOptions = {
  credentials?: RequestCredentials;
  /** Static headers merged into every request. */
  headers?: Record<string, string>;
  /** Called per-request so tokens are always fresh. Merged after static headers. */
  headersProvider?: () => Record<string, string>;
  /** Callback when server confirms errors were processed. */
  onErrorsProcessed?: () => void;
};

export class HttpError extends Error 
{
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, message: string, body?: unknown) 
  {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.body = body;
  }
}

export type GetVerb = {
  json<T>(path: string, query?: QueryParams): Promise<T>;
};

export type PostVerb = {
  json<T>(path: string, body?: unknown): Promise<T>;
};

export type DeleteVerb = {
  json<T>(path: string, query?: QueryParams): Promise<T>;
};

export class HttpClient
{
  static onErrorsProcessedGlobal: (() => void) | undefined;

  private readonly _baseUrl: string;
  private readonly _credentials: RequestCredentials | undefined;
  private readonly _staticHeaders: Record<string, string>;
  private readonly _headersProvider: (() => Record<string, string>) | undefined;
  private readonly _onErrorsProcessed: (() => void) | undefined;
  private readonly _maxRetries: number = 3;
  private readonly _initialBackoffMs: number = 100;

  readonly get: GetVerb;
  readonly post: PostVerb;
  readonly delete: DeleteVerb;

  constructor(baseUrl: string, options: HttpClientOptions = {})
  {
    this._baseUrl = baseUrl.replace(/\/$/, '');
    this._credentials = options.credentials;
    this._staticHeaders = options.headers ?? {};
    this._headersProvider = options.headersProvider;
    this._onErrorsProcessed = options.onErrorsProcessed;

    this.get = {
      json: <T>(path: string, query?: QueryParams) => this._requestWithRetry<T>('GET', path, { query }),
    };

    this.post = {
      json: <T>(path: string, body?: unknown) => this._requestWithRetry<T>('POST', path, { body }),
    };

    this.delete = {
      json: <T>(path: string, query?: QueryParams) => this._requestWithRetry<T>('DELETE', path, { query }),
    };
  }

  private _buildUrl(path: string, query?: QueryParams): string 
  {
    const base = `${this._baseUrl}${path}`;
    if (!query) 
    {
      return base;
    }

    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) 
    {
      if (v != null) 
      {
        params.set(k, String(v));
      }
    }
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  }

  private _mergedHeaders(extra?: Record<string, string>, errorLogs?: string): Record<string, string>
  {
    const headers = {
      ...this._staticHeaders,
      ...(this._headersProvider?.() ?? {}),
      ...extra,
    };

    if (errorLogs)
    {
      headers['X-Client-Errors'] = errorLogs;
    }

    return headers;
  }

  private _getErrorLogsHeader(): string | undefined
  {
    try
    {
      const stored = window.localStorage.getItem('app:logs');
      if (stored)
      {
        return btoa(encodeURIComponent(stored).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16))));
      }
    }
    catch
    {
      // Ignore errors reading logs
    }
    return undefined;
  }

  private async _requestWithRetry<T>(
    method: string,
    path: string,
    options: { query?: QueryParams; body?: unknown } = {},
  ): Promise<T>
  {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this._maxRetries; attempt++)
    {
      try
      {
        return await this._request<T>(method, path, options);
      }
      catch (e)
      {
        lastError = e instanceof Error ? e : new Error(String(e));

        if (e instanceof HttpError && (e.status < 500 || e.status === 503))
        {
          // Don't retry client errors (4xx) or service unavailable (503)
          // Actually 503 we should retry
          if (e.status >= 400 && e.status < 500 && e.status !== 408 && e.status !== 429)
          {
            throw e;
          }
        }

        if (attempt < this._maxRetries)
        {
          const backoff = this._initialBackoffMs * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, backoff));
        }
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  private async _request<T>(
    method: string,
    path: string,
    options: { query?: QueryParams; body?: unknown } = {},
  ): Promise<T>
  {
    const hasBody = options.body !== undefined;
    const errorLogs = this._getErrorLogsHeader();

    const res = await fetch(this._buildUrl(path, options.query), {
      method,
      credentials: this._credentials,
      headers: this._mergedHeaders(
        hasBody ? { 'Content-Type': 'application/json' } : undefined,
        errorLogs,
      ),
      ...(hasBody ? { body: JSON.stringify(options.body) } : {}),
    });

    if (res.headers.get('X-Client-Errors-Processed') === 'true')
    {
      this._onErrorsProcessed?.();
      HttpClient.onErrorsProcessedGlobal?.();
    }

    const data = (await res.json()) as unknown;
    if (!res.ok)
    {
      const msg = isApiError(data) ? (data.message ?? data.error) : `http_error_${res.status}`;
      throw new HttpError(res.status, msg, data);
    }

    return data as T;
  }
}

function isApiError(v: unknown): v is { ok: false; error: string; message?: string } 
{
  return (
    typeof v === 'object' &&
    v !== null &&
    (v as Record<string, unknown>)['ok'] === false &&
    typeof (v as Record<string, unknown>)['error'] === 'string'
  );
}
