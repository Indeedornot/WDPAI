import { Component } from '../core/Component'

export class RunStats extends Component {
  elapsedSeconds = 0
  kills = 0
  shotsFired = 0
  shotsHit = 0

  update(dt: number): void {
    this.elapsedSeconds += Math.max(0, dt)
  }
}
