import './style.css';

import { GameLoop } from './engine/core/GameLoop';
import { Scene } from './engine/core/Scene';
import { Input } from './engine/input/Input';
import {
  DefaultMovementBindingsWASD,
  DefaultShootingBindingsArrows,
} from './engine/input/DirectionalBindings2D';
import { Camera2D } from './engine/render/Camera2D';
import { CountKillToPlayerStatsOnDeath2D } from './engine/components/CountKillToPlayerStatsOnDeath2D';
import { Health } from './engine/components/Health';
import { KeyboardMove2D } from './engine/components/KeyboardMove2D';
import { RunStats } from './engine/components/RunStats';
import { Shooter2D } from './engine/components/Shooter2D';
import { WrapAroundBounds2D } from './engine/components/WrapAroundBounds2D';
import type { ControlsConfig } from './app/controls/ControlsConfig';
import { DEFAULT_CONTROLS, parseControlsConfig } from './app/controls/ControlsConfig';
import { PauseMenu } from './app/ui/PauseMenu';
import { SaveManager } from './app/save/SaveManager';
import { SceneSerializer } from './app/save/SceneSerializer';
import { HttpSaveStorage, LocalStorageSaveStorage } from './app/save/SaveStorage';
import { DefaultTheme, applyThemeToCssVars } from './app/theme/AppTheme';
import { WelcomeScreen } from './app/ui/WelcomeScreen';
import { DeathScreen } from './app/ui/DeathScreen';
import { Announcer } from './app/a11y/Announcer';
import { AccessibleOverlay } from './app/ui/AccessibleOverlay';
import { AuthClient } from './app/auth/AuthClient';
import { HybridSaveStorage } from './app/save/HybridSaveStorage';
import { AdminClient } from './app/admin/AdminClient';
import { RegisterGate } from './app/ui/RegisterGate';
import { buildRun, MAP_BOUNDS } from './app/game/RunBuilder';
import { GameSession } from './app/game/GameSession';
import { RunsClient } from './app/game/RunsClient';

const CONTROLS_KEY = 'my-ts-app:controls:v1';
const SETTINGS_KEY = 'my-ts-app:settings:v1';

function loadControls(): ControlsConfig 
{
  try 
  {
    const raw = window.localStorage.getItem(CONTROLS_KEY);
    if (!raw) 
    {
      return structuredClone(DEFAULT_CONTROLS);
    }
    return parseControlsConfig(JSON.parse(raw) as unknown);
  }
  catch 
  {
    return structuredClone(DEFAULT_CONTROLS);
  }
}

function saveControls(config: ControlsConfig): void 
{
  window.localStorage.setItem(CONTROLS_KEY, JSON.stringify(config));
}

function loadAccessibleMode(): boolean 
{
  try 
  {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) 
    {
      return false;
    }
    const parsed = JSON.parse(raw) as any;
    return Boolean(parsed?.accessibleMode);
  }
  catch 
  {
    return false;
  }
}

function saveAccessibleMode(enabled: boolean): void 
{
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({ accessibleMode: enabled }));
}

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) 
{
  throw new Error('Missing #app');
}

applyThemeToCssVars(DefaultTheme);

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

const srRegion = document.querySelector<HTMLElement>('#sr-announce');
if (!srRegion) 
{
  throw new Error('Missing #sr-announce');
}
const announcer = new Announcer(srRegion);

const hudStatus = document.querySelector<HTMLDivElement>('#hud-status');
if (!hudStatus) 
{
  throw new Error('Missing #hud-status');
}

const input = new Input(window);
const camera = new Camera2D();
camera.position.set(0, 0);
camera.zoom = 1;

const scene = new Scene(input, camera);

let accessibleMode = loadAccessibleMode();

const backendUrl = (import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8080').toString();
const auth = new AuthClient(backendUrl);
const admin = new AdminClient(backendUrl, auth);
const runsClient = new RunsClient(backendUrl, auth);

let controls: ControlsConfig = loadControls();

let { playerMove, playerShooter } = buildRun(scene, controls);

const loop = new GameLoop(canvas, ctx, scene, { clearColor: DefaultTheme.bg });
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

applyAccessibleMode(accessibleMode);

const remoteStorage = new HttpSaveStorage({
  baseUrl: backendUrl,
  credentials: 'include',
  headersProvider: () => auth.authHeaders(),
});
const saveStorage = new HybridSaveStorage(new LocalStorageSaveStorage(), remoteStorage, auth);
const saveManager = new SaveManager(scene, saveStorage, new SceneSerializer(), {
  autosaveMs: 60_000,
  slot: 'my-ts-app:save:slot1',
});
saveManager.startAutoSave();

const death = new DeathScreen({
  onRestart: () => 
  {
    loop.pause();
    input.clear();
    ({ playerMove, playerShooter } = buildRun(scene, controls));
    gameSession.reset();
    loop.resume();
    canvas.focus();
    announcer.announce('Restarted.', 'polite');
  },
});
death.mount(app);

const gameSession = new GameSession({
  scene,
  loop,
  input,
  hudStatus,
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
  getControls: () => controls,
  setControls: (next) => 
  {
    controls = next;
    saveControls(next);
    playerMove.bindings = { ...DefaultMovementBindingsWASD, ...next.movement };
    playerShooter.aimBindings = { ...DefaultShootingBindingsArrows, ...next.aim };
    playerShooter.shootKey = next.shootKey;
  },
  getAccessibleMode: () => accessibleMode,
  setAccessibleMode: (enabled) => 
  {
    accessibleMode = enabled;
    saveAccessibleMode(enabled);
    applyAccessibleMode(enabled);
    announcer.announce(
      enabled ? 'Accessible mode enabled.' : 'Accessible mode disabled.',
      'polite',
    );
  },
  onSaveNow: async () => 
  {
    try 
    {
      await saveManager.saveNow();
      announcer.announce('Saved.', 'polite');
    }
    catch 
    {
      announcer.announce('Save failed.', 'assertive');
    }
  },
  onLoadNow: async () => 
  {
    let ok = false;
    try 
    {
      ok = await saveManager.loadNow();
    }
    catch 
    {
      // loadNow failed; ok stays false
    }
    if (!ok) 
    {
      return;
    }

    announcer.announce('Loaded last save.', 'polite');

    for (const go of scene.getGameObjects()) 
    {
      if (go.tag !== 'Player') 
      {
        continue;
      }
      const move = go.getComponent(KeyboardMove2D);
      if (move) 
      {
        move.bindings = { ...DefaultMovementBindingsWASD, ...controls.movement };
      }
      const shooter = go.getComponent(Shooter2D);
      if (shooter) 
      {
        shooter.aimBindings = { ...DefaultShootingBindingsArrows, ...controls.aim };
        shooter.shootKey = controls.shootKey;
      }
      if (!go.getComponent(RunStats)) 
      {
        go.addComponent(new RunStats());
      }
      if (!go.getComponent(WrapAroundBounds2D)) 
      {
        go.addComponent(new WrapAroundBounds2D(MAP_BOUNDS));
      }
      if (move) 
      {
        playerMove = move;
      }
      if (shooter) 
      {
        playerShooter = shooter;
      }
    }

    for (const go of scene.getGameObjects()) 
    {
      if (go.tag !== 'Enemy') 
      {
        continue;
      }
      if (!go.getComponent(Health)) 
      {
        continue;
      }
      if (!go.getComponent(CountKillToPlayerStatsOnDeath2D))
      {
        go.addComponent(new CountKillToPlayerStatsOnDeath2D());
      }
    }
  },
  auth: {
    getUser: () => auth.user,
    isLoggedIn: () => auth.isLoggedIn(),
    getSessionExpiresAt: () => auth.sessionExpiresAt,
    isExpiringSoon: () => auth.isExpiringSoon(),
    register: async (email, password) => 
    {
      const user = await auth.register(email, password);
      announcer.announce(`Registered. Signed in as ${user.email}.`, 'polite');
    },
    login: async (email, password) => 
    {
      const user = await auth.login(email, password);
      announcer.announce(`Signed in as ${user.email}.`, 'polite');
    },
    logout: async () => 
    {
      await auth.logout();
      announcer.announce('Signed out.', 'polite');
    },
    refreshSession: async () => 
    {
      const user = await auth.refreshSession();
      announcer.announce(`Token refreshed for ${user.email}.`, 'polite');
      return user;
    },
  },
  admin: {
    isAdmin: () => admin.isAdminUser(),
    getUser: () => admin.currentUser(),
    listUsers: () => admin.listUsers(),
    listSaves: (userId) => admin.listSaves(userId),
    listRuns: (userId) => admin.listRuns(userId),
    listLoginAudit: () => admin.listLoginAudit(),
    setBan: (userId, banned, reason) => admin.setBan(userId, banned, reason),
  },
});
menu.mount(app);

// eslint-disable-next-line prefer-const -- forward reference: registerGate.onRegistered calls welcome.close()
let welcome: WelcomeScreen;

const registerGate = new RegisterGate({
  title: 'Create an account',
  subtitle: 'Registration is required before playing.',
  auth: {
    isLoggedIn: () => auth.isLoggedIn(),
    getUser: () => auth.user,
    register: async (email, password) => 
    {
      const user = await auth.register(email, password);
      announcer.announce(`Registered. Signed in as ${user.email}.`, 'polite');
      return user;
    },
  },
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

auth.subscribe(() => 
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
(window as any).__save = {
  save: () => saveManager.saveNow(),
  load: () => saveManager.loadNow(),
};

window.addEventListener('beforeunload', () => 
{
  loop.dispose();
  input.dispose();
  gameSession.stop();
  saveManager.stopAutoSave();
});
