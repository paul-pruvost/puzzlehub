import { describe, it, expect } from 'vitest';
import { MemoryProgressStore } from './progress';
import { levelForXp, xpForDifficulty } from './xp';

describe('XP & progression', () => {
  it('levelForXp suit les seuils 50·n·(n+1)', () => {
    expect(levelForXp(0)).toBe(0);
    expect(levelForXp(99)).toBe(0);
    expect(levelForXp(100)).toBe(1);
    expect(levelForXp(299)).toBe(1);
    expect(levelForXp(300)).toBe(2);
  });

  it('barème XP par difficulté', () => {
    expect(xpForDifficulty('facile')).toBe(10);
    expect(xpForDifficulty('moyen')).toBe(20);
    expect(xpForDifficulty('difficile')).toBe(35);
  });

  it('award est idempotent par attemptId (jamais de double crédit)', async () => {
    const s = new MemoryProgressStore();
    expect((await s.award('u', 'att1', 10)).gained).toBe(10);
    expect((await s.award('u', 'att1', 10)).gained).toBe(0);
    expect((await s.get('u')).xp).toBe(10);
    expect((await s.award('u', 'att2', 20)).gained).toBe(20);
    expect((await s.get('u')).xp).toBe(30);
  });
});
