export interface DifficultyLevel
{
  spawnRateMultiplier: number;
  enemySpeedMultiplier: number;
  enemyHealthMultiplier: number;
  level: number;
}

export class DifficultyScaler
{
  private startTime: number = Date.now();

  getCurrentDifficulty(): DifficultyLevel
  {
    const elapsedSeconds = (Date.now() - this.startTime) / 1000;

    const level = Math.floor(elapsedSeconds / 30) + 1;
    const intensity = Math.min(elapsedSeconds / 300, 2);

    return {
      level,
      spawnRateMultiplier: 1 + intensity * 0.5,
      enemySpeedMultiplier: 1 + intensity * 0.3,
      enemyHealthMultiplier: 1 + intensity * 0.4,
    };
  }

  reset(): void
  {
    this.startTime = Date.now();
  }

  getElapsedSeconds(): number
  {
    return (Date.now() - this.startTime) / 1000;
  }
}
