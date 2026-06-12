import type { AuthClient } from '../auth/AuthClient';
import { HttpClient } from '../http/HttpClient';
import type { LeaderboardEntry } from './Leaderboard';

export type RunStatsPayload = {
  timeSeconds: number;
  level: number;
  xp: number;
  kills: number;
  shotsFired: number;
  shotsHit: number;
};

export type AchievementView = {
  code: string;
  title: string;
  earnedAt: string;
};

type ServerLeaderboardEntry = {
  userId: number;
  name: string;
  timeSeconds: number;
  kills: number;
  level: number;
  createdAt: string;
};

type LeaderboardResponse = { ok: true; leaderboard: ServerLeaderboardEntry[] };
type AchievementsResponse = { ok: true; achievements: AchievementView[] };

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

  /** Global top runs (one best run per user). Empty when logged out or on error. */
  async fetchLeaderboard(): Promise<LeaderboardEntry[]>
  {
    if (!this._auth.isLoggedIn())
    {
      return [];
    }
    try
    {
      const res = await this._http.get.json<LeaderboardResponse>('/runs/leaderboard');
      return res.leaderboard.map((e, i) => ({
        rank: i + 1,
        name: e.name,
        timeSeconds: e.timeSeconds,
        kills: e.kills,
        level: e.level,
      }));
    }
    catch
    {
      return [];
    }
  }

  /** Achievements earned by the current user. Empty when logged out or on error. */
  async fetchAchievements(): Promise<AchievementView[]>
  {
    if (!this._auth.isLoggedIn())
    {
      return [];
    }
    try
    {
      const res = await this._http.get.json<AchievementsResponse>('/me/achievements');
      return res.achievements;
    }
    catch
    {
      return [];
    }
  }
}
