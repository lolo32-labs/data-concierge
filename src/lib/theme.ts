export type ThemeId = 'classic' | 'midnight' | 'studio' | 'terminal' | 'heritage';

export interface ThemeMeta {
  id: ThemeId;
  name: string;
  description: string;
}

export const THEME_META: ThemeMeta[] = [
  { id: 'classic', name: 'Classic', description: 'Clean and familiar — Shopify native, elevated' },
  { id: 'midnight', name: 'Midnight', description: 'Premium fintech — deep navy with warm amber glow' },
  { id: 'studio', name: 'Studio', description: 'Bold and restrained — white canvas with terracotta accent' },
  { id: 'terminal', name: 'Terminal', description: 'Dark precision — surgical neon mint on black' },
  { id: 'heritage', name: 'Heritage', description: 'Warm parchment — jewel sapphire with classic elegance' },
];

export const DEFAULT_THEME: ThemeId = 'classic';

const STORAGE_KEY = 'profitsight-theme';

const VALID_THEMES: ReadonlySet<string> = new Set<ThemeId>([
  'classic',
  'midnight',
  'studio',
  'terminal',
  'heritage',
]);

export function getTheme(): ThemeId {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && VALID_THEMES.has(stored)) {
    return stored as ThemeId;
  }
  return DEFAULT_THEME;
}

export function setTheme(id: ThemeId): void {
  localStorage.setItem(STORAGE_KEY, id);
  document.documentElement.setAttribute('data-theme', id);
}
