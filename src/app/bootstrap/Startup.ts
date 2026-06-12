import { ServiceCollection, type IServiceProvider } from '../di/ServiceCollection';
import type { AppConfig } from '../../config/AppConfig';
import type { AppElements } from './AppHost';
import {
  AppElementsToken,
  BackendOptionsToken,
  StorageOptionsToken,
  DomOptionsToken,
  EventBusToken,
  LoggerToken,
} from './tokens';

import { Logger } from '../logging/Logger';
import { EventBus, type AppEvents } from '../services/EventBus';
import { ErrorRecoveryLayer } from '../error/ErrorRecoveryLayer';
import { HttpClient } from '../http/HttpClient';
import { Announcer } from '../a11y/Announcer';
import { Input } from '../../engine/input/Input';
import { Camera2D } from '../../engine/render/Camera2D';
import { Scene } from '../../engine/core/Scene';
import { GameLoop } from '../../engine/core/GameLoop';
import { DefaultTheme } from '../theme/AppTheme';
import { AuthClient } from '../auth/AuthClient';
import { AdminClient } from '../admin/AdminClient';
import { RunsClient } from '../game/RunsClient';
import { HttpSaveStorage, LocalStorageSaveStorage } from '../save/SaveStorage';
import { HybridSaveStorage } from '../save/HybridSaveStorage';
import { SceneSerializer } from '../save/SceneSerializer';
import { SaveManager } from '../save/SaveManager';
import { Leaderboard } from '../game/Leaderboard';
import { ControlsStore } from '../controls/ControlsStore';
import { SettingsStore } from '../settings/SettingsStore';
import { RunController } from '../game/RunController';
import { GameSession } from '../game/GameSession';
import { GameController } from '../game/GameController';
import { ControlsController } from '../controls/ControlsController';
import { AccessibleOverlay } from '../ui/AccessibleOverlay';
import { AccessibilityController } from '../a11y/AccessibilityController';
import { AccountController } from '../auth/AccountController';
import { AdminMenuController } from '../admin/AdminMenuController';
import { GameSaveController } from '../save/GameSaveController';
import { GameSettingsController } from '../game/GameSettingsController';
import { ScreenNavigator } from '../ui/ScreenNavigator';
import { StartController } from '../game/StartController';
import { DeathScreen } from '../ui/DeathScreen';
import { DeathFlowController } from '../game/DeathFlowController';
import { PauseMenu } from '../ui/PauseMenu';
import { SettingsPanel } from '../ui/SettingsPanel';
import { Tutorial } from '../ui/Tutorial';
import { RegisterGate } from '../ui/RegisterGate';
import { WelcomeScreen } from '../ui/WelcomeScreen';

/**
 * Composition root, in the style of a C# Startup: configureServices registers
 * every dependency with a factory lambda, and buildApp resolves them, wires the
 * UI and starts the game. No inline lambdas are handed to the views — they all
 * receive controller services.
 */
export class Startup
{
  static configureServices(config: AppConfig, elements: AppElements): IServiceProvider
  {
    return new ServiceCollection()
      .addValue(AppElementsToken, elements)
      .configure(BackendOptionsToken, config.backend)
      .configure(StorageOptionsToken, config.storage)
      .configure(DomOptionsToken, config.dom)

      // Infrastructure
      .addSingleton(LoggerToken, () => Logger.named('Main'))
      .addSingleton(EventBusToken, () => new EventBus<AppEvents>())
      .addSingleton(ErrorRecoveryLayer, () => new ErrorRecoveryLayer())
      .addSingleton(Announcer, (sp) => new Announcer(sp.getRequiredService(AppElementsToken).srRegion))

      // Engine
      .addSingleton(Input, () => new Input(window))
      .addSingleton(Camera2D, () =>
      {
        const camera = new Camera2D();
        camera.position.set(0, 0);
        camera.zoom = 1;
        return camera;
      })
      .addSingleton(Scene, (sp) => new Scene(sp.getRequiredService(Input), sp.getRequiredService(Camera2D)))
      .addSingleton(GameLoop, (sp) =>
      {
        const elems = sp.getRequiredService(AppElementsToken);
        return new GameLoop(elems.canvas, elems.ctx, sp.getRequiredService(Scene), { clearColor: DefaultTheme.bg });
      })

      // Backend clients
      .addSingleton(AuthClient, (sp) => new AuthClient(sp.getRequiredService(BackendOptionsToken).value.baseUrl))
      .addSingleton(AdminClient, (sp) =>
        new AdminClient(sp.getRequiredService(BackendOptionsToken).value.baseUrl, sp.getRequiredService(AuthClient)))
      .addSingleton(RunsClient, (sp) =>
        new RunsClient(sp.getRequiredService(BackendOptionsToken).value.baseUrl, sp.getRequiredService(AuthClient)))

      // Save layer
      .addSingleton(LocalStorageSaveStorage, () => new LocalStorageSaveStorage())
      .addSingleton(HttpSaveStorage, (sp) => new HttpSaveStorage({
        baseUrl: sp.getRequiredService(BackendOptionsToken).value.baseUrl,
        credentials: 'include',
        headersProvider: () => sp.getRequiredService(AuthClient).authHeaders(),
      }))
      .addSingleton(HybridSaveStorage, (sp) => new HybridSaveStorage(
        sp.getRequiredService(LocalStorageSaveStorage),
        sp.getRequiredService(HttpSaveStorage),
        sp.getRequiredService(AuthClient),
      ))
      .addSingleton(SceneSerializer, () => new SceneSerializer())
      .addSingleton(SaveManager, (sp) =>
      {
        const opts = sp.getRequiredService(StorageOptionsToken).value;
        return new SaveManager(
          sp.getRequiredService(Scene),
          sp.getRequiredService(HybridSaveStorage),
          sp.getRequiredService(SceneSerializer),
          { autosaveMs: opts.autosaveMs, slot: opts.saveSlot },
        );
      })

      // Stores
      .addSingleton(Leaderboard, () => new Leaderboard())
      .addSingleton(ControlsStore, (sp) => new ControlsStore(sp.getRequiredService(StorageOptionsToken).value.controlsKey))
      .addSingleton(SettingsStore, (sp) => new SettingsStore(sp.getRequiredService(StorageOptionsToken).value.settingsKey))

      // Game lifecycle
      .addSingleton(RunController, (sp) => new RunController(sp.getRequiredService(Scene)))
      .addSingleton(GameSession, (sp) => new GameSession({
        scene: sp.getRequiredService(Scene),
        loop: sp.getRequiredService(GameLoop),
        input: sp.getRequiredService(Input),
        hudStatus: sp.getRequiredService(AppElementsToken).hudStatus,
        leaderboard: sp.getRequiredService(Leaderboard),
        events: sp.getRequiredService(EventBusToken),
      }))
      .addSingleton(GameController, (sp) => new GameController(
        sp.getRequiredService(GameLoop),
        sp.getRequiredService(Input),
        sp.getRequiredService(RunController),
        sp.getRequiredService(GameSession),
        sp.getRequiredService(ControlsStore),
        sp.getRequiredService(Announcer),
        sp.getRequiredService(AppElementsToken).canvas,
      ))

      // Controllers
      .addSingleton(ControlsController, (sp) =>
        new ControlsController(sp.getRequiredService(ControlsStore), sp.getRequiredService(RunController)))
      .addSingleton(AccessibleOverlay, (sp) =>
        new AccessibleOverlay(sp.getRequiredService(Scene), sp.getRequiredService(GameLoop)))
      .addSingleton(AccessibilityController, (sp) => new AccessibilityController(
        sp.getRequiredService(SettingsStore),
        sp.getRequiredService(AccessibleOverlay),
        sp.getRequiredService(AppElementsToken).canvas,
        sp.getRequiredService(Announcer),
      ))
      .addSingleton(AccountController, (sp) =>
        new AccountController(sp.getRequiredService(AuthClient), sp.getRequiredService(Announcer)))
      .addSingleton(AdminMenuController, (sp) => new AdminMenuController(sp.getRequiredService(AdminClient)))
      .addSingleton(GameSaveController, (sp) => new GameSaveController(
        sp.getRequiredService(SaveManager),
        sp.getRequiredService(Announcer),
        sp.getRequiredService(RunController),
        sp.getRequiredService(ControlsStore),
      ))
      .addSingleton(GameSettingsController, (sp) => new GameSettingsController(sp.getRequiredService(LoggerToken)))
      .addSingleton(ScreenNavigator, (sp) => new ScreenNavigator(sp.getRequiredService(AppElementsToken).canvas))
      .addSingleton(StartController, (sp) => new StartController(
        sp.getRequiredService(AccountController),
        sp.getRequiredService(GameController),
        sp.getRequiredService(ScreenNavigator),
      ))

      // Views
      .addSingleton(DeathScreen, (sp) => new DeathScreen({
        game: sp.getRequiredService(GameController),
        leaderboard: sp.getRequiredService(Leaderboard),
        runs: sp.getRequiredService(RunsClient),
      }))
      .addSingleton(DeathFlowController, (sp) => new DeathFlowController(
        sp.getRequiredService(EventBusToken),
        sp.getRequiredService(DeathScreen),
        sp.getRequiredService(RunsClient),
        sp.getRequiredService(Announcer),
      ))
      .addSingleton(PauseMenu, (sp) => new PauseMenu({
        game: sp.getRequiredService(GameController),
        controls: sp.getRequiredService(ControlsController),
        accessibility: sp.getRequiredService(AccessibilityController),
        save: sp.getRequiredService(GameSaveController),
        navigator: sp.getRequiredService(ScreenNavigator),
        auth: sp.getRequiredService(AccountController),
        admin: sp.getRequiredService(AdminMenuController),
      }))
      .addSingleton(SettingsPanel, (sp) => new SettingsPanel({
        navigator: sp.getRequiredService(ScreenNavigator),
        settings: sp.getRequiredService(GameSettingsController),
      }))
      .addSingleton(Tutorial, (sp) => new Tutorial({ navigator: sp.getRequiredService(ScreenNavigator) }))
      .addSingleton(RegisterGate, (sp) => new RegisterGate({
        title: 'Create an account',
        subtitle: 'Registration is required before playing.',
        auth: sp.getRequiredService(AccountController),
        start: sp.getRequiredService(StartController),
      }))
      .addSingleton(WelcomeScreen, (sp) => new WelcomeScreen({
        title: 'Arcade Survival — Demo',
        subtitle:
          'Create an account to play. Survive as long as you can, level up, and track your run stats.',
        start: sp.getRequiredService(StartController),
        navigator: sp.getRequiredService(ScreenNavigator),
      }))

      .build();
  }

  static buildApp(sp: IServiceProvider): void
  {
    const app = sp.getRequiredService(AppElementsToken).app;
    const logger = sp.getRequiredService(LoggerToken);

    HttpClient.onErrorsProcessedGlobal = () =>
    {
      Logger.getInstance().clearLogs();
      logger.info('Client error logs cleared by server');
    };
    logger.info('App initialized', { backendUrl: sp.getRequiredService(BackendOptionsToken).value.baseUrl });

    // Accessible overlay + persisted settings.
    sp.getRequiredService(AccessibleOverlay).mount(app);
    sp.getRequiredService(AccessibilityController).apply();
    sp.getRequiredService(SaveManager).startAutoSave();

    // Screens.
    sp.getRequiredService(DeathScreen).mount(app);
    sp.getRequiredService(DeathFlowController); // subscribes to 'player:died'
    const menu = sp.getRequiredService(PauseMenu);
    const settings = sp.getRequiredService(SettingsPanel);
    const tutorial = sp.getRequiredService(Tutorial);
    const registerGate = sp.getRequiredService(RegisterGate);
    const welcome = sp.getRequiredService(WelcomeScreen);
    menu.mount(app);
    settings.mount(app);
    tutorial.mount(app);
    registerGate.mount(app);
    welcome.mount(app);

    const navigator = sp.getRequiredService(ScreenNavigator);
    navigator.registerSettings(settings);
    navigator.registerTutorial(tutorial);
    navigator.registerRegister(registerGate);
    navigator.registerWelcome(welcome);

    // Auth state propagation.
    const auth = sp.getRequiredService(AuthClient);
    const eventBus = sp.getRequiredService(EventBusToken);
    auth.subscribe(() => eventBus.emit('auth:changed'));
    eventBus.on('auth:changed', () =>
    {
      menu.refresh();
      registerGate.refresh();
    });
    void auth.bootstrapSession();

    // Start.
    sp.getRequiredService(GameController).initialize();
    welcome.open();

    Startup._installLifecycle(sp);
  }

  private static _installLifecycle(sp: IServiceProvider): void
  {
    const saveManager = sp.getRequiredService(SaveManager);
    const loop = sp.getRequiredService(GameLoop);
    const input = sp.getRequiredService(Input);
    const gameSession = sp.getRequiredService(GameSession);
    const errorRecovery = sp.getRequiredService(ErrorRecoveryLayer);

    type SaveDebugApi = { save: () => void; load: () => void };
    (window as unknown as { __save: SaveDebugApi }).__save = {
      save: () => saveManager.saveNow(),
      load: () => saveManager.loadNow(),
    };

    window.addEventListener('beforeunload', () =>
    {
      loop.dispose();
      input.dispose();
      gameSession.stop();
      saveManager.stopAutoSave();
      void errorRecovery.sendErrorsToBackend();
    });
  }
}
