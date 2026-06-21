import { describe, it, expect } from 'vitest';
import { zipEngine, type ZipBoard } from './zip';

describe('moteur Zip', () => {
  it('génère de façon déterministe (même seed → même puzzle)', () => {
    const a = zipEngine.generate(7, 'facile');
    const b = zipEngine.generate(7, 'facile');
    expect(b).toEqual(a);
  });

  it('respecte la taille par difficulté (5/6/7)', () => {
    expect(zipEngine.generate(1, 'facile').size).toBe(5);
    expect(zipEngine.generate(1, 'moyen').size).toBe(6);
    expect(zipEngine.generate(1, 'difficile').size).toBe(7);
  });

  it('produit des puzzles à solution unique (facile & moyen)', () => {
    for (const diff of ['facile', 'moyen'] as const) {
      for (let s = 0; s < 3; s++) {
        const p = zipEngine.generate(s * 11 + 2, diff);
        expect(zipEngine.countSolutions(p, 5)).toBe(1);
      }
    }
  });

  it('solve renvoie un chemin que validate juge valide', () => {
    const p = zipEngine.generate(42, 'facile');
    const sol = zipEngine.solve(p);
    expect(sol).not.toBeNull();
    expect(zipEngine.validate(p, sol as ZipBoard).status).toBe('valid');
  });

  it('le chemin couvre toutes les cases et démarre sur 1', () => {
    const p = zipEngine.generate(5, 'facile');
    const sol = zipEngine.solve(p) as ZipBoard;
    expect(sol.length).toBe(p.size * p.size);
    expect(p.numbers[sol[0].r][sol[0].c]).toBe(1);
  });

  it('un chemin vide → incomplete', () => {
    const p = zipEngine.generate(5, 'facile');
    expect(zipEngine.validate(p, []).status).toBe('incomplete');
  });

  it('rejette une coordonnée hors grille — anti-triche', () => {
    const p = zipEngine.generate(5, 'facile');
    const res = zipEngine.validate(p, [{ r: 0, c: 99 }]);
    expect(res.status).toBe('invalid');
    expect(res.violations.some((v) => v.rule === 'shape')).toBe(true);
  });

  it('détecte un saut non adjacent', () => {
    const p = zipEngine.generate(5, 'facile');
    const sol = zipEngine.solve(p) as ZipBoard;
    const broken = [sol[0], { r: (sol[0].r + 2) % p.size, c: sol[0].c }];
    const res = zipEngine.validate(p, broken);
    expect(res.status).toBe('invalid');
  });
});
