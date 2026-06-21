import { describe, expect, it } from 'vitest';
import { applyCosmetics } from './cosmetics';

function fakeRoot() {
  const attrs = new Map<string, string>();
  return {
    attrs,
    setAttribute: (n: string, v: string) => attrs.set(n, v),
    removeAttribute: (n: string) => attrs.delete(n),
  };
}

describe('applyCosmetics', () => {
  it('pose les attributs pour les tokens non-défaut', () => {
    const root = fakeRoot();
    applyCosmetics(root, { palette: 'emerald', skin: 'glyph', boardTheme: 'paper' });
    expect(root.attrs.get('data-palette')).toBe('emerald');
    expect(root.attrs.get('data-skin')).toBe('glyph');
    expect(root.attrs.get('data-board-theme')).toBe('paper');
  });

  it('retire les attributs pour le token "default"', () => {
    const root = fakeRoot();
    root.attrs.set('data-palette', 'emerald');
    root.attrs.set('data-board-theme', 'paper');
    applyCosmetics(root, { palette: 'default', skin: 'default', boardTheme: 'default' });
    expect(root.attrs.has('data-palette')).toBe(false);
    expect(root.attrs.has('data-skin')).toBe(false);
    expect(root.attrs.has('data-board-theme')).toBe(false);
  });
});
