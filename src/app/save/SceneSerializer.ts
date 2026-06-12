import { GameObject } from '../../engine/core/GameObject';
import type { Scene } from '../../engine/core/Scene';
import type { Component } from '../../engine/core/Component';
import { Vec2 } from '../../engine/math/Vec2';
import type { SceneSnapshotV1, GameObjectSnapshot, ComponentSnapshot, Vec2Snapshot } from './types';
import {
  defaultComponentSerializers,
  SnapshotRead,
  type AnyComponentSerializer,
  type LoadContext,
} from './ComponentSerializers';

export class SceneSerializer
{
  readonly serializers: AnyComponentSerializer[];

  constructor(serializers: AnyComponentSerializer[] = defaultComponentSerializers())
  {
    this.serializers = serializers;
  }

  private static vec2ToSnapshot(v: Vec2): Vec2Snapshot
  {
    return { x: v.x, y: v.y };
  }

  serialize(scene: Scene): SceneSnapshotV1 
  {
    const objects = Array.from(scene.getGameObjects(), (go) => this.serializeGameObject(go));

    return {
      version: 1,
      savedAt: Date.now(),
      camera: {
        position: SceneSerializer.vec2ToSnapshot(scene.camera.position),
        zoom: scene.camera.zoom,
      },
      objects,
    };
  }

  restore(scene: Scene, snapshot: SceneSnapshotV1): void 
  {
    // Clear current world.
    scene.clearImmediate();

    // First pass: create objects with transforms.
    const byId = new Map<string, GameObject>();

    for (const o of snapshot.objects) 
    {
      const go = new GameObject(o.name);
      // Force id to match snapshot (not truly immutable at runtime).
      (go as { id: string }).id = o.id;

      go.tag = o.tag;
      go.active = o.active;

      go.transform.position.set(o.transform.position.x, o.transform.position.y);
      go.transform.rotation = o.transform.rotation;
      go.transform.scale.set(o.transform.scale.x, o.transform.scale.y);

      byId.set(o.id, go);
      scene.add(go);
    }

    // Flush additions so components see OnAdded hooks when added below.
    scene.flushQueues();

    // Second pass: add components.
    const linkQueue: Array<{
      component: Component;
      serializer: AnyComponentSerializer;
      data: unknown;
    }> = [];
    for (const o of snapshot.objects) 
    {
      const go = byId.get(o.id);
      if (!go) 
      {
        continue;
      }

      for (const c of o.components) 
      {
        const { component: comp, serializer } = this.deserializeComponent(c);
        if (!comp) 
        {
          continue;
        }
        go.addComponent(comp);

        if (serializer?.link) 
        {
          linkQueue.push({ component: comp, serializer, data: c.data });
        }
      }
    }

    // Third pass: resolve references (e.g. target ids).
    const ctx: LoadContext = {
      getObjectById: (id: string) => byId.get(id) ?? null,
    };
    for (const item of linkQueue) 
    {
      item.serializer.link?.(item.component, item.data, ctx);
    }

    // Camera
    const camPos = SnapshotRead.vec2(snapshot.camera.position, new Vec2(0, 0));
    scene.camera.position.set(camPos.x, camPos.y);
    scene.camera.zoom = typeof snapshot.camera.zoom === 'number' ? snapshot.camera.zoom : 1;

    scene.flushQueues();
  }

  private serializeGameObject(go: GameObject): GameObjectSnapshot 
  {
    const components: ComponentSnapshot[] = [];

    for (const c of go.getComponents()) 
    {
      const s = this.serializeComponent(c);
      if (s) 
      {
        components.push(s);
      }
    }

    return {
      id: go.id,
      name: go.name,
      tag: go.tag,
      active: go.active,
      transform: {
        position: SceneSerializer.vec2ToSnapshot(go.transform.position),
        rotation: go.transform.rotation,
        scale: SceneSerializer.vec2ToSnapshot(go.transform.scale),
      },
      components,
    };
  }

  private serializeComponent(component: Component): ComponentSnapshot | null 
  {
    for (const s of this.serializers) 
    {
      if (!s.supports(component)) 
      {
        continue;
      }
      return { type: s.type, enabled: component.enabled, data: s.serialize(component) };
    }
    return null;
  }

  private deserializeComponent(snapshot: ComponentSnapshot): {
    component: Component | null;
    serializer: AnyComponentSerializer | null;
  } 
  {
    const serializer = this.serializers.find((s) => s.type === snapshot.type);
    if (!serializer) 
    {
      return { component: null, serializer: null };
    }
    const c = serializer.deserialize(snapshot.data);
    c.enabled = snapshot.enabled;
    return { component: c, serializer };
  }
}
