import { Component } from '../core/Component';
import { Mover2D } from './Mover2D';
import {
  DefaultMovementBindingsWASD,
  type MovementBindings2D,
  getMovementVector,
} from '../input/DirectionalBindings2D';

export type KeyboardMove2DOptions = {
  speed?: number;
  bindings?: Partial<MovementBindings2D>;
};

export class KeyboardMove2D extends Component 
{
  speed: number;
  bindings: MovementBindings2D;

  constructor(options: KeyboardMove2DOptions = {}) 
  {
    super();
    this.speed = options.speed ?? 250;
    this.bindings = {
      ...DefaultMovementBindingsWASD,
      ...(options.bindings ?? {}),
    };
  }

  update(_dt: number): void 
  {
    const go = this.gameObject;
    const scene = this.scene;
    if (!go || !scene) 
    {
      return;
    }

    const mover = go.getComponent(Mover2D);
    if (!mover) 
    {
      return;
    }

    const input = scene.input;

    const dir = getMovementVector(input, this.bindings);
    mover.velocity.set(dir.x * this.speed, dir.y * this.speed);
  }
}
