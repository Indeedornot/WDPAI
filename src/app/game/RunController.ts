import type { Scene } from '../../engine/core/Scene';
import { KeyboardMove2D } from '../../engine/components/KeyboardMove2D';
import { Shooter2D } from '../../engine/components/Shooter2D';
import {
  DefaultMovementBindingsWASD,
  DefaultShootingBindingsArrows,
} from '../../engine/input/DirectionalBindings2D';
import type { ControlsConfig } from '../controls/ControlsConfig';
import { RunBuilder } from './RunBuilder';

/**
 * Owns the player/run lifecycle: builds a run, keeps references to the active
 * player's movement and shooter components, and applies control rebindings.
 * Replaces the scattered `playerMove`/`playerShooter` module variables that
 * the bootstrap mutated from several places.
 */
export class RunController
{
  private readonly _scene: Scene;
  private _move: KeyboardMove2D | null = null;
  private _shooter: Shooter2D | null = null;

  constructor(scene: Scene)
  {
    this._scene = scene;
  }

  /** Builds (or rebuilds) the run and captures the player components. */
  build(controls: ControlsConfig): void
  {
    const result = RunBuilder.build(this._scene, controls);
    this._move = result.playerMove;
    this._shooter = result.playerShooter;
  }

  /** Applies the given controls to the currently tracked player components. */
  applyControls(controls: ControlsConfig): void
  {
    if (this._move)
    {
      this._move.bindings = { ...DefaultMovementBindingsWASD, ...controls.movement };
    }
    if (this._shooter)
    {
      this._shooter.aimBindings = { ...DefaultShootingBindingsArrows, ...controls.aim };
      this._shooter.shootKey = controls.shootKey;
    }
  }

  /** Re-acquires the player components from the scene (after a save load). */
  rebindFromScene(controls: ControlsConfig): void
  {
    for (const go of this._scene.getGameObjects())
    {
      if (go.tag !== 'Player')
      {
        continue;
      }
      const move = go.getComponent(KeyboardMove2D);
      if (move)
      {
        this._move = move;
      }
      const shooter = go.getComponent(Shooter2D);
      if (shooter)
      {
        this._shooter = shooter;
      }
    }
    this.applyControls(controls);
  }
}
