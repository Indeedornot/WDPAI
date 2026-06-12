import type { GameLoop } from '../../engine/core/GameLoop';
import type { Input } from '../../engine/input/Input';
import type { Announcer } from '../a11y/Announcer';
import type { ControlsStore } from '../controls/ControlsStore';
import type { GameSession } from './GameSession';
import type { RunController } from './RunController';

/**
 * Drives the game lifecycle (initialise, play, pause, resume, restart) so the
 * UI can call intent methods instead of receiving loop/input/announcer lambdas.
 */
export class GameController
{
  private readonly _loop: GameLoop;
  private readonly _input: Input;
  private readonly _runController: RunController;
  private readonly _session: GameSession;
  private readonly _controls: ControlsStore;
  private readonly _announcer: Announcer;
  private readonly _canvas: HTMLCanvasElement;

  constructor(
    loop: GameLoop,
    input: Input,
    runController: RunController,
    session: GameSession,
    controls: ControlsStore,
    announcer: Announcer,
    canvas: HTMLCanvasElement,
  )
  {
    this._loop = loop;
    this._input = input;
    this._runController = runController;
    this._session = session;
    this._controls = controls;
    this._announcer = announcer;
    this._canvas = canvas;
  }

  /** Builds the first run and starts the (initially paused) render loop. */
  initialize(): void
  {
    this._runController.build(this._controls.current);
    this._loop.start();
    this._loop.pause();
    this._session.start();
    this._announcer.announce('Welcome. Press Start to begin.', 'polite');
  }

  /** Begins play from the welcome/paused state. */
  play(): void
  {
    this._input.clear();
    this._loop.resume();
    this._canvas.focus();
    this._announcer.announce('Started.', 'polite');
  }

  pause(): void
  {
    this._loop.pause();
    this._announcer.announce('Paused.', 'polite');
  }

  resume(): void
  {
    this._loop.resume();
    this._input.clear();
    this._announcer.announce('Resumed.', 'polite');
  }

  restart(): void
  {
    this._loop.pause();
    this._input.clear();
    this._runController.build(this._controls.current);
    this._session.reset();
    this._loop.resume();
    this._canvas.focus();
    this._announcer.announce('Restarted.', 'polite');
  }
}
