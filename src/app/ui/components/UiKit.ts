type ElementAttrs = Record<string, string>;

export type UiButtonOptions = {
  label: string;
  onClick: () => void;
  className?: string;
  title?: string;
  ariaLabel?: string;
};

/** Static builders for the vanilla-DOM UI primitives used across the app. */
export class UiKit
{
  static el<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    options: { className?: string; text?: string; attrs?: ElementAttrs } = {},
  ): HTMLElementTagNameMap[K]
  {
    const node = document.createElement(tag);
    if (options.className)
    {
      node.className = options.className;
    }
    if (options.text != null)
    {
      node.textContent = options.text;
    }
    if (options.attrs)
    {
      for (const [k, v] of Object.entries(options.attrs))
      {
        node.setAttribute(k, v);
      }
    }
    return node;
  }

  static overlay(onBackgroundClick?: () => void): HTMLDivElement
  {
    const overlay = UiKit.el('div', { className: 'ui-overlay ui-hidden' });
    if (onBackgroundClick)
    {
      overlay.addEventListener('click', (e) =>
      {
        if (e.target === overlay)
        {
          onBackgroundClick();
        }
      });
    }
    return overlay;
  }

  static panel(): HTMLDivElement
  {
    const panel = UiKit.el('div', { className: 'ui-panel', attrs: { tabindex: '-1' } });
    return panel;
  }

  static title(text: string): HTMLDivElement
  {
    return UiKit.el('div', { className: 'ui-title', text });
  }

  static subtitle(text: string): HTMLDivElement
  {
    return UiKit.el('div', { className: 'ui-subtitle', text });
  }

  static body(): HTMLDivElement
  {
    return UiKit.el('div', { className: 'ui-body' });
  }

  static button(options: UiButtonOptions): HTMLButtonElement
  {
    const b = UiKit.el('button', {
      className: options.className ?? 'ui-btn',
      text: options.label,
      attrs: { type: 'button' },
    });

    if (options.title)
    {
      b.title = options.title;
    }
    if (options.ariaLabel)
    {
      b.setAttribute('aria-label', options.ariaLabel);
    }

    b.addEventListener('click', options.onClick);
    return b;
  }

  static cogButton(options: UiButtonOptions): HTMLButtonElement
  {
    return UiKit.button({ ...options, className: options.className ?? 'ui-cog' });
  }

  static smallButton(options: UiButtonOptions): HTMLButtonElement
  {
    return UiKit.button({ ...options, className: options.className ?? 'ui-small' });
  }

  static pill(text: string): HTMLSpanElement
  {
    return UiKit.el('span', { className: 'ui-pill', text });
  }

  static section(title: string, rows: HTMLElement[]): HTMLDivElement
  {
    const wrap = UiKit.el('div', { className: 'ui-section' });
    wrap.appendChild(UiKit.el('div', { className: 'ui-section-title', text: title }));
    for (const r of rows)
    {
      wrap.appendChild(r);
    }
    return wrap;
  }

  static row(label: string, ...values: HTMLElement[]): HTMLDivElement
  {
    const row = UiKit.el('div', { className: 'ui-row' });
    row.appendChild(UiKit.el('div', { className: 'ui-row-label', text: label }));

    const right = UiKit.el('div', { className: 'ui-row-value' });
    for (const v of values)
    {
      right.appendChild(v);
    }

    row.appendChild(right);
    return row;
  }

  static hint(text: string): HTMLDivElement
  {
    return UiKit.el('div', { className: 'ui-hint', text });
  }

  static input(
    type: string,
    value: string,
    onChange: (v: string) => void,
    autocomplete?: string,
  ): HTMLInputElement
  {
    const input = UiKit.el('input', { className: 'ui-input', attrs: { type, value } });
    if (autocomplete)
    {
      input.setAttribute('autocomplete', autocomplete);
    }
    input.addEventListener('input', () => onChange(input.value));
    return input;
  }

  static inputRow(
    label: string,
    type: string,
    value: string,
    onChange: (v: string) => void,
    autocomplete?: string,
  ): HTMLDivElement
  {
    return UiKit.row(label, UiKit.input(type, value, onChange, autocomplete));
  }

  static focusFirstDescendant(root: HTMLElement): void
  {
    const focusable = root.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    focusable?.focus();
  }

  static trapFocus(container: HTMLElement, isActive: () => boolean): () => void
  {
    const onKeyDown = (e: KeyboardEvent) =>
    {
      if (!isActive())
      {
        return;
      }
      if (e.key !== 'Tab')
      {
        return;
      }

      const nodes = Array.from(
        container.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((n) => !n.hasAttribute('disabled') && !n.getAttribute('aria-hidden'));

      if (nodes.length === 0)
      {
        return;
      }

      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (!e.shiftKey && active === last)
      {
        e.preventDefault();
        first.focus();
      }
      else if (e.shiftKey && active === first)
      {
        e.preventDefault();
        last.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }
}
