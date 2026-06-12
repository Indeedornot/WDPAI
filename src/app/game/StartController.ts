import type { AccountController } from '../auth/AccountController';
import type { ScreenNavigator } from '../ui/ScreenNavigator';
import type { GameController } from './GameController';

/**
 * Owns the "start playing" flow: require registration when signed out, then
 * begin play. Keeps that decision out of the welcome/register views.
 */
export class StartController
{
  private readonly _account: AccountController;
  private readonly _game: GameController;
  private readonly _navigator: ScreenNavigator;

  constructor(account: AccountController, game: GameController, navigator: ScreenNavigator)
  {
    this._account = account;
    this._game = game;
    this._navigator = navigator;
  }

  /** Invoked from the welcome screen's Start button. */
  start(): void
  {
    if (this._account.isLoggedIn())
    {
      this._game.play();
      return;
    }
    this._navigator.openRegister();
  }

  /** Invoked once registration succeeds. */
  completeRegistration(): void
  {
    this._navigator.closeWelcome();
    this._game.play();
  }
}
