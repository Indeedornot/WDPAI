import './style.css'

import {
  AabbCollider2D,
  Camera2D,
  DamageOnCollision2D,
  DefaultMovementBindingsWASD,
  DefaultShootingBindingsArrows,
  DebugGridRenderer2D,
  CountKillToPlayerStatsOnDeath2D,
  DropPowerupOnDeath2D,
  DestroyWhenDead,
  Experience,
  GameLoop,
  GameObject,
  GrantXpToPlayerOnDeath2D,
  Health,
  HealthBarRenderer2D,
  Input,
  KeyboardMove2D,
  ChasePlayer2D,
  KnockbackOnCollision2D,
  Mover2D,
  EnemySpawner2D,
  PowerupController2D,
  PowerupPickup2D,
  RunStats,
  Shooter2D,
  Scene,
  Spin2D,
  SpriteRenderer2D,
  Vec2,
  VelocityDamping2D,
  WrapAroundBounds2D,
} from './engine'
import type { ControlsConfig } from './app/controls/ControlsConfig'
import { DEFAULT_CONTROLS, parseControlsConfig } from './app/controls/ControlsConfig'
import { PauseMenu } from './app/ui/PauseMenu'
import { SaveManager } from './app/save/SaveManager'
import { SceneSerializer } from './app/save/SceneSerializer'
import { HttpSaveStorage, LocalStorageSaveStorage } from './app/save/SaveStorage'
import { DefaultTheme, applyThemeToCssVars } from './app/theme/AppTheme'
import { WelcomeScreen } from './app/ui/WelcomeScreen'
import { DeathScreen } from './app/ui/DeathScreen'
import { Announcer } from './app/a11y/Announcer'
import { AccessibleOverlay } from './app/ui/AccessibleOverlay'
import { AuthClient } from './app/auth/AuthClient'
import { HybridSaveStorage } from './app/save/HybridSaveStorage'
import { AdminClient } from './app/admin/AdminClient'

const CONTROLS_KEY = 'my-ts-app:controls:v1'
const SETTINGS_KEY = 'my-ts-app:settings:v1'

function loadControls(): ControlsConfig {
  try {
    const raw = window.localStorage.getItem(CONTROLS_KEY)
    if (!raw) return structuredClone(DEFAULT_CONTROLS)
    return parseControlsConfig(JSON.parse(raw) as unknown)
  } catch {
    return structuredClone(DEFAULT_CONTROLS)
  }
}

function saveControls(config: ControlsConfig): void {
  window.localStorage.setItem(CONTROLS_KEY, JSON.stringify(config))
}

function loadAccessibleMode(): boolean {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY)
    if (!raw) return false
    const parsed = JSON.parse(raw) as any
    return Boolean(parsed?.accessibleMode)
  } catch {
    return false
  }
}

function saveAccessibleMode(enabled: boolean): void {
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({ accessibleMode: enabled }))
}

const app = document.querySelector<HTMLDivElement>('#app')
if (!app) throw new Error('Missing #app')

applyThemeToCssVars(DefaultTheme)

app.innerHTML = `
  <div class="hud">
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
`

const canvas = document.querySelector<HTMLCanvasElement>('#game')
if (!canvas) throw new Error('Missing #game canvas')

const ctx = canvas.getContext('2d')
if (!ctx) throw new Error('Canvas 2D context unavailable')

const srRegion = document.querySelector<HTMLElement>('#sr-announce')
if (!srRegion) throw new Error('Missing #sr-announce')
const announcer = new Announcer(srRegion)

const hudStatus = document.querySelector<HTMLDivElement>('#hud-status')
if (!hudStatus) throw new Error('Missing #hud-status')

const input = new Input(window)
const camera = new Camera2D()
camera.position.set(0, 0)
camera.zoom = 1

const scene = new Scene(input, camera)

let accessibleMode = loadAccessibleMode()

const backendUrl = (import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8080').toString()
const auth = new AuthClient(backendUrl)
const admin = new AdminClient(backendUrl, auth)

let controls: ControlsConfig = loadControls()

let player: GameObject
let playerMove: KeyboardMove2D
let playerShooter: Shooter2D

let isDead = false

const MAP_BOUNDS = { minX: -1100, maxX: 1100, minY: -1100, maxY: 1100 }

const buildRun = () => {
  scene.clearImmediate()
  isDead = false

  // Debug grid at the camera origin.
  const grid = new GameObject('Grid')
  grid.addComponent(
    new DebugGridRenderer2D({
      step: 100,
      color: DefaultTheme.canvasGrid,
      axisColor: DefaultTheme.canvasAxis,
    }),
  )
  scene.add(grid)

  // Player (composition): SpriteRenderer2D + Mover2D + KeyboardMove2D + Spin2D
  player = new GameObject('Player')
  player.tag = 'Player'
  player.transform.position.set(200, -200)
  player.addComponent(
    new SpriteRenderer2D({
      size: new Vec2(80, 80),
      color: DefaultTheme.accent,
      strokeColor: DefaultTheme.canvasOutline,
      shape: 'rect',
      label: 'P',
    }),
  )
  player.addComponent(new AabbCollider2D(new Vec2(80, 80)))
  player.addComponent(new Health({ max: 100 }))
  player.addComponent(
    new HealthBarRenderer2D({
      offset: new Vec2(0, -70),
      fillColor: DefaultTheme.ok,
      borderColor: DefaultTheme.canvasOutline,
    }),
  )
  player.addComponent(new Mover2D())
  player.addComponent(new VelocityDamping2D({ damping: 10 }))
  player.addComponent(new Experience({ level: 1, xp: 0 }))
  player.addComponent(new PowerupController2D())
  player.addComponent(new RunStats())
  player.addComponent(new WrapAroundBounds2D(MAP_BOUNDS))
  playerMove = player.addComponent(new KeyboardMove2D({ speed: 320 }))
  player.addComponent(new Spin2D({ radiansPerSecond: Math.PI * 0.6 }))
  player.addComponent(new KnockbackOnCollision2D({ otherTag: 'Enemy', force: 420, applyToSelf: true, applyToOther: true, otherForceMultiplier: 0.8 }))
  playerShooter = player.addComponent(
    new Shooter2D({
      fallbackToMoveVelocity: false,
      projectileVictimTag: 'Enemy',
      projectileDamage: 15,
      fireRatePerSecond: 7,
      projectileColor: DefaultTheme.ok,
    }),
  )

  // Apply persisted/default controls
  playerMove.bindings = { ...DefaultMovementBindingsWASD, ...controls.movement }
  playerShooter.aimBindings = { ...DefaultShootingBindingsArrows, ...controls.aim }
  playerShooter.shootKey = controls.shootKey
  scene.add(player)

const spawnPowerup = (x: number, y: number) => {
  const kinds = [
    { kind: 'doubleShot' as const, label: '2x', color: DefaultTheme.ok },
    { kind: 'stickyProjectiles' as const, label: 'S', color: DefaultTheme.accent },
  ]
  const pick = kinds[Math.floor(Math.random() * kinds.length)] ?? kinds[0]

  const go = new GameObject('Powerup')
  go.tag = 'Powerup'
  go.transform.position.set(x, y)

  go.addComponent(
    new SpriteRenderer2D({
      size: new Vec2(34, 34),
      color: pick.color,
      strokeColor: DefaultTheme.canvasOutline,
      shape: 'rect',
      label: pick.label,
    }),
  )

  const col = go.addComponent(new AabbCollider2D(new Vec2(34, 34)))
  col.isTrigger = true
  go.addComponent(new PowerupPickup2D({ kind: pick.kind, durationSeconds: 10 }))
  return go
}

  const spawnEnemy = (pos: Vec2, n: number) => {
  const enemy = new GameObject(`Enemy${n}`)
  enemy.tag = 'Enemy'
  enemy.transform.position.set(pos.x, pos.y)

  const size = 46 + (n % 4) * 6
  enemy.addComponent(
    new SpriteRenderer2D({
      size: new Vec2(size, size),
      color: DefaultTheme.primary,
      strokeColor: DefaultTheme.canvasOutline,
      shape: n % 2 === 0 ? 'circle' : 'diamond',
      label: 'E',
    }),
  )
  enemy.addComponent(new AabbCollider2D(new Vec2(size, size)))
  enemy.addComponent(new Health({ max: 50 }))
  enemy.addComponent(
    new HealthBarRenderer2D({
      offset: new Vec2(0, -size - 5),
      fillColor: DefaultTheme.primary,
      borderColor: DefaultTheme.canvasOutline,
    }),
  )
  enemy.addComponent(new GrantXpToPlayerOnDeath2D({ xp: 8 }))
  enemy.addComponent(new CountKillToPlayerStatsOnDeath2D())
  enemy.addComponent(new DropPowerupOnDeath2D({ chance: 0.22, factory: spawnPowerup }))
  enemy.addComponent(new DestroyWhenDead())
  enemy.addComponent(new DamageOnCollision2D({ damage: 10, victimTag: 'Player', oncePerContact: true }))
  enemy.addComponent(new Mover2D())
  enemy.addComponent(new VelocityDamping2D({ damping: 6 }))
  enemy.addComponent(new ChasePlayer2D({ speed: 170, stopDistance: 28 }))
  return enemy
}

  // Auto-moving target
  const target = new GameObject('Target')
  target.tag = 'Enemy'
  target.transform.position.set(500, -320)
  target.addComponent(
    new SpriteRenderer2D({
      size: new Vec2(60, 60),
      color: DefaultTheme.primary,
      strokeColor: DefaultTheme.canvasOutline,
      shape: 'circle',
      label: 'E',
    }),
  )
  target.addComponent(new AabbCollider2D(new Vec2(60, 60)))
  target.addComponent(new Health({ max: 60 }))
  target.addComponent(
    new HealthBarRenderer2D({
      offset: new Vec2(0, -55),
      fillColor: DefaultTheme.primary,
      borderColor: DefaultTheme.canvasOutline,
    }),
  )
  target.addComponent(new GrantXpToPlayerOnDeath2D({ xp: 12 }))
  target.addComponent(new CountKillToPlayerStatsOnDeath2D())
  target.addComponent(new DropPowerupOnDeath2D({ chance: 0.35, factory: spawnPowerup }))
  target.addComponent(new DestroyWhenDead())
  target.addComponent(new DamageOnCollision2D({ damage: 12, victimTag: 'Player', oncePerContact: true }))
  target.addComponent(new Mover2D())
  target.addComponent(new VelocityDamping2D({ damping: 6 }))
  target.addComponent(new ChasePlayer2D({ speed: 150, stopDistance: 34 }))
  scene.add(target)

  // Small extra enemy for more collision/testing.
  const enemy2 = new GameObject('Enemy2')
  enemy2.tag = 'Enemy'
  enemy2.transform.position.set(650, -160)
  enemy2.addComponent(
    new SpriteRenderer2D({
      size: new Vec2(50, 50),
      color: DefaultTheme.primary,
      strokeColor: DefaultTheme.canvasOutline,
      shape: 'diamond',
      label: 'E',
    }),
  )
  enemy2.addComponent(new AabbCollider2D(new Vec2(50, 50)))
  enemy2.addComponent(new Health({ max: 40 }))
  enemy2.addComponent(
    new HealthBarRenderer2D({
      offset: new Vec2(0, -50),
      fillColor: DefaultTheme.primary,
      borderColor: DefaultTheme.canvasOutline,
    }),
  )
  enemy2.addComponent(new GrantXpToPlayerOnDeath2D({ xp: 10 }))
  enemy2.addComponent(new CountKillToPlayerStatsOnDeath2D())
  enemy2.addComponent(new DropPowerupOnDeath2D({ chance: 0.3, factory: spawnPowerup }))
  enemy2.addComponent(new DestroyWhenDead())
  enemy2.addComponent(new Mover2D())
  enemy2.addComponent(new VelocityDamping2D({ damping: 6 }))
  enemy2.addComponent(new ChasePlayer2D({ speed: 190, stopDistance: 28 }))
  enemy2.addComponent(new DamageOnCollision2D({ damage: 10, victimTag: 'Player', oncePerContact: true }))
  scene.add(enemy2)

  // Continuous enemy spawning.
  const spawner = new GameObject('EnemySpawner')
  spawner.addComponent(
    new EnemySpawner2D({
      spawnEverySeconds: 1.1,
      maxAlive: 12,
      spawnDistance: 720,
      spawnDistanceJitter: 220,
      factory: (p, n) => spawnEnemy(p, n),
    }),
  )
  scene.add(spawner)
}

buildRun()

const loop = new GameLoop(canvas, ctx, scene, { clearColor: DefaultTheme.bg })
loop.start()

// Start paused until the user explicitly starts.
loop.pause()
announcer.announce('Welcome. Press Start to begin.', 'polite')

const accessibleOverlay = new AccessibleOverlay(scene, {
  getPaused: () => loop.paused,
})
accessibleOverlay.mount(app)

const applyAccessibleMode = (enabled: boolean) => {
  accessibleOverlay.setEnabled(enabled)
  canvas.style.opacity = enabled ? '0.22' : '1'
  canvas.setAttribute('aria-hidden', enabled ? 'true' : 'false')
}

applyAccessibleMode(accessibleMode)

const remoteStorage = new HttpSaveStorage({
  baseUrl: backendUrl,
  headersProvider: () => auth.authHeaders(),
})
const saveStorage = new HybridSaveStorage(new LocalStorageSaveStorage(), remoteStorage, auth)

const saveManager = new SaveManager(scene, saveStorage, new SceneSerializer(), {
  autosaveMs: 60_000,
  slot: 'my-ts-app:save:slot1',
})
saveManager.startAutoSave()

const menu = new PauseMenu({
  onPause: () => {
    loop.pause()
    announcer.announce('Paused.', 'polite')
  },
  onResume: () => {
    loop.resume()
    input.clear()
    announcer.announce('Resumed.', 'polite')
  },
  getControls: () => controls,
  setControls: (next) => {
    controls = next
    saveControls(next)
    playerMove.bindings = { ...DefaultMovementBindingsWASD, ...next.movement }
    playerShooter.aimBindings = { ...DefaultShootingBindingsArrows, ...next.aim }
    playerShooter.shootKey = next.shootKey
  },
  getAccessibleMode: () => accessibleMode,
  setAccessibleMode: (enabled) => {
    accessibleMode = enabled
    saveAccessibleMode(enabled)
    applyAccessibleMode(enabled)
    announcer.announce(enabled ? 'Accessible mode enabled.' : 'Accessible mode disabled.', 'polite')
  },
  onSaveNow: async () => {
    try {
      await saveManager.saveNow()
      announcer.announce('Saved.', 'polite')
    } catch {
      announcer.announce('Save failed.', 'assertive')
    }
  },
  onLoadNow: async () => {
    let ok = false
    try {
      ok = await saveManager.loadNow()
    } catch {
      ok = false
    }
    if (!ok) return

    announcer.announce('Loaded last save.', 'polite')

    // Re-apply current controls to the loaded Player (if present).
    for (const go of scene.getGameObjects()) {
      if (go.tag !== 'Player') continue
      const move = go.getComponent(KeyboardMove2D)
      if (move) move.bindings = { ...DefaultMovementBindingsWASD, ...controls.movement }
      const shooter = go.getComponent(Shooter2D)
      if (shooter) {
        shooter.aimBindings = { ...DefaultShootingBindingsArrows, ...controls.aim }
        shooter.shootKey = controls.shootKey
      }

      // Ensure runtime-only run stats exist after load.
      if (!go.getComponent(RunStats)) go.addComponent(new RunStats())

      // Ensure wraparound exists after load.
      if (!go.getComponent(WrapAroundBounds2D)) go.addComponent(new WrapAroundBounds2D(MAP_BOUNDS))

      // Keep our references pointing at the loaded player.
      player = go
      if (move) playerMove = move
      if (shooter) playerShooter = shooter
    }

    // Ensure enemies can be counted for kills after load.
    for (const go of scene.getGameObjects()) {
      if (go.tag !== 'Enemy') continue
      if (!go.getComponent(Health)) continue
      if (!go.getComponent(CountKillToPlayerStatsOnDeath2D)) go.addComponent(new CountKillToPlayerStatsOnDeath2D())
    }
  },
  auth: {
    getUser: () => auth.user,
    isLoggedIn: () => auth.isLoggedIn(),
    register: async (email, password) => {
      const user = await auth.register(email, password)
      announcer.announce(`Registered. Signed in as ${user.email}.`, 'polite')
    },
    login: async (email, password) => {
      const user = await auth.login(email, password)
      announcer.announce(`Signed in as ${user.email}.`, 'polite')
    },
    logout: async () => {
      await auth.logout()
      announcer.announce('Signed out.', 'polite')
    },
  },
  admin: {
    isAdmin: () => admin.isAdminUser(),
    getUser: () => admin.currentUser(),
    listUsers: () => admin.listUsers(),
    listSaves: (userId) => admin.listSaves(userId),
    listRuns: (userId) => admin.listRuns(userId),
    setBan: (userId, banned, reason) => admin.setBan(userId, banned, reason),
  },
})
menu.mount(app)

const death = new DeathScreen({
  onRestart: () => {
    loop.pause()
    input.clear()
    buildRun()
    loop.resume()
    canvas.focus()
    announcer.announce('Restarted.', 'polite')
  },
})
death.mount(app)

const welcome = new WelcomeScreen({
  title: 'Canvas Engine Demo',
  subtitle: 'Press Start to begin. Press Esc anytime for the hub (options, save/load, rebind controls).',
  onStart: () => {
    input.clear()
    loop.resume()
    canvas.focus()
    announcer.announce('Started.', 'polite')
  },
})

welcome.mount(app)
welcome.open()

// Keep a readable DOM status line in sync for low-vision users.
window.setInterval(() => {
  let playerHp = 'n/a'
  let playerXp = 'n/a'
  let powerups = ''

  let deadNow = false
  let statsSnapshot: any = null
  for (const go of scene.getGameObjects()) {
    if (go.tag !== 'Player') continue
    const h = go.getComponent(Health)
    if (h) {
      playerHp = `${Math.round(h.current)}/${Math.round(h.max)}`
      deadNow = h.isDead
    }

    const xp = go.getComponent(Experience)
    if (xp) playerXp = `Lv ${xp.level} · XP ${xp.xp}/${xp.xpToNext}`

    const pu = go.getComponent(PowerupController2D)
    if (pu) {
      const active: string[] = []
      if (pu.doubleShotSeconds > 0) active.push(`Double (${Math.ceil(pu.doubleShotSeconds)}s)`)
      if (pu.stickyProjectilesSeconds > 0) active.push(`Sticky (${Math.ceil(pu.stickyProjectilesSeconds)}s)`)
      powerups = active.length ? ` · Powerups: ${active.join(', ')}` : ''
    }

    if (deadNow) {
      const stats = go.getComponent(RunStats)
      statsSnapshot = {
        timeSeconds: stats?.elapsedSeconds ?? 0,
        level: xp?.level ?? 1,
        xp: xp?.xp ?? 0,
        kills: stats?.kills ?? 0,
        shotsFired: stats?.shotsFired ?? 0,
        shotsHit: stats?.shotsHit ?? 0,
      }
    }
  }

  if (deadNow && !isDead) {
    isDead = true
    loop.pause()
    input.clear()

    if (statsSnapshot) {
      const accuracy = statsSnapshot.shotsFired <= 0 ? 0 : statsSnapshot.shotsHit / statsSnapshot.shotsFired
      console.info('[Run ended]', { ...statsSnapshot, accuracy })

      // Persist stats for logged-in players.
      if (auth.isLoggedIn()) {
        void fetch(`${backendUrl.replace(/\/$/, '')}/runs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...auth.authHeaders(),
          },
          body: JSON.stringify(statsSnapshot),
        }).catch(() => {
          // Best-effort.
        })
      }

      death.open(statsSnapshot)
      announcer.announce('You died. Restart is available.', 'assertive')
    } else {
      death.open({ timeSeconds: 0, level: 1, xp: 0, kills: 0, shotsFired: 0, shotsHit: 0 })
      announcer.announce('You died.', 'assertive')
    }
  }

  hudStatus.textContent = `Status: ${loop.paused ? 'Paused' : 'Running'} · Player HP: ${playerHp} · ${playerXp}${powerups}`
}, 250)

;(window as any).__save = {
  save: () => saveManager.saveNow(),
  load: () => saveManager.loadNow(),
}

// Clean up when the tab is closed.
window.addEventListener('beforeunload', () => {
  loop.dispose()
  input.dispose()
  saveManager.stopAutoSave()
})
