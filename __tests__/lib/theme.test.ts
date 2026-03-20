import { describe, it, expect, beforeEach } from 'vitest';
import { getTheme, setTheme, DEFAULT_THEME, THEME_META } from '@/lib/theme';

describe('theme', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('returns default theme when no preference set', () => {
    expect(getTheme()).toBe('classic');
  });

  it('returns stored theme from localStorage', () => {
    localStorage.setItem('profitsight-theme', 'midnight');
    expect(getTheme()).toBe('midnight');
  });

  it('setTheme updates localStorage and data-theme attribute', () => {
    setTheme('terminal');
    expect(localStorage.getItem('profitsight-theme')).toBe('terminal');
    expect(document.documentElement.getAttribute('data-theme')).toBe('terminal');
  });

  it('has 5 themes defined', () => {
    expect(THEME_META).toHaveLength(5);
  });

  it('default theme is classic', () => {
    expect(DEFAULT_THEME).toBe('classic');
  });
});
