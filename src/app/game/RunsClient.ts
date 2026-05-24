import type { AuthClient } from '../auth/AuthClient';
import { HttpClient } from '../http/HttpClient';

export type RunStatsPayload = {
  timeSeconds: number;
  level: number;
  xp: number;
  kills: number;
  shotsFired: number;
  shotsHit: number;
};

export class RunsClient 
{
  private readonly _http: HttpClient;
  private readonly _auth: AuthClient;

  constructor(baseUrl: string, auth: AuthClient) 
  {
    this._auth = auth;
    this._http = new HttpClient(baseUrl, {
      credentials: 'include',
      headersProvider: () => auth.authHeaders(),
    });
  }

  submitRun(stats: RunStatsPayload): void 
  {
    if (!this._auth.isLoggedIn()) 
    {
      return;
    }
    void this._http.post.json('/runs', stats).catch(() => 
    {
      // Best-effort — run stats are non-critical.
    });
  }
}
