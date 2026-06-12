import type { Announcer } from '../a11y/Announcer';
import type { ControlsStore } from '../controls/ControlsStore';
import type { RunController } from '../game/RunController';
import type { SaveManager } from './SaveManager';

/**
 * Coordinates manual save/load: drives the SaveManager, announces the result,
 * and re-binds the player controls after a load. Replaces the onSaveNow /
 * onLoadNow lambdas that were inlined in the app bootstrap.
 */
export class GameSaveController
{
  private readonly _saveManager: SaveManager;
  private readonly _announcer: Announcer;
  private readonly _runController: RunController;
  private readonly _controls: ControlsStore;

  constructor(saveManager: SaveManager, announcer: Announcer, runController: RunController, controls: ControlsStore)
  {
    this._saveManager = saveManager;
    this._announcer = announcer;
    this._runController = runController;
    this._controls = controls;
  }

  async saveNow(): Promise<void>
  {
    try
    {
      await this._saveManager.saveNow();
      this._announcer.announce('Saved.', 'polite');
    }
    catch
    {
      this._announcer.announce('Save failed.', 'assertive');
    }
  }

  async loadNow(): Promise<void>
  {
    let ok = false;
    try
    {
      ok = await this._saveManager.loadNow();
    }
    catch
    {
      // loadNow failed; ok stays false
    }
    if (!ok)
    {
      return;
    }

    this._announcer.announce('Loaded last save.', 'polite');
    this._runController.rebindFromScene(this._controls.current);
  }
}
