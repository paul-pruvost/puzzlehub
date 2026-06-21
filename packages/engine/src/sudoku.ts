import { mulberry32, shuffle } from '@puzzlehub/shared';
import type { Difficulty, ValidationResult, Violation } from '@puzzlehub/shared';
import type { GameEngine } from './types';

/**
 * MINI-SUDOKU 6×6 (SUD-D-1) — chiffres 1..6, boîtes 2 lignes × 3 colonnes.
 *  - Chaque ligne, colonne et boîte contient 1..6 sans répétition.
 *  - Solution unique (FND-D-24).
 */
export interface SudokuPuzzle {
  size: number;
  /** Hauteur d'une boîte (lignes). */
  boxRows: number;
  /** Largeur d'une boîte (colonnes). */
  boxCols: number;
  /** Indices imposés (jamais la solution complète). */
  given: (number | null)[][];
}

/** Plateau candidat (partiel pendant la partie, complet à la soumission). */
export type SudokuBoard = (number | null)[][];

const SIZE = 6;
const BOX_ROWS = 2;
const BOX_COLS = 3;

function emptyGrid(n: number): SudokuBoard {
  return Array.from({ length: n }, () => Array<number | null>(n).fill(null));
}

function cloneGrid(grid: SudokuBoard): SudokuBoard {
  return grid.map((row) => row.slice());
}

function boxOf(r: number, c: number): number {
  return Math.floor(r / BOX_ROWS) * (SIZE / BOX_COLS) + Math.floor(c / BOX_COLS);
}

const DIGITS: readonly number[] = [1, 2, 3, 4, 5, 6];

interface SearchOut {
  count: number;
  first: SudokuBoard | null;
}

/**
 * Backtracking commun au solveur et au comptage d'unicité (cap dur, FND-D-16).
 * `order` permet une exploration aléatoire (génération de solution).
 */
function search(
  puzzle: SudokuPuzzle,
  cap: number,
  wantFirst: boolean,
  order?: () => readonly number[],
): SearchOut {
  const n = puzzle.size;
  const grid = cloneGrid(puzzle.given);

  // Masques d'occupation par ligne / colonne / boîte (bit i = chiffre i+1 présent).
  const rowMask = new Array<number>(n).fill(0);
  const colMask = new Array<number>(n).fill(0);
  const boxMask = new Array<number>(n).fill(0);
  const empties: { r: number; c: number }[] = [];

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const v = grid[r][c];
      if (v === null) {
        empties.push({ r, c });
      } else {
        const bit = 1 << v;
        const b = boxOf(r, c);
        // Indices initiaux incohérents (sécurité ; la génération les garantit déjà).
        if (rowMask[r] & bit || colMask[c] & bit || boxMask[b] & bit) {
          return { count: 0, first: null };
        }
        rowMask[r] |= bit;
        colMask[c] |= bit;
        boxMask[b] |= bit;
      }
    }
  }

  let count = 0;
  let first: SudokuBoard | null = null;

  const rec = (k: number): void => {
    if (count >= cap) return;
    if (k === empties.length) {
      count++;
      if (wantFirst && first === null) first = cloneGrid(grid);
      return;
    }
    const { r, c } = empties[k];
    const b = boxOf(r, c);
    const ord = order ? order() : DIGITS;
    for (const v of ord) {
      const bit = 1 << v;
      if (rowMask[r] & bit || colMask[c] & bit || boxMask[b] & bit) continue;
      grid[r][c] = v;
      rowMask[r] |= bit;
      colMask[c] |= bit;
      boxMask[b] |= bit;
      rec(k + 1);
      grid[r][c] = null;
      rowMask[r] &= ~bit;
      colMask[c] &= ~bit;
      boxMask[b] &= ~bit;
      if (count >= cap) return;
    }
  };

  rec(0);
  return { count, first };
}

function randomFullSolution(seed: number, n: number): SudokuBoard {
  const rng = mulberry32(seed ^ 0x9e3779b9);
  const empty: SudokuPuzzle = { size: n, boxRows: BOX_ROWS, boxCols: BOX_COLS, given: emptyGrid(n) };
  const out = search(empty, 1, true, () => shuffle(rng, DIGITS)).first;
  if (out === null) throw new Error('sudoku: aucune solution complète générée');
  return out;
}

function isUnique(puzzle: SudokuPuzzle): boolean {
  return search(puzzle, 2, false).count === 1;
}

/** Nombre de cases vides cible par difficulté (sur 36). */
function targetHoles(difficulty: Difficulty): number {
  if (difficulty === 'facile') return 18;
  if (difficulty === 'moyen') return 24;
  return 30;
}

function buildPuzzle(n: number, given: SudokuBoard): SudokuPuzzle {
  return { size: n, boxRows: BOX_ROWS, boxCols: BOX_COLS, given };
}

function generate(seed: number, difficulty: Difficulty): SudokuPuzzle {
  const n = SIZE;
  const rng = mulberry32(seed);
  const solution = randomFullSolution(seed, n);

  // On part de la grille complète et on retire des cases tant que l'unicité tient,
  // jusqu'à atteindre le nombre de trous cible (déterministe, SUD-D-3/D-4).
  const given = cloneGrid(solution);
  const cells: { r: number; c: number }[] = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) cells.push({ r, c });

  let holes = 0;
  const goal = targetHoles(difficulty);
  for (const { r, c } of shuffle(rng, cells)) {
    if (holes >= goal) break;
    const saved = given[r][c];
    given[r][c] = null;
    if (isUnique(buildPuzzle(n, given))) {
      holes++;
    } else {
      given[r][c] = saved; // retrait refusé : casserait l'unicité
    }
  }

  return buildPuzzle(n, given);
}

function validate(puzzle: SudokuPuzzle, board: SudokuBoard): ValidationResult {
  const n = puzzle.size;
  const violations: Violation[] = [];

  // Durcissement anti-triche (BUG-03) : board issu du réseau, on ne fait pas
  // confiance au typage. Forme n×n + domaine {1..6, null}.
  const malformed =
    !Array.isArray(board) ||
    board.length !== n ||
    board.some(
      (row) =>
        !Array.isArray(row) ||
        row.length !== n ||
        row.some((v) => v !== null && (typeof v !== 'number' || v < 1 || v > n || !Number.isInteger(v))),
    );
  if (malformed) {
    return { status: 'invalid', violations: [{ rule: 'shape', cells: [] }] };
  }

  // Respect des indices imposés.
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const g = puzzle.given[r][c];
      const b = board[r][c];
      if (g !== null && b !== null && b !== g) {
        violations.push({ rule: 'given', cells: [{ r, c }] });
      }
    }
  }

  // Doublons : lignes, colonnes, boîtes.
  const scan = (cells: { r: number; c: number }[], rule: string): void => {
    const seen = new Map<number, { r: number; c: number }>();
    for (const cell of cells) {
      const v = board[cell.r][cell.c];
      if (v === null) continue;
      const prev = seen.get(v);
      if (prev) violations.push({ rule, cells: [prev, cell] });
      else seen.set(v, cell);
    }
  };

  for (let r = 0; r < n; r++) {
    scan(Array.from({ length: n }, (_, c) => ({ r, c })), 'row');
  }
  for (let c = 0; c < n; c++) {
    scan(Array.from({ length: n }, (_, r) => ({ r, c })), 'col');
  }
  const boxesPerRow = n / BOX_COLS;
  for (let b = 0; b < n; b++) {
    const baseR = Math.floor(b / boxesPerRow) * BOX_ROWS;
    const baseC = (b % boxesPerRow) * BOX_COLS;
    const cells: { r: number; c: number }[] = [];
    for (let dr = 0; dr < BOX_ROWS; dr++) for (let dc = 0; dc < BOX_COLS; dc++) cells.push({ r: baseR + dr, c: baseC + dc });
    scan(cells, 'box');
  }

  const filled = board.every((row) => row.every((v) => v !== null));
  const status = violations.length > 0 ? 'invalid' : filled ? 'valid' : 'incomplete';
  return { status, violations };
}

/** Validateur Sudoku — sûr côté client (n'expose jamais la solution, FND-D-20/D-24). */
export const sudokuValidate = validate;

/** Moteur complet Sudoku — SERVEUR UNIQUEMENT (contient `solve`/`generate`). */
export const sudokuEngine: GameEngine<SudokuPuzzle, SudokuBoard> = {
  id: 'sudoku',
  generate,
  solve: (puzzle) => search(puzzle, 1, true).first,
  countSolutions: (puzzle, cap) => search(puzzle, cap, false).count,
  validate,
};
