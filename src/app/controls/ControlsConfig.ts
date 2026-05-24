import {
  DefaultMovementBindingsWASD,
  DefaultShootingBindingsArrows,
  type MovementBindings2D,
  type ShootingBindings2D,
} from '../../engine/input/DirectionalBindings2D';

export type ControlsConfig = {
  movement: MovementBindings2D;
  aim: ShootingBindings2D;
  shootKey: string;
};

export const DEFAULT_CONTROLS: ControlsConfig = {
  movement: { ...DefaultMovementBindingsWASD },
  aim: { ...DefaultShootingBindingsArrows },
  shootKey: 'Space',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

export function parseControlsConfig(raw: unknown): ControlsConfig {
  const base: ControlsConfig = {
    movement: { ...DEFAULT_CONTROLS.movement },
    aim: { ...DEFAULT_CONTROLS.aim },
    shootKey: DEFAULT_CONTROLS.shootKey,
  };

  if (!isRecord(raw)) return base;

  const movementRaw = raw['movement'];
  if (isRecord(movementRaw)) {
    for (const k of Object.keys(base.movement)) {
      const v = movementRaw[k];
      if (typeof v === 'string') (base.movement as Record<string, string>)[k] = v;
    }
  }

  const aimRaw = raw['aim'];
  if (isRecord(aimRaw)) {
    for (const k of Object.keys(base.aim)) {
      const v = aimRaw[k];
      if (typeof v === 'string') (base.aim as Record<string, string>)[k] = v;
    }
  }

  base.shootKey = readString(raw['shootKey'], base.shootKey);
  return base;
}
