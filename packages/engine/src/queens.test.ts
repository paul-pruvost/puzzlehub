import { describe, it, expect } from 'vitest';
import { DIFFICULTIES } from '@puzzlehub/shared';
import { queensEngine, type QueensBoard } from './queens';

describe('moteur Queens', () => {
  it('génère de façon déterministe (même seed → même puzzle)', () => {
    const a = queensEngine.generate(2024, 'moyen');
    const b = queensEngine.generate(2024, 'moyen');
    expect(b).toEqual(a);
  });

  it('respecte la taille de grille par difficulté (7/8/9)', () => {
    expect(queensEngine.generate(1, 'facile').size).toBe(7);
    expect(queensEngine.generate(1, 'moyen').size).toBe(8);
    expect(queensEngine.generate(1, 'difficile').size).toBe(9);
  });

  it('produit des puzzles à solution unique pour toutes les difficultés', () => {
    for (const diff of DIFFICULTIES) {
      for (let s = 0; s < 4; s++) {
        const p = queensEngine.generate(s * 13 + 3, diff);
        expect(queensEngine.countSolutions(p, 5)).toBe(1);
      }
    }
  });

  it('partitionne le plateau en N régions exactement', () => {
    const p = queensEngine.generate(5, 'moyen');
    const ids = new Set<number>();
    for (const row of p.regions) for (const v of row) ids.add(v);
    expect(ids.size).toBe(p.size);
  });

  it('solve renvoie une solution que validate juge valide', () => {
    const p = queensEngine.generate(99, 'moyen');
    const sol = queensEngine.solve(p);
    expect(sol).not.toBeNull();
    expect(queensEngine.validate(p, sol as QueensBoard).status).toBe('valid');
  });

  it('détecte une violation d’adjacence', () => {
    const p = queensEngine.generate(7, 'facile');
    const bad: QueensBoard = new Array(p.size).fill(null);
    bad[0] = 0;
    bad[1] = 1; // adjacent en diagonale à (0,0)
    const res = queensEngine.validate(p, bad);
    expect(res.status).toBe('invalid');
    expect(res.violations.some((v) => v.rule === 'adjacent')).toBe(true);
  });

  it('rejette un board avec une colonne hors-grille — anti-triche (BUG-03)', () => {
    const p = queensEngine.generate(7, 'facile');
    const bad: QueensBoard = new Array(p.size).fill(null);
    bad[0] = 99; // colonne hors grille : ne doit JAMAIS être jugé valide
    const res = queensEngine.validate(p, bad);
    expect(res.status).toBe('invalid');
    expect(res.violations.some((v) => v.rule === 'shape')).toBe(true);
  });

  it('rejette un board de mauvaise longueur — anti-triche', () => {
    const p = queensEngine.generate(7, 'facile');
    const bad = [0, 2] as unknown as QueensBoard;
    expect(queensEngine.validate(p, bad).status).toBe('invalid');
  });

  it('toute solution pleine validée est l’unique solution', () => {
    const p = queensEngine.generate(11, 'moyen');
    const sol = queensEngine.solve(p) as QueensBoard;
    expect(queensEngine.validate(p, sol).status).toBe('valid');
    expect(queensEngine.countSolutions(p, 5)).toBe(1);
  });

  it('détecte une collision de colonne', () => {
    const p = queensEngine.generate(7, 'facile');
    const bad: QueensBoard = new Array(p.size).fill(null);
    bad[0] = 3;
    bad[3] = 3; // même colonne, lignes non adjacentes
    const res = queensEngine.validate(p, bad);
    expect(res.violations.some((v) => v.rule === 'column')).toBe(true);
  });
});
