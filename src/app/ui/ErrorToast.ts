export interface ErrorToastOptions
{
  message: string;
  onDismiss?: () => void;
  onRetry?: () => void;
  duration?: number;
}

export class ErrorToast
{
  private _el: HTMLDivElement;
  private _timeout: number | null = null;

  constructor(options: ErrorToastOptions)
  {
    this._el = document.createElement('div');
    this._el.className = 'error-toast';
    this._el.innerHTML = `
      <div class="error-toast-content">
        <div class="error-toast-message">${ErrorToast.escapeHtml(options.message)}</div>
        <div class="error-toast-actions">
          ${options.onRetry ? '<button class="error-toast-retry">Retry</button>' : ''}
          <button class="error-toast-dismiss">Dismiss</button>
        </div>
      </div>
    `;

    const dismissBtn = this._el.querySelector('.error-toast-dismiss') as HTMLButtonElement;
    dismissBtn.addEventListener('click', () =>
    {
      this.close();
      options.onDismiss?.();
    });

    const retryBtn = this._el.querySelector('.error-toast-retry') as HTMLButtonElement | null;
    if (retryBtn)
    {
      retryBtn.addEventListener('click', () =>
      {
        this.close();
        options.onRetry?.();
      });
    }

    if (options.duration)
    {
      this._timeout = window.setTimeout(() => this.close(), options.duration);
    }
  }

  show(parent: HTMLElement): void
  {
    parent.appendChild(this._el);
  }

  close(): void
  {
    if (this._timeout !== null)
    {
      clearTimeout(this._timeout);
    }
    this._el.remove();
  }

  private static escapeHtml(text: string): string
  {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
