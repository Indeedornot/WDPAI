import { Component } from '../core/Component';

export type HealthOptions = {
  max?: number;
  current?: number;
};

export class Health extends Component 
{
  max: number;
  current: number;

  constructor(options: HealthOptions = {}) 
  {
    super();
    this.max = options.max ?? 100;
    this.current = options.current ?? this.max;
  }

  damage(amount: number): void 
  {
    this.current = Math.max(0, this.current - Math.max(0, amount));
  }

  heal(amount: number): void 
  {
    this.current = Math.min(this.max, this.current + Math.max(0, amount));
  }

  get normalized(): number 
  {
    return this.max <= 0 ? 0 : this.current / this.max;
  }

  get isDead(): boolean 
  {
    return this.current <= 0;
  }
}
