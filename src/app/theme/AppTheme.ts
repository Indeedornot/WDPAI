export type AppTheme = {
  bg: string;
  surface: string;
  text: string;
  mutedText: string;

  primary: string;
  accent: string;
  ok: string;

  canvasGrid: string;
  canvasAxis: string;
  canvasOutline: string;
};

export const DefaultTheme: AppTheme = {
  bg: '#f8fafc',
  surface: '#ffffff',
  text: '#0f172a',
  mutedText: '#475569',

  primary: '#2563eb',
  accent: '#dc2626',
  ok: '#16a34a',

  canvasGrid: 'rgba(15,23,42,0.06)',
  canvasAxis: 'rgba(15,23,42,0.18)',
  canvasOutline: 'rgba(15,23,42,0.65)',
};

/** Applies an AppTheme to the document's CSS custom properties. */
export class AppThemeApplier
{
  static apply(theme: AppTheme = DefaultTheme): void
  {
    const root = document.documentElement;

    root.style.setProperty('--c-bg', theme.bg);
    root.style.setProperty('--c-surface', theme.surface);
    root.style.setProperty('--c-text', theme.text);
    root.style.setProperty('--c-muted-text', theme.mutedText);

    root.style.setProperty('--c-primary', theme.primary);
    root.style.setProperty('--c-accent', theme.accent);
    root.style.setProperty('--c-ok', theme.ok);

    root.style.setProperty('--c-canvas-grid', theme.canvasGrid);
    root.style.setProperty('--c-canvas-axis', theme.canvasAxis);
    root.style.setProperty('--c-canvas-outline', theme.canvasOutline);
  }
}
