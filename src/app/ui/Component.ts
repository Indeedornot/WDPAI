export interface Component
{
  mount(parent: HTMLElement): void;
  refresh(): void;
}
