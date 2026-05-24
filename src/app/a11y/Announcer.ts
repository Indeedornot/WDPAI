export type AnnouncePoliteness = 'polite' | 'assertive';

export class Announcer 
{
  private readonly _region: HTMLElement;
  private _lastText = '';
  private _lastAtMs = 0;

  constructor(region: HTMLElement) 
  {
    this._region = region;
  }

  announce(text: string, politeness: AnnouncePoliteness = 'polite'): void 
  {
    const next = text.trim();
    if (!next) 
    {
      return;
    }

    // Avoid spamming SR with identical messages.
    const now = performance.now();
    if (next === this._lastText && now - this._lastAtMs < 1500) 
    {
      return;
    }

    this._lastText = next;
    this._lastAtMs = now;

    this._region.setAttribute('aria-live', politeness);

    // Clearing then setting improves announcement reliability.
    this._region.textContent = '';
    window.setTimeout(() => 
    {
      this._region.textContent = next;
    }, 10);
  }
}
