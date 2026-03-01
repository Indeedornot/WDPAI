import { Component } from '../core/Component'

export type ExperienceOptions = {
  level?: number
  xp?: number
}

export class Experience extends Component {
  level: number
  xp: number

  constructor(options: ExperienceOptions = {}) {
    super()
    this.level = Math.max(1, Math.floor(options.level ?? 1))
    this.xp = Math.max(0, Math.floor(options.xp ?? 0))
  }

  add(amount: number): void {
    const inc = Math.max(0, Math.floor(amount))
    if (inc <= 0) return

    this.xp += inc

    // Simple leveling curve.
    while (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext
      this.level++
    }
  }

  get xpToNext(): number {
    // Grows moderately with level.
    return 50 + (this.level - 1) * 35
  }

  get progress01(): number {
    const next = this.xpToNext
    return next <= 0 ? 0 : Math.max(0, Math.min(1, this.xp / next))
  }
}
