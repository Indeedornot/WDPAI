import { Transform2D } from './Transform2D'
import { Component } from './Component'
import type { Scene } from './Scene'

export class GameObject {
  readonly transform = new Transform2D()
  active = true
  scene: Scene | null = null

  readonly id: string
  name: string
  tag = ''

  private readonly _components: Component[] = []

  constructor(name = 'GameObject') {
    this.id = (globalThis.crypto && 'randomUUID' in globalThis.crypto)
      ? globalThis.crypto.randomUUID()
      : `go_${Math.random().toString(16).slice(2)}_${Date.now()}`
    this.name = name
  }

  addComponent<T extends Component>(component: T): T {
    if (component.gameObject) {
      throw new Error('Component already belongs to a GameObject')
    }

    component.gameObject = this
    this._components.push(component)

    const scene = this.scene
    if (scene) {
      component.__internalOnAdded(scene)
      scene.__internalMarkComponentNeedsStart(component)
    }

    return component
  }

  getComponents(): readonly Component[] {
    return this._components
  }

  getComponent<T extends Component>(ctor: new (..._args: never[]) => T): T | null {
    for (const c of this._components) {
      if (c instanceof ctor) return c as T
    }
    return null
  }

  removeComponent(component: Component): void {
    const idx = this._components.indexOf(component)
    if (idx === -1) return

    const scene = this.scene
    if (scene) component.__internalOnRemoved(scene)

    this._components.splice(idx, 1)
    component.gameObject = null
  }

  destroy(): void {
    this.scene?.remove(this)
  }

  /** @internal */
  __internalOnAddedToScene(scene: Scene): void {
    this.scene = scene
    for (const c of this._components) {
      c.__internalOnAdded(scene)
      scene.__internalMarkComponentNeedsStart(c)
    }
  }

  /** @internal */
  __internalOnRemovedFromScene(scene: Scene): void {
    for (const c of this._components) {
      c.__internalOnRemoved(scene)
    }
    this.scene = null
  }
}
