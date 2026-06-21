import { describe, expect, it } from 'vitest';
import {
  COSMETICS,
  COSMETIC_CATEGORIES,
  DEFAULT_COSMETICS,
  findCosmetic,
  isUnlocked,
  unlockedCosmetics,
} from './cosmetics';

describe('catalogue cosmétiques', () => {
  it('a des identifiants uniques', () => {
    const ids = COSMETICS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('chaque catégorie a exactement un défaut à requiredLevel 0', () => {
    for (const cat of COSMETIC_CATEGORIES) {
      const defaults = COSMETICS.filter((c) => c.category === cat && c.requiredLevel === 0);
      expect(defaults.length).toBe(1);
      expect(DEFAULT_COSMETICS[cat]).toBe(defaults[0].id);
    }
  });

  it('DEFAULT_COSMETICS pointe sur des ids existants', () => {
    for (const cat of COSMETIC_CATEGORIES) {
      expect(findCosmetic(DEFAULT_COSMETICS[cat])).toBeDefined();
    }
  });

  it('unlockedCosmetics(0) ne renvoie que les défauts', () => {
    const ids = unlockedCosmetics(0).map((c) => c.id);
    expect(ids).toEqual(['palette-default', 'skin-default', 'theme-default']);
  });

  it('respecte les seuils de niveau', () => {
    expect(isUnlocked('palette-emerald', 1)).toBe(false);
    expect(isUnlocked('palette-emerald', 2)).toBe(true);
    expect(isUnlocked('palette-sunset', 4)).toBe(false);
    expect(isUnlocked('palette-sunset', 5)).toBe(true);
    expect(isUnlocked('skin-glyph', 3)).toBe(true);
  });

  it('isUnlocked sur un id inconnu = false', () => {
    expect(isUnlocked('inexistant', 999)).toBe(false);
  });
});
