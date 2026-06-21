import { describe, it, expect } from 'vitest';
import { DIFFICULTIES } from '@puzzlehub/shared';
import { tangoEngine, type TangoBoard, type Cell } from './tango';

describe('moteur Tango', () => {
  it('génère de façon déterministe (même seed → même puzzle)', () => {
    const a = tangoEngine.generate(123, 'moyen');
    const b = tangoEngine.generate(123, 'moyen');
    expect(b).toEqual(a);
  });

  it('produit des puzzles à solution unique pour toutes les difficultés', () => {
    for (const diff of DIFFICULTIES) {
      for (let s = 0; s < 6; s++) {
        const p = tangoEngine.generate(s * 7 + 1, diff);
        expect(tangoEngine.countSolutions(p, 5)).toBe(1);
      }
    }
  });

  it('solve renvoie une solution que validate juge valide', () => {
    const p = tangoEngine.generate(42, 'moyen');
    const sol = tangoEngine.solve(p);
    expect(sol).not.toBeNull();
    expect(tangoEngine.validate(p, sol as TangoBoard).status).toBe('valid');
  });

  it('marque une grille partielle comme incomplete', () => {
    const p = tangoEngine.generate(42, 'moyen');
    const sol = tangoEngine.solve(p) as TangoBoard;
    const partial = sol.map((row) => row.slice());
    partial[0][0] = null;
    expect(tangoEngine.validate(p, partial).status).toBe('incomplete');
  });

  it('détecte une violation de règle (3 identiques consécutifs)', () => {
    const p = tangoEngine.generate(42, 'moyen');
    const sol = tangoEngine.solve(p) as TangoBoard;
    const bad = sol.map((row) => row.slice());
    bad[0][0] = 0;
    bad[0][1] = 0;
    bad[0][2] = 0;
    const res = tangoEngine.validate(p, bad);
    expect(res.status).toBe('invalid');
    expect(res.violations.some((v) => v.rule === 'triple')).toBe(true);
  });

  it('rejette un board forgé (mauvaise taille) — anti-triche', () => {
    const p = tangoEngine.generate(42, 'moyen');
    const bad = [[0, 1, 0]] as unknown as TangoBoard;
    const res = tangoEngine.validate(p, bad);
    expect(res.status).toBe('invalid');
    expect(res.violations.some((v) => v.rule === 'shape')).toBe(true);
  });

  it('rejette un board avec des valeurs hors domaine {0,1,null} — anti-triche', () => {
    const p = tangoEngine.generate(42, 'moyen');
    const sol = tangoEngine.solve(p) as TangoBoard;
    const bad = sol.map((row) => row.slice());
    bad[0][0] = 2 as unknown as Cell;
    const res = tangoEngine.validate(p, bad);
    expect(res.status).toBe('invalid');
    expect(res.violations.some((v) => v.rule === 'shape')).toBe(true);
  });

  it('la solution respecte l’équilibre 3/3 par ligne et colonne', () => {
    const p = tangoEngine.generate(7, 'facile');
    const sol = tangoEngine.solve(p) as TangoBoard;
    for (let i = 0; i < 6; i++) {
      const row = sol[i].filter((v) => v === 1).length;
      const col = sol.map((r) => r[i]).filter((v) => v === 1).length;
      expect(row).toBe(3);
      expect(col).toBe(3);
    }
  });
});
