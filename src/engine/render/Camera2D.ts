import { Vec2 } from '../math/Vec2'

/**
 * World space:
 * - +X goes right
 * - +Y goes up (so Y becomes smaller when moving down the screen)
 * Screen space (canvas pixels):
 * - +X goes right
 * - +Y goes down
 */
export class Camera2D {
  position = new Vec2(0, 0)
  zoom = 1

  worldToScreen(world: Vec2): Vec2 {
    // Convert from world (+Y up) to canvas (+Y down)
    const x = (world.x - this.position.x) * this.zoom
    const y = (this.position.y - world.y) * this.zoom
    return new Vec2(x, y)
  }

  sizeToScreen(worldUnits: number): number {
    return worldUnits * this.zoom
  }
}
