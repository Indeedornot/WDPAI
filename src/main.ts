import './style.css';

import { Logger } from './app/logging/Logger';
import type { AppEvents } from './app/services/EventBus';
import { EventBus } from './app/services/EventBus';
import { ErrorRecoveryLayer } from './app/error/ErrorRecoveryLayer';
import { HttpClient } from './app/http/HttpClient';
import { GameLoop } from './engine/core/GameLoop';
import { Scene } from './engine/core/Scene';
import { Input } from './engine/input/Input';
import { Camera2D } from './engine/render/Camera2D';
import { DefaultTheme, AppThemeApplier } from './app/theme/AppTheme';
import { PauseMenu } from './app/ui/PauseMenu';
import { SaveManager } from './app/save/SaveManager';
import { SceneSerializer } from './app/save/SceneSerializer';
import { HttpSaveStorage, LocalStorageSaveStorage } from './app/save/SaveStorage';
import { GameSaveController } from './app/save/GameSaveController';
import { WelcomeScreen } from './app/ui/WelcomeScreen';
import { DeathScreen } from './app/ui/DeathScreen';
import { Announcer } from './app/a11y/Announcer';
import { AccessibleOverlay } from './app/ui/AccessibleOverlay';
import { AuthClient } from './app/auth/AuthClient';
import { AccountController } from './app/auth/AccountController';
import { HybridSaveStorage } from './app/save/HybridSaveStorage';
import { AdminClient } from './app/admin/AdminClient';
import { AdminMenuController } from './app/admin/AdminMenuController';
import { RegisterGate } from './app/ui/RegisterGate';
import { SettingsPanel } from './app/ui/SettingsPanel';
import { Tutorial } from './app/ui/Tutorial';
import { RunController } from './app/game/RunController';
import { GameSession } from './app/game/GameSession';
import { RunsClient } from './app/game/RunsClient';
import { Leaderboard } from './app/game/Leaderboard';
import { ControlsStore } from './app/controls/ControlsStore';
import { SettingsStore } from './app/settings/SettingsStore';
import {
  ServiceCollection,
  ServiceToken,
  type IServiceProvider,
  type IOptions,
} from './app/di/ServiceCollection';

// ---------------------------------------------------------------------------
// Options + element tokens (resolved through the container, IOptions-style).
// ---------------------------------------------------------------------------

type BackendOptions = { baseUrl: string };
type StorageOptions = { controlsKey: string; settingsKey: string; saveSlot: string; autosaveMs: number };
type AppElements = {
  app: HTMLDivElement;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  hudStatus: HTMLDivElement;
  srRegion: HTMLElement;
};

const BackendOptionsToken = new ServiceToken<IOptions<BackendOptions>>('BackendOptions');
const StorageOptionsToken = new ServiceToken<IOptions<StorageOptions>>('StorageOptions');
const AppElementsToken = new ServiceToken<AppElements>('AppElements');
const EventBusToken = new ServiceToken<EventBus<AppEvents>>('EventBus');
// Logger has a private constructor (static factory), so it is keyed by a token.
const LoggerToken = new ServiceToken<Logger>('Logger');

// ---------------------------------------------------------------------------
// DOM bootstrap.
// ---------------------------------------------------------------------------

function resolveAppElements(): AppElements
{
  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app)
  {
    throw new Error('Missing #app');
  }

  AppThemeApplier.apply(DefaultTheme);

  app.innerHTML = `
    <div class="hud">
      <div class="hud-actions" id="hud-actions"></div>
      <div class="status" id="hud-status" aria-live="polite"></div>
    </div>
    <div id="sr-instructions" class="sr-only">
      Controls: WASD to move. Arrow keys to aim. Space to shoot. Press Escape to open the hub menu.
      Use Tab and Shift+Tab to navigate menus. The canvas is visual; key events will be announced.
    </div>
    <div id="sr-announce" class="sr-only" role="status" aria-live="polite" aria-atomic="true"></div>
    <canvas id="game" tabindex="0" role="img" aria-label="Game canvas" aria-describedby="sr-instructions">
      This demo is a canvas game. If you cannot see the canvas, use the hub menu (Escape) for options and save/load.
    </canvas>
  `;

  const canvas = document.querySelector<HTMLCanvasElement>('#game');
  if (!canvas)
  {
    throw new Error('Missing #game canvas');
  }
  const ctx = canvas.getContext('2d');
  if (!ctx)
  {
    throw new Error('Canvas 2D context unavailable');
  }
  const hudStatus = document.querySelector<HTMLDivElement>('#hud-status');
  if (!hudStatus)
  {
    throw new Error('Missing #hud-status');
  }
  const srRegion = document.querySelector<HTMLElement>('#sr-announce');
  if (!srRegion)
  {
    throw new Error('Missing #sr-announce');
  }

  return { app, canvas, ctx, hudStatus, srRegion };
}

// ---------------------------------------------------------------------------
// Composition root: register every service with a factory lambda.
// ---------------------------------------------------------------------------

function buildServiceProvider(elements: AppElements): IServiceProvider
{
  const backendUrl = (import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8080').toString();

  return new ServiceCollection()
    .addValue(AppElementsToken, elements)
    .configure(BackendOptionsToken, { baseUrl: backendUrl })
    .configure(StorageOptionsToken, {
      controlsKey: 'my-ts-app:controls:v1',
      settingsKey: 'my-ts-app:settings:v1',
      saveSlot: 'my-ts-app:save:slot1',
      autosaveMs: 60_000,
    })

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

    // Game + persistence stores
    .addSingleton(Leaderboard, () => new Leaderboard())
    .addSingleton(ControlsStore, (sp) => new ControlsStore(sp.getRequiredService(StorageOptionsToken).value.controlsKey))
    .addSingleton(SettingsStore, (sp) => new SettingsStore(sp.getRequiredService(StorageOptionsToken).value.settingsKey))
    .addSingleton(RunController, (sp) => new RunController(sp.getRequiredService(Scene)))

    // Controllers (self-configuring adapters)
    .addSingleton(AccountController, (sp) =>
      new AccountController(sp.getRequiredService(AuthClient), sp.getRequiredService(Announcer)))
    .addSingleton(AdminMenuController, (sp) => new AdminMenuController(sp.getRequiredService(AdminClient)))
    .addSingleton(GameSaveController, (sp) => new GameSaveController(
      sp.getRequiredService(SaveManager),
      sp.getRequiredService(Announcer),
      sp.getRequiredService(RunController),
      sp.getRequiredService(ControlsStore),
    ))

    .build();
}

// ---------------------------------------------------------------------------
// Application wiring.
// ---------------------------------------------------------------------------

const elements = resolveAppElements();
const services = buildServiceProvider(elements);

const { app, canvas } = elements;
const logger = services.getRequiredService(LoggerToken);
const eventBus = services.getRequiredService(EventBusToken);
const errorRecovery = services.getRequiredService(ErrorRecoveryLayer);
const announcer = services.getRequiredService(Announcer);
const input = services.getRequiredService(Input);
const scene = services.getRequiredService(Scene);
const loop = services.getRequiredService(GameLoop);
const auth = services.getRequiredService(AuthClient);
const runsClient = services.getRequiredService(RunsClient);
const saveManager = services.getRequiredService(SaveManager);
const leaderboard = services.getRequiredService(Leaderboard);
const controlsStore = services.getRequiredService(ControlsStore);
const settingsStore = services.getRequiredService(SettingsStore);
const runController = services.getRequiredService(RunController);
const account = services.getRequiredService(AccountController);
const adminMenu = services.getRequiredService(AdminMenuController);
const saveController = services.getRequiredService(GameSaveController);

HttpClient.onErrorsProcessedGlobal = () =>
{
  Logger.getInstance().clearLogs();
  logger.info('Client error logs cleared by server');
};
logger.info('App initialized', { backendUrl: services.getRequiredService(BackendOptionsToken).value.baseUrl });

runController.build(controlsStore.current);
loop.start();
loop.pause();
announcer.announce('Welcome. Press Start to begin.', 'polite');

const accessibleOverlay = new AccessibleOverlay(scene, { getPaused: () => loop.paused });
accessibleOverlay.mount(app);

const applyAccessibleMode = (enabled: boolean) =>
{
  accessibleOverlay.setEnabled(enabled);
  canvas.style.opacity = enabled ? '0.22' : '1';
  canvas.setAttribute('aria-hidden', enabled ? 'true' : 'false');
};
applyAccessibleMode(settingsStore.accessibleMode);

saveManager.startAutoSave();

const death = new DeathScreen({
  onRestart: () =>
  {
    loop.pause();
    input.clear();
    runController.build(controlsStore.current);
    gameSession.reset();
    loop.resume();
    canvas.focus();
    announcer.announce('Restarted.', 'polite');
  },
  leaderboard,
  loadLeaderboard: () => runsClient.fetchLeaderboard(),
  loadAchievements: () => runsClient.fetchAchievements(),
});
death.mount(app);

const gameSession = new GameSession({
  scene,
  loop,
  input,
  hudStatus: elements.hudStatus,
  leaderboard,
  onDeath: (stats) =>
  {
    runsClient.submitRun(stats);
    death.open(stats);
    announcer.announce('You died. Restart is available.', 'assertive');
  },
});
gameSession.start();

const menu = new PauseMenu({
  onPause: () =>
  {
    loop.pause();
    announcer.announce('Paused.', 'polite');
  },
  onResume: () =>
  {
    loop.resume();
    input.clear();
    announcer.announce('Resumed.', 'polite');
  },
  getControls: () => controlsStore.current,
  setControls: (next) =>
  {
    controlsStore.set(next);
    runController.applyControls(next);
  },
  getAccessibleMode: () => settingsStore.accessibleMode,
  setAccessibleMode: (enabled) =>
  {
    settingsStore.setAccessibleMode(enabled);
    applyAccessibleMode(enabled);
    announcer.announce(enabled ? 'Accessible mode enabled.' : 'Accessible mode disabled.', 'polite');
  },
  onSaveNow: () => saveController.saveNow(),
  onLoadNow: () => saveController.loadNow(),
  auth: account,
  admin: adminMenu,
  onSettings: () => settings.open(),
  onTutorial: () => tutorial.open(),
});
menu.mount(app);

const settings = new SettingsPanel({
  onClose: () => canvas.focus(),
  onDifficultyChange: (difficulty) => logger.info('Difficulty changed', { difficulty }),
  onEffectsToggle: (enabled) => logger.info('Effects toggled', { enabled }),
});
settings.mount(app);

const tutorial = new Tutorial({ onClose: () => canvas.focus() });
tutorial.mount(app);

// eslint-disable-next-line prefer-const -- forward reference: registerGate.onRegistered calls welcome.close()
let welcome: WelcomeScreen;

const registerGate = new RegisterGate({
  title: 'Create an account',
  subtitle: 'Registration is required before playing.',
  auth: account,
  onRegistered: () =>
  {
    input.clear();
    loop.resume();
    canvas.focus();
    welcome.close();
    announcer.announce('Started.', 'polite');
  },
});
registerGate.mount(app);

auth.subscribe(() => eventBus.emit('auth:changed'));
eventBus.on('auth:changed', () =>
{
  menu.refresh();
  registerGate.refresh();
});
void auth.bootstrapSession();

welcome = new WelcomeScreen({
  title: 'Arcade Survival — Demo',
  subtitle:
    'Create an account to play. Survive as long as you can, level up, and track your run stats.',
  onStart: () =>
  {
    if (!auth.isLoggedIn())
    {
      registerGate.open();
      return;
    }
    input.clear();
    loop.resume();
    canvas.focus();
    announcer.announce('Started.', 'polite');
  },
});
welcome.mount(app);
welcome.open();

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
