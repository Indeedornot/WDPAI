import { SpriteRenderer2D, type SpriteRenderer2DOptions } from './SpriteRenderer2D'

/** Unity-style name for `SpriteRenderer2D`. */
export class Sprite2D extends SpriteRenderer2D {
  constructor(options: SpriteRenderer2DOptions = {}) {
    super(options)
  }
}
