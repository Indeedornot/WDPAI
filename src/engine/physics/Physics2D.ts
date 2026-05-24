import type { GameObject } from '../core/GameObject';
import { Collider2D } from './Collider2D';
import type { Collision2D } from './Collision2D';

function overlaps(
  a: { minX: number; minY: number; maxX: number; maxY: number },
  b: { minX: number; minY: number; maxX: number; maxY: number },
): boolean 
{
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;
}

function pairKey(aId: number, bId: number): string 
{
  return aId < bId ? `${aId}:${bId}` : `${bId}:${aId}`;
}

export class Physics2D 
{
  private readonly _previousPairs = new Set<string>();

  reset(): void 
  {
    this._previousPairs.clear();
  }

  step(objects: Iterable<GameObject>): void 
  {
    const colliders: Collider2D[] = [];

    for (const go of objects) 
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
        if (c instanceof Collider2D) 
        {
          colliders.push(c);
        }
      }
    }

    const currentPairs = new Set<string>();

    for (let i = 0; i < colliders.length; i++) 
    {
      const a = colliders[i];
      const goA = a.gameObject;
      if (!goA) 
      {
        continue;
      }
      const aabbA = a.getWorldAabb();

      for (let j = i + 1; j < colliders.length; j++) 
      {
        const b = colliders[j];
        const goB = b.gameObject;
        if (!goB || goA === goB) 
        {
          continue;
        }

        if (!overlaps(aabbA, b.getWorldAabb())) 
        {
          continue;
        }

        const key = pairKey(a.id, b.id);
        currentPairs.add(key);

        const isNew = !this._previousPairs.has(key);
        const aCollision: Collision2D = { self: a, other: b };
        const bCollision: Collision2D = { self: b, other: a };

        const aComponents = goA.getComponents();
        const bComponents = goB.getComponents();

        if (isNew) 
        {
          for (const c of aComponents) 
          {
            if (!c.enabled) 
            {
              continue;
            }
            c.onCollisionEnter2D(aCollision);
          }
          for (const c of bComponents) 
          {
            if (!c.enabled) 
            {
              continue;
            }
            c.onCollisionEnter2D(bCollision);
          }
        }
        else 
        {
          for (const c of aComponents) 
          {
            if (!c.enabled) 
            {
              continue;
            }
            c.onCollisionStay2D(aCollision);
          }
          for (const c of bComponents) 
          {
            if (!c.enabled) 
            {
              continue;
            }
            c.onCollisionStay2D(bCollision);
          }
        }
      }
    }

    // Exits
    for (const key of this._previousPairs) 
    {
      if (currentPairs.has(key)) 
      {
        continue;
      }

      const [aIdStr, bIdStr] = key.split(':');
      const aId = Number(aIdStr);
      const bId = Number(bIdStr);

      // Find colliders by id (colliders list is only from current objects, but we still
      // have the collider objects referenced if they exist; if not found, skip exit).
      const a = colliders.find((c) => c.id === aId);
      const b = colliders.find((c) => c.id === bId);
      if (!a || !b) 
      {
        continue;
      }

      const goA = a.gameObject;
      const goB = b.gameObject;
      if (!goA || !goB) 
      {
        continue;
      }

      const aCollision: Collision2D = { self: a, other: b };
      const bCollision: Collision2D = { self: b, other: a };

      for (const c of goA.getComponents()) 
      {
        if (!c.enabled) 
        {
          continue;
        }
        c.onCollisionExit2D(aCollision);
      }
      for (const c of goB.getComponents()) 
      {
        if (!c.enabled) 
        {
          continue;
        }
        c.onCollisionExit2D(bCollision);
      }
    }

    this._previousPairs.clear();
    for (const k of currentPairs) 
    {
      this._previousPairs.add(k);
    }
  }
}
