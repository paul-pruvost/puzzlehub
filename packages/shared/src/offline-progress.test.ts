import { describe, expect, it } from 'vitest';
import {
  clearMask,
  clearedCount,
  globalLevel,
  isLevelCleared,
  mergeClears,
  nextUnclearedIndex,
  offlineXpTotal,
  setLevelCleared,
  type OfflineClears,
} from './offline-progress';
import { xpThresholdForLevel } from './progression';

describe('offline-progress (bitmask des clears, CORR-1)', () => {
  it('setLevelCleared / isLevelCleared : first-clear idempotent', () => {
    let m = 0;
    m = setLevelCleared(m, 2);
    expect(isLevelCleared(m, 2)).toBe(true);
    expect(isLevelCleared(m, 0)).toBe(false);
    const again = setLevelCleared(m, 2);
    expect(again).toBe(m); // rejouer ne change rien (pas de recrédit)
  });

  it('clearedCount = popcount (XP par niveaux distincts, pas par index max)', () => {
    // Niveau 5 fait sans 0..4 → 1 seul niveau crédité (pas 6).
    const m = setLevelCleared(0, 5);
    expect(clearedCount(m)).toBe(1);
    expect(clearedCount(setLevelCleared(m, 0))).toBe(2);
  });

  it('nextUnclearedIndex = plus petit non terminé, clampe à la fin', () => {
    expect(nextUnclearedIndex(0, 20)).toBe(0);
    let m = setLevelCleared(setLevelCleared(0, 0), 1);
    expect(nextUnclearedIndex(m, 20)).toBe(2);
    m = setLevelCleared(m, 2);
    expect(nextUnclearedIndex(m, 3)).toBe(2); // tous faits → dernier index
  });

  it('offlineXpTotal = Σ niveaux distincts × barème difficulté', () => {
    const clears: OfflineClears = {
      tango: { facile: setLevelCleared(setLevelCleared(0, 0), 1) }, // 2 × 10
      queens: { difficile: setLevelCleared(0, 7) }, // 1 × 35
    };
    expect(offlineXpTotal(clears)).toBe(2 * 10 + 35);
  });

  it('mergeClears = OR idempotent (merge localStorage ↔ serveur)', () => {
    const a: OfflineClears = { tango: { facile: setLevelCleared(0, 0) } };
    const b: OfflineClears = { tango: { facile: setLevelCleared(0, 3) }, zip: { moyen: setLevelCleared(0, 1) } };
    const m = mergeClears(a, b);
    expect(clearMask(m, 'tango', 'facile')).toBe(setLevelCleared(setLevelCleared(0, 0), 3));
    expect(clearMask(m, 'zip', 'moyen')).toBe(setLevelCleared(0, 1));
    expect(mergeClears(m, m)).toEqual(m); // idempotent
  });

  it('globalLevel = courbe sur (xp classé + xp offline), sommants disjoints', () => {
    // 1 difficile offline = 35 XP. Niveau 1 requiert xpThresholdForLevel(1)=100.
    const clears: OfflineClears = { tango: { difficile: setLevelCleared(0, 0) } };
    expect(xpThresholdForLevel(1)).toBe(100);
    expect(globalLevel(70, clears)).toBe(1); // 70 + 35 = 105 ≥ 100
    expect(globalLevel(0, clears)).toBe(0); // 35 < 100
  });
});
