export type AppTheme = {
  bg: string
  surface: string
  text: string
  mutedText: string

  primary: string
  accent: string
  ok: string

  canvasGrid: string
  canvasAxis: string
  canvasOutline: string
}

export const DefaultTheme: AppTheme = {
  // Palette (requested):
  // - #4E6E58 (green)
  // - #CD5334 (red)
  // - #694966 (purple)
  // - #D8BD8A (sand)
  // - #8499B1 (blue-gray)
  bg: '#694966',
  surface: '#4E6E58',
  text: '#D8BD8A',
  mutedText: '#8499B1',

  primary: '#8499B1',
  accent: '#CD5334',
  ok: '#4E6E58',

  canvasGrid: 'rgba(216,189,138,0.10)',
  canvasAxis: 'rgba(216,189,138,0.55)',
  canvasOutline: 'rgba(216,189,138,0.92)',
}

export function applyThemeToCssVars(theme: AppTheme = DefaultTheme): void {
  const root = document.documentElement

  root.style.setProperty('--c-bg', theme.bg)
  root.style.setProperty('--c-surface', theme.surface)
  root.style.setProperty('--c-text', theme.text)
  root.style.setProperty('--c-muted-text', theme.mutedText)

  root.style.setProperty('--c-primary', theme.primary)
  root.style.setProperty('--c-accent', theme.accent)
  root.style.setProperty('--c-ok', theme.ok)

  root.style.setProperty('--c-canvas-grid', theme.canvasGrid)
  root.style.setProperty('--c-canvas-axis', theme.canvasAxis)
  root.style.setProperty('--c-canvas-outline', theme.canvasOutline)
}
