export type QueryParams = Record<string, string | number | boolean | null | undefined>;

export type HttpClientOptions = {
  credentials?: RequestCredentials;
  /** Static headers merged into every request. */
  headers?: Record<string, string>;
  /** Called per-request so tokens are always fresh. Merged after static headers. */
  headersProvider?: () => Record<string, string>;
};

export class HttpError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, message: string, body?: unknown) {
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

export class HttpClient {
  private readonly _baseUrl: string;
  private readonly _credentials: RequestCredentials | undefined;
  private readonly _staticHeaders: Record<string, string>;
  private readonly _headersProvider: (() => Record<string, string>) | undefined;

  readonly get: GetVerb;
  readonly post: PostVerb;
  readonly delete: DeleteVerb;

  constructor(baseUrl: string, options: HttpClientOptions = {}) {
    this._baseUrl = baseUrl.replace(/\/$/, '');
    this._credentials = options.credentials;
    this._staticHeaders = options.headers ?? {};
    this._headersProvider = options.headersProvider;

    this.get = {
      json: <T>(path: string, query?: QueryParams) => this._request<T>('GET', path, { query }),
    };

    this.post = {
      json: <T>(path: string, body?: unknown) => this._request<T>('POST', path, { body }),
    };

    this.delete = {
      json: <T>(path: string, query?: QueryParams) => this._request<T>('DELETE', path, { query }),
    };
  }

  private _buildUrl(path: string, query?: QueryParams): string {
    const base = `${this._baseUrl}${path}`;
    if (!query) return base;

    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v != null) params.set(k, String(v));
    }
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  }

  private _mergedHeaders(extra?: Record<string, string>): Record<string, string> {
    return {
      ...this._staticHeaders,
      ...(this._headersProvider?.() ?? {}),
      ...extra,
    };
  }

  private async _request<T>(
    method: string,
    path: string,
    options: { query?: QueryParams; body?: unknown } = {},
  ): Promise<T> {
    const hasBody = options.body !== undefined;
    const res = await fetch(this._buildUrl(path, options.query), {
      method,
      credentials: this._credentials,
      headers: this._mergedHeaders(hasBody ? { 'Content-Type': 'application/json' } : undefined),
      ...(hasBody ? { body: JSON.stringify(options.body) } : {}),
    });

    const data = (await res.json()) as unknown;
    if (!res.ok) {
      const msg = isApiError(data) ? (data.message ?? data.error) : `http_error_${res.status}`;
      throw new HttpError(res.status, msg, data);
    }

    return data as T;
  }
}

function isApiError(v: unknown): v is { ok: false; error: string; message?: string } {
  return (
    typeof v === 'object' &&
    v !== null &&
    (v as Record<string, unknown>)['ok'] === false &&
    typeof (v as Record<string, unknown>)['error'] === 'string'
  );
}
