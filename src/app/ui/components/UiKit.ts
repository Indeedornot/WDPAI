type ElementAttrs = Record<string, string>;

type UiButtonOptions = {
  label: string;
  onClick: () => void;
  className?: string;
  title?: string;
  ariaLabel?: string;
};

export function el<K extends keyof HTMLElementTagNameMap>(
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

export function uiOverlay(onBackgroundClick?: () => void): HTMLDivElement 
{
  const overlay = el('div', { className: 'ui-overlay ui-hidden' });
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

export function uiPanel(): HTMLDivElement 
{
  const panel = el('div', { className: 'ui-panel', attrs: { tabindex: '-1' } });
  return panel;
}

export function uiTitle(text: string): HTMLDivElement 
{
  return el('div', { className: 'ui-title', text });
}

export function uiSubtitle(text: string): HTMLDivElement 
{
  return el('div', { className: 'ui-subtitle', text });
}

export function uiBody(): HTMLDivElement 
{
  return el('div', { className: 'ui-body' });
}

export function uiButton(options: UiButtonOptions): HTMLButtonElement 
{
  const b = el('button', {
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

export function uiCogButton(options: UiButtonOptions): HTMLButtonElement 
{
  return uiButton({ ...options, className: options.className ?? 'ui-cog' });
}

export function uiSmallButton(options: UiButtonOptions): HTMLButtonElement 
{
  return uiButton({ ...options, className: options.className ?? 'ui-small' });
}

export function uiPill(text: string): HTMLSpanElement 
{
  return el('span', { className: 'ui-pill', text });
}

export function uiSection(title: string, rows: HTMLElement[]): HTMLDivElement 
{
  const wrap = el('div', { className: 'ui-section' });
  wrap.appendChild(el('div', { className: 'ui-section-title', text: title }));
  for (const r of rows) 
  {
    wrap.appendChild(r);
  }
  return wrap;
}

export function uiRow(label: string, ...values: HTMLElement[]): HTMLDivElement 
{
  const row = el('div', { className: 'ui-row' });
  row.appendChild(el('div', { className: 'ui-row-label', text: label }));

  const right = el('div', { className: 'ui-row-value' });
  for (const v of values) 
  {
    right.appendChild(v);
  }

  row.appendChild(right);
  return row;
}

export function uiHint(text: string): HTMLDivElement 
{
  return el('div', { className: 'ui-hint', text });
}

export function uiInput(
  type: string,
  value: string,
  onChange: (v: string) => void,
  autocomplete?: string,
): HTMLInputElement 
{
  const input = el('input', { className: 'ui-input', attrs: { type, value } });
  if (autocomplete) 
  {
    input.setAttribute('autocomplete', autocomplete);
  }
  input.addEventListener('input', () => onChange(input.value));
  return input;
}

export function uiInputRow(
  label: string,
  type: string,
  value: string,
  onChange: (v: string) => void,
  autocomplete?: string,
): HTMLDivElement 
{
  return uiRow(label, uiInput(type, value, onChange, autocomplete));
}

export function focusFirstDescendant(root: HTMLElement): void 
{
  const focusable = root.querySelector<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
  );
  focusable?.focus();
}

export function trapFocus(container: HTMLElement, isActive: () => boolean): () => void 
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
