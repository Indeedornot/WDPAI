export interface LeaderboardEntry
{
  rank: number;
  email: string;
  timeSeconds: number;
  kills: number;
  level: number;
  isPersonalBest?: boolean;
}

export class Leaderboard
{
  private entries: LeaderboardEntry[] = [];
  private personalBest: LeaderboardEntry | null = null;

  addEntry(entry: Omit<LeaderboardEntry, 'rank'>): void
  {
    const ranked: LeaderboardEntry = {
      ...entry,
      rank: this.entries.length + 1,
    };
    this.entries.push(ranked);
    this.entries.sort((a, b) => b.timeSeconds - a.timeSeconds);
    this.rerank();
  }

  setPersonalBest(entry: Omit<LeaderboardEntry, 'rank'>): void
  {
    this.personalBest = {
      ...entry,
      rank: 0,
      isPersonalBest: true,
    };
  }

  getTop(n: number): LeaderboardEntry[]
  {
    return this.entries.slice(0, n);
  }

  getPersonalBest(): LeaderboardEntry | null
  {
    return this.personalBest;
  }

  getAllEntries(): LeaderboardEntry[]
  {
    return [...this.entries];
  }

  clear(): void
  {
    this.entries = [];
    this.personalBest = null;
  }

  private rerank(): void
  {
    this.entries.forEach((entry, index) =>
    {
      entry.rank = index + 1;
    });
  }
}
