import { describe, expect, it } from 'vitest';
import { DIFFICULTIES } from '@puzzlehub/shared';
import { sudokuEngine, type SudokuBoard } from './sudoku';

describe('moteur Mini-Sudoku', () => {
  it('génère de façon déterministe (même seed → même puzzle)', () => {
    const a = sudokuEngine.generate(2024, 'moyen');
    const b = sudokuEngine.generate(2024, 'moyen');
    expect(b).toEqual(a);
  });

  it('produit une grille 6×6 boîtes 2×3', () => {
    const p = sudokuEngine.generate(1, 'facile');
    expect(p.size).toBe(6);
    expect(p.boxRows).toBe(2);
    expect(p.boxCols).toBe(3);
    expect(p.given).toHaveLength(6);
    expect(p.given.every((row) => row.length === 6)).toBe(true);
  });

  it('produit des puzzles à solution unique pour toutes les difficultés', () => {
    for (const diff of DIFFICULTIES) {
      for (let s = 0; s < 4; s++) {
        const p = sudokuEngine.generate(s * 17 + 5, diff);
        expect(sudokuEngine.countSolutions(p, 5)).toBe(1);
      }
    }
  });

  it('plus de difficulté → moins d’indices', () => {
    const count = (d: 'facile' | 'moyen' | 'difficile'): number => {
      const p = sudokuEngine.generate(7, d);
      return p.given.flat().filter((v) => v !== null).length;
    };
    expect(count('facile')).toBeGreaterThan(count('moyen'));
    expect(count('moyen')).toBeGreaterThan(count('difficile'));
  });

  it('solve renvoie une solution que validate juge valide', () => {
    const p = sudokuEngine.generate(99, 'moyen');
    const sol = sudokuEngine.solve(p);
    expect(sol).not.toBeNull();
    expect(sudokuEngine.validate(p, sol as SudokuBoard).status).toBe('valid');
  });

  it('respecte les indices imposés', () => {
    const p = sudokuEngine.generate(3, 'facile');
    const sol = sudokuEngine.solve(p) as SudokuBoard;
    for (let r = 0; r < 6; r++)
      for (let c = 0; c < 6; c++) if (p.given[r][c] !== null) expect(sol[r][c]).toBe(p.given[r][c]);
  });

  it('détecte un doublon en ligne / colonne / boîte', () => {
    const p = sudokuEngine.generate(11, 'facile');
    const sol = sudokuEngine.solve(p) as SudokuBoard;
    // Introduit un conflit : copie la valeur de (0,0) en (0,1) si différente.
    const board = sol.map((row) => row.slice());
    const a = board[0][0];
    board[0][1] = a; // même chiffre deux fois sur la ligne 0
    expect(sudokuEngine.validate(p, board).status).toBe('invalid');
  });

  it('rejette un board malformé (anti-triche)', () => {
    const p = sudokuEngine.generate(1, 'facile');
    expect(sudokuEngine.validate(p, [[1, 2, 3]] as unknown as SudokuBoard).status).toBe('invalid');
    expect(
      sudokuEngine.validate(
        p,
        Array.from({ length: 6 }, () => Array<number | null>(6).fill(9)) as SudokuBoard,
      ).status,
    ).toBe('invalid');
  });

  it('grille vide candidate → incomplete', () => {
    const p = sudokuEngine.generate(1, 'difficile');
    const empty = Array.from({ length: 6 }, () => Array<number | null>(6).fill(null));
    expect(sudokuEngine.validate(p, empty).status).toBe('incomplete');
  });
});
