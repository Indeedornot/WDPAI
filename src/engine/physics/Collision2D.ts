import type { Collider2D } from './Collider2D';

export type Collision2D = {
  self: Collider2D;
  other: Collider2D;
};
