import { describe, it, expect } from 'vitest';
import { DIFFICULTIES } from '@puzzlehub/shared';
import { patchesEngine, type PatchesBoard } from './patches';

describe('moteur Patches (Shikaku)', () => {
  it('génère de façon déterministe (même seed → même puzzle)', () => {
    const a = patchesEngine.generate(2024, 'facile');
    const b = patchesEngine.generate(2024, 'facile');
    expect(b).toEqual(a);
  });

  it('respecte la taille par difficulté (5/7/9)', () => {
    expect(patchesEngine.generate(1, 'facile').size).toBe(5);
    expect(patchesEngine.generate(1, 'moyen').size).toBe(7);
    expect(patchesEngine.generate(1, 'difficile').size).toBe(9);
  });

  it('la somme des indices couvre la grille', () => {
    const p = patchesEngine.generate(3, 'moyen');
    const total = p.clues.reduce((s, c) => s + c.value, 0);
    expect(total).toBe(p.size * p.size);
  });

  it('produit des puzzles à solution unique', () => {
    for (const diff of DIFFICULTIES) {
      for (let s = 0; s < 4; s++) {
        const p = patchesEngine.generate(s * 17 + 5, diff);
        expect(patchesEngine.countSolutions(p, 5)).toBe(1);
      }
    }
  });

  it('solve renvoie une solution que validate juge valide', () => {
    const p = patchesEngine.generate(42, 'facile');
    const sol = patchesEngine.solve(p);
    expect(sol).not.toBeNull();
    expect(patchesEngine.validate(p, sol as PatchesBoard).status).toBe('valid');
  });

  it('grille vide → incomplete', () => {
    const p = patchesEngine.generate(7, 'facile');
    const empty: PatchesBoard = Array.from({ length: p.size }, () =>
      new Array(p.size).fill(null),
    );
    expect(patchesEngine.validate(p, empty).status).toBe('incomplete');
  });

  it('rejette un puzzle incohérent (Σ aires ≠ N²) — PAT-F-1', () => {
    const bad = { size: 3, clues: [{ r: 0, c: 0, value: 2 }] }; // 2 ≠ 9
    const board: PatchesBoard = Array.from({ length: 3 }, () => new Array(3).fill(0));
    const res = patchesEngine.validate(bad, board);
    expect(res.status).toBe('invalid');
    expect(res.violations.some((v) => v.rule === 'puzzle')).toBe(true);
  });

  it('rejette un board forgé (index hors plage) — anti-triche', () => {
    const p = patchesEngine.generate(7, 'facile');
    const sol = patchesEngine.solve(p) as PatchesBoard;
    const bad = sol.map((row) => row.slice());
    bad[0][0] = 9999;
    const res = patchesEngine.validate(p, bad);
    expect(res.status).toBe('invalid');
    expect(res.violations.some((v) => v.rule === 'shape')).toBe(true);
  });
});
