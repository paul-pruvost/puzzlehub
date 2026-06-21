import { describe, expect, it } from 'vitest';
import { DIFFICULTIES } from '@puzzlehub/shared';
import { nonogramEngine, type NonogramBoard } from './nonogram';

function runs(line: number[]): number[] {
  const r: number[] = [];
  let cur = 0;
  for (const v of line) {
    if (v === 1) cur++;
    else if (cur > 0) {
      r.push(cur);
      cur = 0;
    }
  }
  if (cur > 0) r.push(cur);
  return r;
}

describe('moteur Nonogram', () => {
  it('génère de façon déterministe (même seed → même puzzle, toutes difficultés)', () => {
    for (const diff of DIFFICULTIES) {
      const a = nonogramEngine.generate(2024, diff);
      const b = nonogramEngine.generate(2024, diff);
      expect(b).toEqual(a);
    }
  });

  it('respecte la taille par difficulté (5/8/10)', () => {
    expect(nonogramEngine.generate(1, 'facile').size).toBe(5);
    expect(nonogramEngine.generate(1, 'moyen').size).toBe(8);
    expect(nonogramEngine.generate(1, 'difficile').size).toBe(10);
  });

  it('produit des puzzles à solution unique (toutes difficultés, dont difficile 10×10)', () => {
    for (const diff of DIFFICULTIES) {
      for (let s = 0; s < 3; s++) {
        const p = nonogramEngine.generate(s * 13 + 7, diff);
        expect(nonogramEngine.countSolutions(p, 5)).toBe(1);
      }
    }
  });

  // BUG-Nonogram-gen / NGB-D-5 : la génération doit TOUJOURS aboutir (jamais de throw),
  // sur une large plage de seeds aux 3 difficultés, avec solution unique vérifiée.
  it(
    'génère sans exception sur ≥100 seeds × 3 difficultés (unicité + validité)',
    () => {
      for (const diff of DIFFICULTIES) {
        for (let seed = 0; seed < 120; seed++) {
          const p = nonogramEngine.generate(seed, diff);
          expect(nonogramEngine.countSolutions(p, 2)).toBe(1);
          const sol = nonogramEngine.solve(p) as NonogramBoard;
          expect(nonogramEngine.validate(p, sol).status).toBe('valid');
        }
      }
    },
    60_000,
  );

  it('la solution rejoue exactement les indices du puzzle (toutes difficultés)', () => {
    for (const diff of DIFFICULTIES) {
      const p = nonogramEngine.generate(42, diff);
      const sol = nonogramEngine.solve(p) as NonogramBoard;
      expect(sol).not.toBeNull();
      const n = p.size;
      for (let r = 0; r < n; r++) {
        expect(runs(sol[r].map((v) => (v === 1 ? 1 : 0)))).toEqual(p.rowClues[r]);
      }
      for (let c = 0; c < n; c++) {
        const col = sol.map((row) => (row[c] === 1 ? 1 : 0));
        expect(runs(col)).toEqual(p.colClues[c]);
      }
    }
  });

  it('validate juge la solution valide', () => {
    for (const diff of DIFFICULTIES) {
      const p = nonogramEngine.generate(5, diff);
      const sol = nonogramEngine.solve(p) as NonogramBoard;
      expect(nonogramEngine.validate(p, sol).status).toBe('valid');
    }
  });

  it('grille vide → incomplete (sauf clues vides)', () => {
    const p = nonogramEngine.generate(3, 'facile');
    const empty = Array.from({ length: p.size }, () => Array<0 | 1 | null>(p.size).fill(null));
    expect(nonogramEngine.validate(p, empty).status).toBe('incomplete');
  });

  it('surcharge d’une ligne → invalid', () => {
    const p = nonogramEngine.generate(8, 'facile');
    const full = Array.from({ length: p.size }, () => Array<0 | 1 | null>(p.size).fill(1));
    // Une grille pleine dépasse forcément au moins un indice (sinon trivial).
    expect(nonogramEngine.validate(p, full).status).toBe('invalid');
  });

  it('rejette un board malformé (anti-triche)', () => {
    const p = nonogramEngine.generate(1, 'facile');
    expect(nonogramEngine.validate(p, [[1, 0]] as unknown as NonogramBoard).status).toBe('invalid');
    expect(
      nonogramEngine.validate(
        p,
        Array.from({ length: p.size }, () => Array<number>(p.size).fill(2)) as unknown as NonogramBoard,
      ).status,
    ).toBe('invalid');
  });
});
