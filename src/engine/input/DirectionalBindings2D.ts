import { Vec2 } from '../math/Vec2';
import type { Input } from './Input';

export const MovementDirection2D = {
  Up: 'Up',
  Down: 'Down',
  Left: 'Left',
  Right: 'Right',
} as const;

export type MovementDirection2D = (typeof MovementDirection2D)[keyof typeof MovementDirection2D];

export const ShootingDirection2D = {
  Up: 'Up',
  Down: 'Down',
  Left: 'Left',
  Right: 'Right',
} as const;

export type ShootingDirection2D = (typeof ShootingDirection2D)[keyof typeof ShootingDirection2D];

export type MovementBindings2D = Record<MovementDirection2D, string>;
export type ShootingBindings2D = Record<ShootingDirection2D, string>;

export const DefaultMovementBindingsWASD: MovementBindings2D = {
  [MovementDirection2D.Up]: 'KeyW',
  [MovementDirection2D.Down]: 'KeyS',
  [MovementDirection2D.Left]: 'KeyA',
  [MovementDirection2D.Right]: 'KeyD',
};

export const DefaultShootingBindingsArrows: ShootingBindings2D = {
  [ShootingDirection2D.Up]: 'ArrowUp',
  [ShootingDirection2D.Down]: 'ArrowDown',
  [ShootingDirection2D.Left]: 'ArrowLeft',
  [ShootingDirection2D.Right]: 'ArrowRight',
};

export function getMovementVector(input: Input, bindings: MovementBindings2D): Vec2 {
  const v = new Vec2(0, 0);
  if (input.isKeyDown(bindings[MovementDirection2D.Left])) v.x -= 1;
  if (input.isKeyDown(bindings[MovementDirection2D.Right])) v.x += 1;

  // World coords: +Y is up.
  if (input.isKeyDown(bindings[MovementDirection2D.Up])) v.y += 1;
  if (input.isKeyDown(bindings[MovementDirection2D.Down])) v.y -= 1;

  if (v.length() > 0) v.normalize();
  return v;
}

export function getShootingVector(input: Input, bindings: ShootingBindings2D): Vec2 {
  const v = new Vec2(0, 0);
  if (input.isKeyDown(bindings[ShootingDirection2D.Left])) v.x -= 1;
  if (input.isKeyDown(bindings[ShootingDirection2D.Right])) v.x += 1;

  // World coords: +Y is up.
  if (input.isKeyDown(bindings[ShootingDirection2D.Up])) v.y += 1;
  if (input.isKeyDown(bindings[ShootingDirection2D.Down])) v.y -= 1;

  if (v.length() > 0) v.normalize();
  return v;
}
