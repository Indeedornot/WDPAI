export class Vec2 {
  x: number
  y: number

  constructor(x = 0, y = 0) {
    this.x = x
    this.y = y
  }

  static zero(): Vec2 {
    return new Vec2(0, 0)
  }

  clone(): Vec2 {
    return new Vec2(this.x, this.y)
  }

  set(x: number, y: number): this {
    this.x = x
    this.y = y
    return this
  }

  add(v: Vec2): this {
    this.x += v.x
    this.y += v.y
    return this
  }

  sub(v: Vec2): this {
    this.x -= v.x
    this.y -= v.y
    return this
  }

  scale(s: number): this {
    this.x *= s
    this.y *= s
    return this
  }

  scaled(s: number): Vec2 {
    return new Vec2(this.x * s, this.y * s)
  }

  length(): number {
    return Math.hypot(this.x, this.y)
  }

  normalize(): this {
    const len = this.length()
    if (len > 0) this.scale(1 / len)
    return this
  }

  static add(a: Vec2, b: Vec2): Vec2 {
    return new Vec2(a.x + b.x, a.y + b.y)
  }

  static sub(a: Vec2, b: Vec2): Vec2 {
    return new Vec2(a.x - b.x, a.y - b.y)
  }

  static dot(a: Vec2, b: Vec2): number {
    return a.x * b.x + a.y * b.y
  }
}
