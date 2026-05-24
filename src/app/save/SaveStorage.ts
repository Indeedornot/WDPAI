export interface SaveStorage {
  load(slot: string): Promise<string | null>;
  save(slot: string, data: string): Promise<void>;
  remove(slot: string): Promise<void>;
}

export type HttpSaveStorageOptions = {
  baseUrl: string;
  basePath?: string;
  credentials?: RequestCredentials;
  headers?: Record<string, string>;
  headersProvider?: () => Record<string, string>;
};

/**
 * SaveStorage implementation backed by an HTTP API.
 *
 * Expected endpoints:
 * - GET    {baseUrl}{basePath}/save?slot=...
 * - POST   {baseUrl}{basePath}/save  { slot, snapshot }
 * - DELETE {baseUrl}{basePath}/save?slot=...
 */
export class HttpSaveStorage implements SaveStorage {
  readonly baseUrl: string;
  readonly basePath: string;
  readonly credentials?: RequestCredentials;
  readonly headers: Record<string, string>;
  readonly headersProvider?: () => Record<string, string>;

  constructor(options: HttpSaveStorageOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.basePath = (options.basePath ?? '').replace(/\/$/, '');
    this.credentials = options.credentials;
    this.headers = options.headers ?? {};
    this.headersProvider = options.headersProvider;
  }

  async load(slot: string): Promise<string | null> {
    const url = this.url(`/save?slot=${encodeURIComponent(slot)}`);
    const headers = this.headersProvider ? this.headersProvider() : this.headers;
    const res = await fetch(url, {
      method: 'GET',
      credentials: this.credentials,
      headers: {
        ...headers,
      },
    });

    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Failed to load save: ${res.status}`);

    const body = (await res.json()) as any;
    if (!body || body.ok !== true) return null;
    return JSON.stringify(body.snapshot ?? null);
  }

  async save(slot: string, data: string): Promise<void> {
    const url = this.url('/save');
    const snapshot = JSON.parse(data);
    const headers = this.headersProvider ? this.headersProvider() : this.headers;

    const res = await fetch(url, {
      method: 'POST',
      credentials: this.credentials,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({ slot, snapshot }),
    });

    if (!res.ok) throw new Error(`Failed to save: ${res.status}`);
  }

  async remove(slot: string): Promise<void> {
    const url = this.url(`/save?slot=${encodeURIComponent(slot)}`);
    const headers = this.headersProvider ? this.headersProvider() : this.headers;
    const res = await fetch(url, {
      method: 'DELETE',
      credentials: this.credentials,
      headers: {
        ...headers,
      },
    });
    if (!res.ok) throw new Error(`Failed to delete save: ${res.status}`);
  }

  private url(path: string): string {
    return `${this.baseUrl}${this.basePath}${path}`;
  }
}

export class LocalStorageSaveStorage implements SaveStorage {
  async load(slot: string): Promise<string | null> {
    return window.localStorage.getItem(slot);
  }

  async save(slot: string, data: string): Promise<void> {
    window.localStorage.setItem(slot, data);
  }

  async remove(slot: string): Promise<void> {
    window.localStorage.removeItem(slot);
  }
}
