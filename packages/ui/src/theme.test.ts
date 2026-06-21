import { describe, it, expect } from 'vitest';
import { resolveTheme, parseThemePref, applyTheme } from './theme';

describe('thème', () => {
  it('resolveTheme suit la préférence système quand pref=system', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
  });

  it('resolveTheme respecte un choix explicite', () => {
    expect(resolveTheme('dark', false)).toBe('dark');
    expect(resolveTheme('light', true)).toBe('light');
  });

  it('parseThemePref tombe sur system pour une valeur invalide', () => {
    expect(parseThemePref('bleu')).toBe('system');
    expect(parseThemePref(null)).toBe('system');
    expect(parseThemePref('dark')).toBe('dark');
  });

  it('applyTheme pose data-theme sur la racine', () => {
    let posed = '';
    applyTheme({ setAttribute: (_n, v) => (posed = v) }, 'dark');
    expect(posed).toBe('dark');
  });
});
