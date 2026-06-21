import { mulberry32, shuffle } from '@puzzlehub/shared';
import type { Coord, Difficulty, ValidationResult, Violation } from '@puzzlehub/shared';
import type { GameEngine } from './types';

/**
 * ZIP (FND-D-22) — chemin orthogonal hamiltonien (toutes les cases une fois),
 * démarrant sur 1, finissant sur k, passant par les nombres dans l'ordre.
 * Murs = arêtes infranchissables. Solution unique.
 */
export interface ZipPuzzle {
  size: number;
  numbers: (number | null)[][];
  /** Arêtes infranchissables, clés canoniques `edgeKey`. */
  walls: string[];
}

/** Le chemin tracé, ordonné (du départ à l'arrivée). */
export type ZipBoard = Coord[];

const GEN_NODE_BUDGET = 400_000;
const COUNT_NODE_BUDGET = 6_000_000;
const DIRS: readonly [number, number][] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

function sizeFor(d: Difficulty): number {
  if (d === 'facile') return 5;
  if (d === 'difficile') return 7;
  return 6;
}

function edgeKey(a: Coord, b: Coord): string {
  const k1 = `${a.r},${a.c}`;
  const k2 = `${b.r},${b.c}`;
  return k1 < k2 ? `${k1}|${k2}` : `${k2}|${k1}`;
}

// --- Chemin hamiltonien aléatoire seedé (serpentin + backbite) ---
function makeHamiltonian(rng: () => number, n: number): Coord[] {
  const path: Coord[] = [];
  for (let r = 0; r < n; r++) {
    if (r % 2 === 0) for (let c = 0; c < n; c++) path.push({ r, c });
    else for (let c = n - 1; c >= 0; c--) path.push({ r, c });
  }
  const idx = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  const reindex = (): void => path.forEach((p, i) => (idx[p.r][p.c] = i));
  reindex();

  const iterations = 6 * n * n;
  for (let t = 0; t < iterations; t++) {
    if (rng() < 0.5) {
      path.reverse();
      reindex();
    }
    const tail = path[path.length - 1];
    for (const d of shuffle(rng, DIRS)) {
      const nr = tail.r + d[0];
      const nc = tail.c + d[1];
      if (nr < 0 || nc < 0 || nr >= n || nc >= n) continue;
      const j = idx[nr][nc];
      if (j === path.length - 2) continue; // déjà adjacent dans le chemin
      let lo = j + 1;
      let hi = path.length - 1;
      while (lo < hi) {
        const tmp = path[lo];
        path[lo] = path[hi];
        path[hi] = tmp;
        idx[path[lo].r][path[lo].c] = lo;
        idx[path[hi].r][path[hi].c] = hi;
        lo++;
        hi--;
      }
      if (lo === hi) idx[path[lo].r][path[lo].c] = lo;
      break;
    }
  }
  return path;
}

interface SearchOut {
  count: number;
  first: ZipBoard | null;
  timedOut: boolean;
}

function search(puzzle: ZipPuzzle, cap: number, nodeBudget: number, wantFirst: boolean): SearchOut {
  const n = puzzle.size;
  const numbers = puzzle.numbers;
  const walls = new Set(puzzle.walls);
  let k = 0;
  let start: Coord | null = null;
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      const v = numbers[r][c];
      if (v !== null) {
        if (v > k) k = v;
        if (v === 1) start = { r, c };
      }
    }
  if (!start) return { count: 0, first: null, timedOut: false };

  const visited = Array.from({ length: n }, () => new Array<boolean>(n).fill(false));
  const path: Coord[] = [];
  let count = 0;
  let first: ZipBoard | null = null;
  let timedOut = false;
  let nodes = 0;

  const rec = (cell: Coord, nextExpected: number): void => {
    if (timedOut || count >= cap) return;
    if (++nodes > nodeBudget) {
      timedOut = true;
      return;
    }
    if (path.length === n * n) {
      if (nextExpected === k + 1 && numbers[cell.r][cell.c] === k) {
        count++;
        if (wantFirst && first === null) first = path.map((p) => ({ ...p }));
      }
      return;
    }
    for (const d of DIRS) {
      const nr = cell.r + d[0];
      const nc = cell.c + d[1];
      if (nr < 0 || nc < 0 || nr >= n || nc >= n) continue;
      if (visited[nr][nc]) continue;
      if (walls.has(edgeKey(cell, { r: nr, c: nc }))) continue;
      const num = numbers[nr][nc];
      if (num !== null && num !== nextExpected) continue;
      visited[nr][nc] = true;
      path.push({ r: nr, c: nc });
      rec({ r: nr, c: nc }, num !== null ? nextExpected + 1 : nextExpected);
      path.pop();
      visited[nr][nc] = false;
      if (timedOut || count >= cap) return;
    }
  };

  visited[start.r][start.c] = true;
  path.push(start);
  rec(start, 2);
  return { count, first, timedOut };
}

function buildPuzzle(n: number, path: Coord[], checkpointIdx: number[]): ZipPuzzle {
  const numbers: (number | null)[][] = Array.from({ length: n }, () =>
    new Array<number | null>(n).fill(null),
  );
  const sorted = [...checkpointIdx].sort((a, b) => a - b);
  sorted.forEach((idx, t) => {
    const cell = path[idx];
    numbers[cell.r][cell.c] = t + 1;
  });
  return { size: n, numbers, walls: [] };
}

function generate(seed: number, difficulty: Difficulty): ZipPuzzle {
  const n = sizeFor(difficulty);
  const rng = mulberry32((seed ^ 0x2545f491) >>> 0);
  for (let attempt = 0; attempt < 40; attempt++) {
    const path = makeHamiltonian(rng, n);
    const last = n * n - 1;
    const interior: number[] = [];
    for (let i = 1; i < last; i++) interior.push(i);
    const shuffled = shuffle(rng, interior);
    const chosen = [0, last];
    let ptr = 0;
    for (;;) {
      const puzzle = buildPuzzle(n, path, chosen);
      const res = search(puzzle, 2, GEN_NODE_BUDGET, false);
      if (!res.timedOut && res.count === 1) return puzzle;
      if (ptr >= shuffled.length) break;
      chosen.push(shuffled[ptr++]);
    }
  }
  throw new Error('zip: génération à solution unique échouée');
}

function validate(puzzle: ZipPuzzle, path: ZipBoard): ValidationResult {
  const n = puzzle.size;
  const numbers = puzzle.numbers;
  const violations: Violation[] = [];

  if (!Array.isArray(path)) return { status: 'invalid', violations: [{ rule: 'shape', cells: [] }] };
  if (path.length > n * n) return { status: 'invalid', violations: [{ rule: 'shape', cells: [] }] };
  for (const p of path) {
    if (
      !p ||
      !Number.isInteger(p.r) ||
      !Number.isInteger(p.c) ||
      p.r < 0 ||
      p.c < 0 ||
      p.r >= n ||
      p.c >= n
    ) {
      return { status: 'invalid', violations: [{ rule: 'shape', cells: [] }] };
    }
  }

  let k = 0;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (numbers[r][c] !== null) k = Math.max(k, numbers[r][c] as number);

  const seen = new Set<string>();
  for (const p of path) {
    const key = `${p.r},${p.c}`;
    if (seen.has(key)) violations.push({ rule: 'repeat', cells: [p] });
    seen.add(key);
  }

  const walls = new Set(puzzle.walls);
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1];
    const b = path[i];
    if (Math.abs(a.r - b.r) + Math.abs(a.c - b.c) !== 1 || walls.has(edgeKey(a, b))) {
      violations.push({ rule: 'adjacency', cells: [a, b] });
    }
  }

  let expect = 1;
  for (const p of path) {
    const num = numbers[p.r][p.c];
    if (num !== null) {
      if (num !== expect) violations.push({ rule: 'order', cells: [p] });
      expect++;
    }
  }

  if (path.length > 0 && numbers[path[0].r][path[0].c] !== 1) {
    violations.push({ rule: 'start', cells: [path[0]] });
  }

  const filled = path.length === n * n && seen.size === n * n;
  const lastCell = path[path.length - 1];
  const endOk = path.length > 0 && numbers[lastCell.r][lastCell.c] === k;
  const status =
    violations.length > 0 ? 'invalid' : filled && endOk && expect === k + 1 ? 'valid' : 'incomplete';
  return { status, violations };
}

/** Validateur Zip — sûr côté client (FND-D-20). */
export const zipValidate = validate;

/** Moteur complet Zip — SERVEUR UNIQUEMENT. */
export const zipEngine: GameEngine<ZipPuzzle, ZipBoard> = {
  id: 'zip',
  generate,
  solve: (puzzle) => search(puzzle, 1, COUNT_NODE_BUDGET, true).first,
  countSolutions: (puzzle, cap) => {
    const res = search(puzzle, cap, COUNT_NODE_BUDGET, false);
    // Budget épuisé : on renvoie `cap+1` (« au moins au-delà du budget ») plutôt
    // qu'un compte tronqué, pour ne jamais faux-positiver une unicité (ZIP-D-4).
    return res.timedOut ? cap + 1 : res.count;
  },
  validate,
};
