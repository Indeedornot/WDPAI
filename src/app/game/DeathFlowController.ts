import type { Announcer } from '../a11y/Announcer';
import type { EventBus, AppEvents } from '../services/EventBus';
import type { DeathScreen } from '../ui/DeathScreen';
import type { RunsClient } from './RunsClient';

/**
 * Reacts to the 'player:died' event: records the run and opens the death
 * screen. Decouples the game session (which only emits) from the UI flow.
 */
export class DeathFlowController
{
  private readonly _deathScreen: DeathScreen;
  private readonly _runs: RunsClient;
  private readonly _announcer: Announcer;

  constructor(events: EventBus<AppEvents>, deathScreen: DeathScreen, runs: RunsClient, announcer: Announcer)
  {
    this._deathScreen = deathScreen;
    this._runs = runs;
    this._announcer = announcer;
    events.on('player:died', (stats) => this._onDeath(stats));
  }

  private _onDeath(stats: AppEvents['player:died']): void
  {
    this._runs.submitRun(stats);
    this._deathScreen.open(stats);
    this._announcer.announce('You died. Restart is available.', 'assertive');
  }
}
