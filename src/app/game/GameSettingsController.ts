import type { Logger } from '../logging/Logger';

export type Difficulty = 'easy' | 'normal' | 'hard';

/** Handles game-settings changes coming from the settings panel. */
export class GameSettingsController
{
  private readonly _logger: Logger;

  constructor(logger: Logger)
  {
    this._logger = logger;
  }

  setDifficulty(difficulty: Difficulty): void
  {
    this._logger.info('Difficulty changed', { difficulty });
  }

  setEffects(enabled: boolean): void
  {
    this._logger.info('Effects toggled', { enabled });
  }
}
