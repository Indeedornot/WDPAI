import { GameObject } from './GameObject';
import { Component } from './Component';
import type { Camera2D } from '../render/Camera2D';
import type { Input } from '../input/Input';
import { Physics2D } from '../physics/Physics2D';

export class Scene 
{
  private readonly _objects = new Set<GameObject>();
  private readonly _toAdd: GameObject[] = [];
  private readonly _toRemove: GameObject[] = [];

  private readonly _componentsNeedingStart = new Set<Component>();
  private readonly _physics2d = new Physics2D();

  readonly input: Input;
  readonly camera: Camera2D;

  constructor(input: Input, camera: Camera2D) 
  {
    this.input = input;
    this.camera = camera;
  }

  getGameObjects(): ReadonlySet<GameObject>
  {
    return this._objects;
  }

  clearImmediate(): void 
  {
    // Remove everything now (useful for load/restore).
    for (const go of this._objects) 
    {
      go.__internalOnRemovedFromScene(this);
    }
    this._objects.clear();
    this._toAdd.length = 0;
    this._toRemove.length = 0;
    this._physics2d.reset();
  }

  add(go: GameObject): void 
  {
    this._toAdd.push(go);
  }

  remove(go: GameObject): void 
  {
    this._toRemove.push(go);
  }

  flushQueues(): void 
  {
    if (this._toRemove.length) 
    {
      for (const go of this._toRemove.splice(0)) 
      {
        if (!this._objects.has(go)) 
        {
          continue;
        }
        this._objects.delete(go);
        go.__internalOnRemovedFromScene(this);
      }
    }

    if (this._toAdd.length) 
    {
      for (const go of this._toAdd.splice(0)) 
      {
        if (this._objects.has(go)) 
        {
          continue;
        }
        this._objects.add(go);
        go.__internalOnAddedToScene(this);
      }
    }
  }

  update(dt: number): void 
  {
    this.startPendingComponents();

    for (const go of this._objects) 
    {
      if (!go.active) 
      {
        continue;
      }
      for (const c of go.getComponents()) 
      {
        if (!c.enabled) 
        {
          continue;
        }
        c.update(dt);
      }
    }
  }

  fixedUpdate(dt: number): void 
  {
    this.startPendingComponents();

    for (const go of this._objects) 
    {
      if (!go.active) 
      {
        continue;
      }
      for (const c of go.getComponents()) 
      {
        if (!c.enabled) 
        {
          continue;
        }
        c.fixedUpdate(dt);
      }
    }

    // Collision events after physics/movement updates.
    this._physics2d.step(this._objects);
  }

  render(ctx: CanvasRenderingContext2D): void 
  {
    this.startPendingComponents();

    const camera = this.camera;
    for (const go of this._objects) 
    {
      if (!go.active) 
      {
        continue;
      }
      for (const c of go.getComponents()) 
      {
        if (!c.enabled) 
        {
          continue;
        }
        c.render(ctx, camera);
      }
    }
  }

  /** @internal */
  __internalMarkComponentNeedsStart(component: Component): void 
  {
    this._componentsNeedingStart.add(component);
  }

  private startPendingComponents(): void 
  {
    if (this._componentsNeedingStart.size === 0) 
    {
      return;
    }

    const pending = Array.from(this._componentsNeedingStart);
    this._componentsNeedingStart.clear();

    for (const c of pending) 
    {
      if (!c.enabled) 
      {
        continue;
      }
      c.__internalTryStart();
    }
  }
}
