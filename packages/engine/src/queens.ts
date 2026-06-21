import { mulberry32, nextInt, shuffle } from '@puzzlehub/shared';
import type { Difficulty, ValidationResult, Violation } from '@puzzlehub/shared';
import type { GameEngine } from './types';

/**
 * QUEENS (FND-D-23 / règles vérifiées 2026-06-18) — grille N×N divisée en N
 * régions colorées.
 *  - Exactement 1 reine par ligne, par colonne et par région.
 *  - Deux reines ne sont jamais adjacentes (y compris en diagonale).
 *  - Solution unique.
 *
 * Modélisation : une solution = permutation `col[r]` (colonne de la reine de la
 * ligne r) telle que `|col[r] − col[r+1]| ≥ 2` (seules des lignes consécutives
 * peuvent être adjacentes ; la distinction des colonnes exclut l'adjacence
 * verticale, et `≥ 2` exclut l'adjacence diagonale).
 */
export interface QueensPuzzle {
  size: number;
  /** Identifiant de région (0..N-1) par case. */
  regions: number[][];
}

/** Plateau candidat : colonne de la reine par ligne, ou `null` si non posée. */
export type QueensBoard = (number | null)[];

function range(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i);
}

function sizeFor(difficulty: Difficulty): number {
  if (difficulty === 'facile') return 7;
  if (difficulty === 'difficile') return 9;
  return 8;
}

/** Permutation aléatoire valide (1/ligne, 1/colonne, non adjacentes). */
function randomSolution(rngSeed: number, n: number): number[] | null {
  const rng = mulberry32(rngSeed);
  const cols = new Array<number>(n).fill(-1);
  const used = new Array<boolean>(n).fill(false);

  const rec = (r: number, prev: number): boolean => {
    if (r === n) return true;
    for (const c of shuffle(rng, range(n))) {
      if (used[c]) continue;
      if (prev >= 0 && Math.abs(c - prev) < 2) continue;
      used[c] = true;
      cols[r] = c;
      if (rec(r + 1, c)) return true;
      used[c] = false;
    }
    return false;
  };

  return rec(0, -1) ? cols : null;
}

/** Partition du plateau en N régions connexes par croissance aléatoire depuis chaque reine. */
function growRegions(rng: () => number, n: number, queens: readonly number[]): number[][] {
  const region = Array.from({ length: n }, () => new Array<number>(n).fill(-1));
  for (let reg = 0; reg < n; reg++) {
    region[reg][queens[reg]] = reg;
  }
  const dr = [-1, 1, 0, 0];
  const dc = [0, 0, -1, 1];
  let assigned = n;
  const total = n * n;

  while (assigned < total) {
    const cands: { r: number; c: number; reg: number }[] = [];
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (region[r][c] !== -1) continue;
        const seen = new Set<number>();
        for (let k = 0; k < 4; k++) {
          const nr = r + dr[k];
          const nc = c + dc[k];
          if (nr < 0 || nc < 0 || nr >= n || nc >= n) continue;
          const g = region[nr][nc];
          if (g !== -1) seen.add(g);
        }
        for (const g of seen) cands.push({ r, c, reg: g });
      }
    }
    if (cands.length === 0) break;
    const pick = cands[nextInt(rng, cands.length)];
    region[pick.r][pick.c] = pick.reg;
    assigned++;
  }
  return region;
}

/** Énumère jusqu'à `cap` solutions du puzzle (colonnes par ligne). */
function solutions(puzzle: QueensPuzzle, cap: number): number[][] {
  const n = puzzle.size;
  const usedCol = new Array<boolean>(n).fill(false);
  const usedReg = new Array<boolean>(n).fill(false);
  const cols = new Array<number>(n).fill(-1);
  const out: number[][] = [];

  const rec = (r: number, prev: number): void => {
    if (out.length >= cap) return;
    if (r === n) {
      out.push(cols.slice());
      return;
    }
    for (let c = 0; c < n; c++) {
      if (usedCol[c]) continue;
      if (prev >= 0 && Math.abs(c - prev) < 2) continue;
      const reg = puzzle.regions[r][c];
      if (usedReg[reg]) continue;
      usedCol[c] = true;
      usedReg[reg] = true;
      cols[r] = c;
      rec(r + 1, c);
      usedCol[c] = false;
      usedReg[reg] = false;
      if (out.length >= cap) return;
    }
  };

  rec(0, -1);
  return out;
}

function sameSolution(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

/** La région `g` reste-t-elle connexe si on lui retire `cell` ? (BFS 4-voisins) */
function regionConnectedWithout(
  regions: number[][],
  n: number,
  g: number,
  removed: { r: number; c: number },
): boolean {
  const cells: { r: number; c: number }[] = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (regions[r][c] === g && !(r === removed.r && c === removed.c)) cells.push({ r, c });
    }
  }
  if (cells.length === 0) return false;
  const inG = (r: number, c: number): boolean =>
    r >= 0 && c >= 0 && r < n && c < n && regions[r][c] === g && !(r === removed.r && c === removed.c);
  const seen = new Set<string>();
  const start = cells[0];
  const stack = [start];
  seen.add(`${start.r},${start.c}`);
  const dr = [-1, 1, 0, 0];
  const dc = [0, 0, -1, 1];
  while (stack.length > 0) {
    const cur = stack.pop() as { r: number; c: number };
    for (let k = 0; k < 4; k++) {
      const nr = cur.r + dr[k];
      const nc = cur.c + dc[k];
      const id = `${nr},${nc}`;
      if (inG(nr, nc) && !seen.has(id)) {
        seen.add(id);
        stack.push({ r: nr, c: nc });
      }
    }
  }
  return seen.size === cells.length;
}

/**
 * Sculpte les régions pour rendre la solution `S` UNIQUE.
 * Tant qu'une solution alternée `A ≠ S` existe, on déplace une case-reine de `A`
 * (qui n'est pas une case-reine de S) vers une région voisine : `A` devient
 * invalide (deux reines dans la même région) sans toucher à `S`. Mutation en place.
 */
function makeUnique(regions: number[][], n: number, S: readonly number[]): boolean {
  const isQueenOfS = new Set<string>();
  for (let r = 0; r < n; r++) isQueenOfS.add(`${r},${S[r]}`);
  const dr = [-1, 1, 0, 0];
  const dc = [0, 0, -1, 1];

  for (let iter = 0; iter < 8 * n * n; iter++) {
    const sols = solutions({ size: n, regions }, 2);
    const alt = sols.find((a) => !sameSolution(a, S));
    if (!alt) return true;

    let carved = false;
    for (let r = 0; r < n; r++) {
      if (alt[r] === S[r]) continue;
      const cell = { r, c: alt[r] };
      if (isQueenOfS.has(`${cell.r},${cell.c}`)) continue;
      const g = regions[cell.r][cell.c];
      let target: number | null = null;
      for (let k = 0; k < 4; k++) {
        const nr = cell.r + dr[k];
        const nc = cell.c + dc[k];
        if (nr < 0 || nc < 0 || nr >= n || nc >= n) continue;
        const ng = regions[nr][nc];
        if (ng !== g) {
          target = ng;
          break;
        }
      }
      if (target === null) continue;
      if (!regionConnectedWithout(regions, n, g, cell)) continue;
      regions[cell.r][cell.c] = target;
      carved = true;
      break;
    }
    if (!carved) return false;
  }
  return false;
}

function generate(seed: number, difficulty: Difficulty): QueensPuzzle {
  const n = sizeFor(difficulty);
  const rng = mulberry32(seed ^ 0x85ebca6b);
  for (let attempt = 0; attempt < 400; attempt++) {
    const sol = randomSolution((seed ^ (attempt * 0x27d4eb2f)) >>> 0, n);
    if (!sol) continue;
    const regions = growRegions(rng, n, sol);
    if (makeUnique(regions, n, sol)) {
      return { size: n, regions };
    }
  }
  throw new Error('queens: génération à solution unique échouée');
}

function validate(puzzle: QueensPuzzle, board: QueensBoard): ValidationResult {
  const n = puzzle.size;
  const violations: Violation[] = [];

  // Durcissement anti-triche (BUG-03) : forme exacte (longueur n) + domaine des
  // colonnes (0 ≤ c < n ou null). Un board forgé hors-grille doit être rejeté.
  const malformed =
    !Array.isArray(board) ||
    board.length !== n ||
    board.some((c) => c !== null && (!Number.isInteger(c) || (c as number) < 0 || (c as number) >= n));
  if (malformed) {
    return { status: 'invalid', violations: [{ rule: 'shape', cells: [] }] };
  }

  const placed: { r: number; c: number }[] = [];
  for (let r = 0; r < n; r++) {
    const c = board[r];
    if (c !== null && c !== undefined) placed.push({ r, c });
  }

  // Colonnes distinctes.
  const colCount = new Map<number, number[]>();
  for (const q of placed) {
    const list = colCount.get(q.c) ?? [];
    list.push(q.r);
    colCount.set(q.c, list);
  }
  for (const [c, rows] of colCount) {
    if (rows.length > 1) {
      violations.push({ rule: 'column', cells: rows.map((r) => ({ r, c })) });
    }
  }

  // Régions distinctes.
  const regCount = new Map<number, { r: number; c: number }[]>();
  for (const q of placed) {
    const reg = puzzle.regions[q.r][q.c];
    const list = regCount.get(reg) ?? [];
    list.push(q);
    regCount.set(reg, list);
  }
  for (const [, cells] of regCount) {
    if (cells.length > 1) violations.push({ rule: 'region', cells });
  }

  // Non-adjacence (Chebyshev ≤ 1).
  for (let i = 0; i < placed.length; i++) {
    for (let j = i + 1; j < placed.length; j++) {
      const a = placed[i];
      const b = placed[j];
      if (Math.abs(a.r - b.r) <= 1 && Math.abs(a.c - b.c) <= 1) {
        violations.push({ rule: 'adjacent', cells: [a, b] });
      }
    }
  }

  const filled = board.length === n && board.every((c) => c !== null && c !== undefined);
  const status = violations.length > 0 ? 'invalid' : filled ? 'valid' : 'incomplete';
  return { status, violations };
}

/** Validateur Queens — sûr côté client (n'expose jamais la solution, FND-D-20/D-24). */
export const queensValidate = validate;

/** Moteur complet Queens — SERVEUR UNIQUEMENT (contient `solve`/`generate`). */
export const queensEngine: GameEngine<QueensPuzzle, QueensBoard> = {
  id: 'queens',
  generate,
  solve: (puzzle) => {
    const found = solutions(puzzle, 1);
    return found.length > 0 ? found[0].slice() : null;
  },
  countSolutions: (puzzle, cap) => solutions(puzzle, cap).length,
  validate,
};
