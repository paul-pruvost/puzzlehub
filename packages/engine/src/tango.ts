import { mulberry32, shuffle } from '@puzzlehub/shared';
import type { Coord, Difficulty, ValidationResult, Violation } from '@puzzlehub/shared';
import type { GameEngine } from './types';

/**
 * TANGO (FND-D-22 / règles vérifiées 2026-06-18) — grille 6×6, deux symboles.
 *  - 0 = soleil, 1 = lune.
 *  - Pas plus de 2 symboles identiques consécutifs (ligne/colonne).
 *  - Autant de soleils que de lunes par ligne et par colonne.
 *  - Contrainte `=` : mêmes symboles ; `x` : symboles opposés.
 *  - Solution unique.
 */
export type Sym = 0 | 1;
export type Cell = Sym | null;
export type ConstraintType = '=' | 'x';

export interface TangoConstraint {
  a: Coord;
  b: Coord;
  type: ConstraintType;
}

/** Puzzle servi au joueur : indices pré-remplis + contraintes (jamais la solution). */
export interface TangoPuzzle {
  size: number;
  given: Cell[][];
  constraints: TangoConstraint[];
}

/** Plateau candidat (partiel pendant la partie, complet à la soumission). */
export type TangoBoard = Cell[][];

const DEFAULT_ORDER: readonly Sym[] = [0, 1];

function key(r: number, c: number): string {
  return `${r},${c}`;
}

type Adj = Map<string, { r: number; c: number; type: ConstraintType }[]>;

function buildAdj(constraints: readonly TangoConstraint[]): Adj {
  const adj: Adj = new Map();
  const add = (from: Coord, to: Coord, type: ConstraintType): void => {
    const k = key(from.r, from.c);
    const list = adj.get(k) ?? [];
    list.push({ r: to.r, c: to.c, type });
    adj.set(k, list);
  };
  for (const con of constraints) {
    add(con.a, con.b, con.type);
    add(con.b, con.a, con.type);
  }
  return adj;
}

function emptyGrid(n: number): Cell[][] {
  return Array.from({ length: n }, () => Array<Cell>(n).fill(null));
}

function cloneGrid(grid: TangoBoard): TangoBoard {
  return grid.map((row) => row.slice());
}

/** Le placement de `v` en (r,c) crée-t-il 3 identiques consécutifs ? */
function formsTriple(grid: TangoBoard, r: number, c: number, v: Sym, n: number): boolean {
  const check = (get: (i: number) => Cell, idx: number): boolean => {
    for (let start = idx - 2; start <= idx; start++) {
      if (start < 0 || start + 2 >= n) continue;
      const a = start === idx ? v : get(start);
      const b = start + 1 === idx ? v : get(start + 1);
      const d = start + 2 === idx ? v : get(start + 2);
      if (a === v && b === v && d === v) return true;
    }
    return false;
  };
  if (check((i) => grid[r][i], c)) return true;
  if (check((i) => grid[i][c], r)) return true;
  return false;
}

interface SearchOut {
  count: number;
  first: TangoBoard | null;
}

/**
 * Backtracking commun au solveur et au comptage d'unicité.
 * `cap` borne le nombre de solutions comptées (cap dur, FND-D-16).
 * `order` permet une exploration aléatoire (génération de solution).
 */
function search(
  puzzle: TangoPuzzle,
  cap: number,
  wantFirst: boolean,
  order?: (r: number, c: number) => readonly Sym[],
): SearchOut {
  const n = puzzle.size;
  const half = n / 2;
  const grid = cloneGrid(puzzle.given);
  const adj = buildAdj(puzzle.constraints);

  const rowCnt = Array.from({ length: n }, () => [0, 0]);
  const colCnt = Array.from({ length: n }, () => [0, 0]);
  const empties: Coord[] = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const val = grid[r][c];
      if (val === null) {
        empties.push({ r, c });
      } else {
        rowCnt[r][val]++;
        colCnt[c][val]++;
      }
    }
  }

  // Cohérence des indices initiaux (sécurité ; la génération les garantit déjà).
  for (let i = 0; i < n; i++) {
    if (rowCnt[i][0] > half || rowCnt[i][1] > half) return { count: 0, first: null };
    if (colCnt[i][0] > half || colCnt[i][1] > half) return { count: 0, first: null };
  }

  const neighborsOk = (r: number, c: number, v: Sym): boolean => {
    const list = adj.get(key(r, c));
    if (!list) return true;
    for (const nb of list) {
      const nv = grid[nb.r][nb.c];
      if (nv === null) continue;
      if (nb.type === '=' && nv !== v) return false;
      if (nb.type === 'x' && nv === v) return false;
    }
    return true;
  };

  let count = 0;
  let first: TangoBoard | null = null;

  const rec = (k: number): void => {
    if (count >= cap) return;
    if (k === empties.length) {
      count++;
      if (wantFirst && first === null) first = cloneGrid(grid);
      return;
    }
    const pos = empties[k];
    const ord = order ? order(pos.r, pos.c) : DEFAULT_ORDER;
    for (const v of ord) {
      if (rowCnt[pos.r][v] === half) continue;
      if (colCnt[pos.c][v] === half) continue;
      if (formsTriple(grid, pos.r, pos.c, v, n)) continue;
      if (!neighborsOk(pos.r, pos.c, v)) continue;
      grid[pos.r][pos.c] = v;
      rowCnt[pos.r][v]++;
      colCnt[pos.c][v]++;
      rec(k + 1);
      grid[pos.r][pos.c] = null;
      rowCnt[pos.r][v]--;
      colCnt[pos.c][v]--;
      if (count >= cap) return;
    }
  };

  rec(0);
  return { count, first };
}

function randomFullSolution(seed: number, n: number): TangoBoard {
  const rng = mulberry32(seed ^ 0x9e3779b9);
  const empty: TangoPuzzle = { size: n, given: emptyGrid(n), constraints: [] };
  const out = search(empty, 1, true, () => shuffle(rng, DEFAULT_ORDER)).first;
  if (out === null) throw new Error('tango: aucune solution complète générée');
  return out;
}

type Clue =
  | { kind: 'g'; r: number; c: number }
  | { kind: 'c'; a: Coord; b: Coord; type: ConstraintType };

function buildPuzzle(n: number, clues: readonly Clue[], solution: TangoBoard): TangoPuzzle {
  const given = emptyGrid(n);
  const constraints: TangoConstraint[] = [];
  for (const clue of clues) {
    if (clue.kind === 'g') {
      given[clue.r][clue.c] = solution[clue.r][clue.c];
    } else {
      constraints.push({ a: clue.a, b: clue.b, type: clue.type });
    }
  }
  return { size: n, given, constraints };
}

function isUnique(puzzle: TangoPuzzle): boolean {
  return search(puzzle, 2, false).count === 1;
}

const SIZE = 6;

function generate(seed: number, difficulty: Difficulty): TangoPuzzle {
  const n = SIZE;
  const rng = mulberry32(seed);
  const solution = randomFullSolution(seed, n);

  const pool: Clue[] = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      pool.push({ kind: 'g', r, c });
      if (c + 1 < n) {
        const same = solution[r][c] === solution[r][c + 1];
        pool.push({ kind: 'c', a: { r, c }, b: { r, c: c + 1 }, type: same ? '=' : 'x' });
      }
      if (r + 1 < n) {
        const same = solution[r][c] === solution[r + 1][c];
        pool.push({ kind: 'c', a: { r, c }, b: { r: r + 1, c }, type: same ? '=' : 'x' });
      }
    }
  }

  const shuffled = shuffle(rng, pool);
  const chosen: Clue[] = [];
  for (const clue of shuffled) {
    chosen.push(clue);
    if (isUnique(buildPuzzle(n, chosen, solution))) break;
  }

  let finalClues: Clue[] = chosen;

  if (difficulty === 'difficile') {
    // Réduction : retire les indices redondants pour rendre le puzzle plus difficile.
    let cur = chosen.slice();
    for (const clue of shuffle(rng, chosen)) {
      const trial = cur.filter((x) => x !== clue);
      if (isUnique(buildPuzzle(n, trial, solution))) cur = trial;
    }
    finalClues = cur;
  } else if (difficulty === 'facile') {
    // Ajoute des indices supplémentaires (givens d'abord) pour aider le joueur.
    const extra = shuffled.filter((x) => !chosen.includes(x));
    const givensFirst = [
      ...extra.filter((x) => x.kind === 'g'),
      ...extra.filter((x) => x.kind === 'c'),
    ];
    finalClues = [...chosen, ...givensFirst.slice(0, 6)];
  }

  return buildPuzzle(n, finalClues, solution);
}

function validate(puzzle: TangoPuzzle, board: TangoBoard): ValidationResult {
  const n = puzzle.size;
  const half = n / 2;
  const violations: Violation[] = [];

  // Durcissement anti-triche (BUG-03) : le board provient du réseau, on ne fait
  // PAS confiance au typage. Forme exacte n×n + domaine des cases {0,1,null}.
  const malformed =
    !Array.isArray(board) ||
    board.length !== n ||
    board.some(
      (row) =>
        !Array.isArray(row) ||
        row.length !== n ||
        row.some((v) => v !== 0 && v !== 1 && v !== null),
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

  // Triples (lignes puis colonnes).
  for (let r = 0; r < n; r++) {
    for (let c = 0; c + 2 < n; c++) {
      const a = board[r][c];
      if (a !== null && a === board[r][c + 1] && a === board[r][c + 2]) {
        violations.push({
          rule: 'triple',
          cells: [
            { r, c },
            { r, c: c + 1 },
            { r, c: c + 2 },
          ],
        });
      }
    }
  }
  for (let c = 0; c < n; c++) {
    for (let r = 0; r + 2 < n; r++) {
      const a = board[r][c];
      if (a !== null && a === board[r + 1][c] && a === board[r + 2][c]) {
        violations.push({
          rule: 'triple',
          cells: [
            { r, c },
            { r: r + 1, c },
            { r: r + 2, c },
          ],
        });
      }
    }
  }

  // Contraintes =/x.
  for (const con of puzzle.constraints) {
    const va = board[con.a.r][con.a.c];
    const vb = board[con.b.r][con.b.c];
    if (va === null || vb === null) continue;
    if (con.type === '=' && va !== vb) violations.push({ rule: 'constraint', cells: [con.a, con.b] });
    if (con.type === 'x' && va === vb) violations.push({ rule: 'constraint', cells: [con.a, con.b] });
  }

  // Équilibre par ligne / colonne.
  for (let r = 0; r < n; r++) {
    let z = 0;
    let o = 0;
    for (let c = 0; c < n; c++) {
      const v = board[r][c];
      if (v === 0) z++;
      else if (v === 1) o++;
    }
    if (z > half || o > half) {
      violations.push({
        rule: 'balance',
        cells: Array.from({ length: n }, (_, c) => ({ r, c })),
      });
    }
  }
  for (let c = 0; c < n; c++) {
    let z = 0;
    let o = 0;
    for (let r = 0; r < n; r++) {
      const v = board[r][c];
      if (v === 0) z++;
      else if (v === 1) o++;
    }
    if (z > half || o > half) {
      violations.push({
        rule: 'balance',
        cells: Array.from({ length: n }, (_, r) => ({ r, c })),
      });
    }
  }

  const filled = board.every((row) => row.every((v) => v !== null));
  const status = violations.length > 0 ? 'invalid' : filled ? 'valid' : 'incomplete';
  return { status, violations };
}

/** Validateur Tango — sûr côté client (n'expose jamais la solution, FND-D-20/D-24). */
export const tangoValidate = validate;

/** Moteur complet Tango — SERVEUR UNIQUEMENT (contient `solve`/`generate`). */
export const tangoEngine: GameEngine<TangoPuzzle, TangoBoard> = {
  id: 'tango',
  generate,
  solve: (puzzle) => search(puzzle, 1, true).first,
  countSolutions: (puzzle, cap) => search(puzzle, cap, false).count,
  validate,
};
