import type { RunController } from '../game/RunController';
import type { ControlsConfig } from './ControlsConfig';
import type { ControlsStore } from './ControlsStore';

/** Exposes read/update of control bindings, persisting and applying changes. */
export class ControlsController
{
  private readonly _store: ControlsStore;
  private readonly _runController: RunController;

  constructor(store: ControlsStore, runController: RunController)
  {
    this._store = store;
    this._runController = runController;
  }

  get current(): ControlsConfig
  {
    return this._store.current;
  }

  set(next: ControlsConfig): void
  {
    this._store.set(next);
    this._runController.applyControls(next);
  }
}
