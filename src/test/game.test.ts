import { TestRunner } from './TestRunner';
import { Assert } from './Assert';
import { DifficultyScaler } from '../app/game/DifficultyScaler';
import { Leaderboard } from '../app/game/Leaderboard';
import { SpawnerBuilder } from '../app/game/SpawnerBuilder';

TestRunner.describe('DifficultyScaler', () =>
{
  TestRunner.it('should start at level 1 with intensity 0', () =>
  {
    const scaler = new DifficultyScaler();
    const difficulty = scaler.getCurrentDifficulty();
    Assert.assertEquals(difficulty.level, 1, 'level should be 1');
    Assert.assertTrue(difficulty.spawnRateMultiplier >= 1, 'spawn rate should be >= 1');
  });

  TestRunner.it('should increase level every 30 seconds', () =>
  {
    const scaler = new DifficultyScaler();
    scaler['startTime'] = Date.now() - 60000;

    const difficulty = scaler.getCurrentDifficulty();
    Assert.assertEquals(difficulty.level, 3, 'level should be 3 after 60 seconds');
  });

  TestRunner.it('should cap intensity at 2', () =>
  {
    const scaler = new DifficultyScaler();
    scaler['startTime'] = Date.now() - 500000;

    const difficulty = scaler.getCurrentDifficulty();
    Assert.assertTrue(
      difficulty.spawnRateMultiplier <= 2.0,
      'spawn rate should not exceed 2.0',
    );
    Assert.assertTrue(
      difficulty.enemyHealthMultiplier <= 1.8,
      'health multiplier should not exceed 1.8',
    );
  });

  TestRunner.it('should track elapsed time correctly', () =>
  {
    const scaler = new DifficultyScaler();
    scaler['startTime'] = Date.now() - 5000;

    const elapsed = scaler.getElapsedSeconds();
    Assert.assertTrue(elapsed >= 4.9 && elapsed <= 5.1, 'elapsed time should be ~5 seconds');
  });

  TestRunner.it('should reset start time on reset', () =>
  {
    const scaler = new DifficultyScaler();
    scaler['startTime'] = Date.now() - 100000;

    scaler.reset();
    const elapsed = scaler.getElapsedSeconds();
    Assert.assertTrue(elapsed < 1, 'elapsed should reset to near 0');
  });
});

TestRunner.describe('Leaderboard', () =>
{
  TestRunner.it('should add entries and rank them by time descending', () =>
  {
    const leaderboard = new Leaderboard();
    leaderboard.addEntry({
      name: 'player1@test.com',
      timeSeconds: 120,
      kills: 10,
      level: 5,
    });
    leaderboard.addEntry({
      name: 'player2@test.com',
      timeSeconds: 180,
      kills: 15,
      level: 6,
    });

    const entries = leaderboard.getAllEntries();
    Assert.assertEquals(entries.length, 2, 'should have 2 entries');
    Assert.assertEquals(entries[0].timeSeconds, 180, 'first entry should be longest time');
    Assert.assertEquals(entries[0].rank, 1, 'first entry should have rank 1');
    Assert.assertEquals(entries[1].rank, 2, 'second entry should have rank 2');
  });

  TestRunner.it('should set and retrieve personal best', () =>
  {
    const leaderboard = new Leaderboard();
    leaderboard.setPersonalBest({
      name: 'player@test.com',
      timeSeconds: 250,
      kills: 20,
      level: 7,
    });

    const pb = leaderboard.getPersonalBest();
    Assert.assertNotNull(pb, 'personal best should exist');
    Assert.assertEquals(pb!.timeSeconds, 250, 'personal best time should match');
    Assert.assertTrue(pb!.isPersonalBest === true, 'should be marked as personal best');
  });

  TestRunner.it('should return top N entries', () =>
  {
    const leaderboard = new Leaderboard();
    for (let i = 0; i < 10; i++)
    {
      leaderboard.addEntry({
        name: `player${i}@test.com`,
        timeSeconds: 100 + i * 10,
        kills: 5 + i,
        level: 2 + i,
      });
    }

    const top5 = leaderboard.getTop(5);
    Assert.assertEquals(top5.length, 5, 'should return 5 entries');
    Assert.assertEquals(top5[0].rank, 1, 'top entry should be rank 1');
    Assert.assertEquals(top5[4].rank, 5, 'last entry should be rank 5');
  });

  TestRunner.it('should clear all entries', () =>
  {
    const leaderboard = new Leaderboard();
    leaderboard.addEntry({
      name: 'player@test.com',
      timeSeconds: 100,
      kills: 10,
      level: 5,
    });
    leaderboard.setPersonalBest({
      name: 'player@test.com',
      timeSeconds: 100,
      kills: 10,
      level: 5,
    });

    leaderboard.clear();
    Assert.assertEquals(leaderboard.getAllEntries().length, 0, 'should have no entries');
    Assert.assertNull(leaderboard.getPersonalBest(), 'personal best should be null');
  });
});

TestRunner.describe('SpawnerBuilder', () =>
{
  TestRunner.it('should choose standard variant for low difficulty', () =>
  {
    let standardCount = 0;
    for (let i = 0; i < 100; i++)
    {
      const variant = SpawnerBuilder.chooseVariant(0.5);
      if (variant === 'standard') standardCount++;
    }
    Assert.assertTrue(
      standardCount > 80,
      'low difficulty should mostly spawn standard enemies',
    );
  });

  TestRunner.it('should choose fast variant for medium difficulty', () =>
  {
    let fastCount = 0;
    for (let i = 0; i < 100; i++)
    {
      const variant = SpawnerBuilder.chooseVariant(1.2);
      if (variant === 'fast') fastCount++;
    }
    Assert.assertTrue(fastCount > 10, 'medium difficulty should spawn some fast enemies');
  });

  TestRunner.it('should choose armored variant for high difficulty', () =>
  {
    let armoredCount = 0;
    for (let i = 0; i < 100; i++)
    {
      const variant = SpawnerBuilder.chooseVariant(2.0);
      if (variant === 'armored') armoredCount++;
    }
    Assert.assertTrue(armoredCount > 10, 'high difficulty should spawn some armored enemies');
  });
});
