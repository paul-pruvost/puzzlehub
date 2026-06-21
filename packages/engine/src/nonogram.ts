import { mulberry32, nextInt } from '@puzzlehub/shared';
import type { Difficulty, ValidationResult, Violation } from '@puzzlehub/shared';
import type { GameEngine } from './types';

/**
 * NONOGRAM / PICROSS — grille N×N à remplir d'après des indices de longueurs de
 * blocs par ligne et par colonne. Solution unique (FND-D-24).
 *  - `rowClues[r]` / `colClues[c]` = longueurs des blocs pleins consécutifs
 *    (liste vide = ligne/colonne entièrement vide).
 */
export interface NonogramPuzzle {
  size: number;
  rowClues: number[][];
  colClues: number[][];
}

/** Plateau candidat : 1 = case pleine, 0/null = case vide. */
export type NonogramBoard = (0 | 1 | null)[][];

function sizeFor(d: Difficulty): number {
  if (d === 'facile') return 5;
  if (d === 'moyen') return 8;
  return 10;
}

/** Longueurs des blocs de 1 consécutifs dans une ligne binaire. */
function runsOf(line: readonly number[]): number[] {
  const runs: number[] = [];
  let cur = 0;
  for (const v of line) {
    if (v === 1) cur++;
    else if (cur > 0) {
      runs.push(cur);
      cur = 0;
    }
  }
  if (cur > 0) runs.push(cur);
  return runs;
}

function eqRuns(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

/** Toutes les dispositions binaires d'une ligne de longueur `n` respectant `clue`. */
function linePatterns(clue: readonly number[], n: number): number[][] {
  const out: number[][] = [];
  const place = (idx: number, pos: number, acc: number[]): void => {
    if (idx === clue.length) {
      out.push([...acc, ...Array<number>(n - pos).fill(0)]);
      return;
    }
    const run = clue[idx];
    // Cases restantes minimales pour les blocs suivants (avec un gap chacun).
    let rest = 0;
    for (let j = idx + 1; j < clue.length; j++) rest += clue[j] + 1;
    const maxStart = n - pos - run - rest;
    for (let gap = idx === 0 ? 0 : 1; gap <= maxStart; gap++) {
      const next = [...acc, ...Array<number>(gap).fill(0), ...Array<number>(run).fill(1)];
      const sep = idx === clue.length - 1 ? 0 : 1;
      place(idx + 1, pos + gap + run + sep, sep ? [...next, 0] : next);
    }
  };
  place(0, 0, []);
  return out;
}

/**
 * Faisabilité d'un préfixe de colonne (k lignes posées) vis-à-vis de son indice.
 * Évite l'explosion combinatoire en élaguant tôt.
 */
function colFeasible(cells: readonly number[], clue: readonly number[], total: number): boolean {
  const runs: number[] = [];
  let cur = 0;
  for (const v of cells) {
    if (v === 1) cur++;
    else if (cur > 0) {
      runs.push(cur);
      cur = 0;
    }
  }
  const ongoing = cells.length > 0 && cells[cells.length - 1] === 1;
  const m = runs.length;
  for (let i = 0; i < m; i++) if (runs[i] !== clue[i]) return false;

  let need: number;
  if (ongoing) {
    if (m >= clue.length) return false;
    if (cur > clue[m]) return false;
    need = clue[m] - cur;
    for (let j = m + 1; j < clue.length; j++) need += 1 + clue[j];
  } else if (m === clue.length) {
    need = 0;
  } else {
    need = clue[m];
    for (let j = m + 1; j < clue.length; j++) need += 1 + clue[j];
  }
  return need <= total - cells.length;
}

interface SearchOut {
  count: number;
  first: number[][] | null;
  /** 2ᵉ solution distincte (si `wantFirst` et `count >= 2`) — sert à la réparation d'unicité (NGB-D-3). */
  second: number[][] | null;
}

function search(
  puzzle: NonogramPuzzle,
  cap: number,
  wantFirst: boolean,
  order?: (patterns: number[][]) => number[][],
): SearchOut {
  const n = puzzle.size;
  const rowPats = puzzle.rowClues.map((clue) => {
    const pats = linePatterns(clue, n);
    return order ? order(pats) : pats;
  });

  const grid: number[][] = [];
  let count = 0;
  let first: number[][] | null = null;
  let second: number[][] | null = null;

  const colsOk = (): boolean => {
    for (let c = 0; c < n; c++) {
      const cells = grid.map((row) => row[c]);
      if (!colFeasible(cells, puzzle.colClues[c], n)) return false;
    }
    return true;
  };

  const rec = (r: number): void => {
    if (count >= cap) return;
    if (r === n) {
      count++;
      if (wantFirst) {
        const snap = grid.map((row) => row.slice());
        if (first === null) first = snap;
        else if (second === null) second = snap;
      }
      return;
    }
    for (const pat of rowPats[r]) {
      grid[r] = pat;
      if (colsOk()) rec(r + 1);
      grid.pop();
      if (count >= cap) return;
    }
  };

  rec(0);
  return { count, first, second };
}

function cluesFromGrid(grid: readonly number[][], n: number): { rowClues: number[][]; colClues: number[][] } {
  const rowClues = grid.map((row) => runsOf(row));
  const colClues: number[][] = [];
  for (let c = 0; c < n; c++) colClues.push(runsOf(grid.map((row) => row[c])));
  return { rowClues, colClues };
}

/** Combinaison déterministe seed + sel (même idiome que l'ancien reseed). */
function mixSeed(seed: number, salt: number): number {
  return (seed ^ 0x85ebca6b) + salt * 0x9e3779b9;
}

/** Remplit une case seedée dans chaque ligne/colonne vide pour lever la dégénérescence. */
function fixDegenerate(rng: ReturnType<typeof mulberry32>, grid: number[][], n: number): number[][] {
  for (let r = 0; r < n; r++) if (grid[r].every((v) => v === 0)) grid[r][nextInt(rng, n)] = 1;
  for (let c = 0; c < n; c++) if (grid.every((row) => row[c] === 0)) grid[nextInt(rng, n)][c] = 1;
  return grid;
}

/**
 * Image seedée STRUCTURÉE (3 variantes) — bien plus souvent à solution unique que
 * du bruit i.i.d. (les rectangles/squelettes contigus tuent les ambiguïtés 2×2).
 */
function structuredImage(rng: ReturnType<typeof mulberry32>, n: number, variant: number): number[][] {
  const grid: number[][] = Array.from({ length: n }, () => Array<number>(n).fill(0));
  if (variant === 0) {
    // Peu de blocs par ligne, longueurs/positions seedées.
    for (let r = 0; r < n; r++) {
      const blocks = 1 + nextInt(rng, 2);
      let pos = 0;
      for (let b = 0; b < blocks; b++) {
        const remaining = n - pos;
        if (remaining < 1) break;
        pos += nextInt(rng, Math.max(1, Math.floor(remaining / 3) + 1));
        if (pos >= n) break;
        const len = 1 + nextInt(rng, Math.max(1, Math.min(4, n - pos)));
        for (let i = 0; i < len && pos < n; i++) grid[r][pos++] = 1;
        pos++; // gap après le bloc
      }
    }
  } else if (variant === 1) {
    // Quelques rectangles pleins (formes contiguës).
    const count = 2 + nextInt(rng, 3);
    for (let k = 0; k < count; k++) {
      const w = 1 + nextInt(rng, Math.max(1, Math.floor(n / 2)));
      const h = 1 + nextInt(rng, Math.max(1, Math.floor(n / 2)));
      const r0 = nextInt(rng, n - h + 1);
      const c0 = nextInt(rng, n - w + 1);
      for (let r = r0; r < r0 + h; r++) for (let c = c0; c < c0 + w; c++) grid[r][c] = 1;
    }
  } else {
    // Squelette diagonal seedé + bruit épars.
    const anti = nextInt(rng, 2) === 1;
    for (let i = 0; i < n; i++) grid[i][anti ? n - 1 - i : i] = 1;
    const noise = nextInt(rng, n);
    for (let k = 0; k < noise; k++) grid[nextInt(rng, n)][nextInt(rng, n)] = 1;
  }
  return grid;
}

/**
 * Réparation déterministe bornée (Phase B) : tant que les indices admettent ≥ 2
 * solutions, on traite la 1ʳᵉ case divergente (row-major) entre les deux témoins.
 * On préfère la REMPLIR (→ 1) : ça allonge/fusionne les blocs et limite le nombre
 * de motifs de ligne (donc le coût de `search`) ; on ne bascule à 0 que si la case
 * est déjà à 1, pour garantir que l'image change à chaque étape (pas de blocage).
 * Borné par N² itérations. Best-effort : l'unicité est garantie par le fallback C.
 */
function repairToUnique(grid: number[][], n: number): number[][] {
  const work = grid.map((row) => row.slice());
  for (let step = 0; step < n * n; step++) {
    const { rowClues, colClues } = cluesFromGrid(work, n);
    const out = search({ size: n, rowClues, colClues }, 2, true);
    if (out.count <= 1 || !out.first || !out.second) return work;
    let changed = false;
    for (let r = 0; r < n && !changed; r++) {
      for (let c = 0; c < n && !changed; c++) {
        if (out.first[r][c] !== out.second[r][c]) {
          work[r][c] = work[r][c] === 1 ? 0 : 1;
          changed = true;
        }
      }
    }
    if (!changed) return work;
  }
  return work;
}

/**
 * Fallback terminal (Phase C) — image escalier triangulaire (ou anti-triangulaire),
 * PROUVÉE à solution unique pour tout N (vérifié N=5/8/10). Inconditionnel : garantit
 * que `generate` ne lève jamais (NGB-D-2).
 */
function terminalUniqueImage(rng: ReturnType<typeof mulberry32>, n: number): number[][] {
  const anti = nextInt(rng, 2) === 1;
  return Array.from({ length: n }, (_, r) =>
    Array.from({ length: n }, (_, c) => (anti ? (c >= r ? 1 : 0) : c <= r ? 1 : 0)),
  );
}

/**
 * Génération seedée déterministe à UNICITÉ GARANTIE et terminaison garantie (NGB-D-1..4).
 * Remplace l'ancien rejection sampling i.i.d. (< 1 % d'images uniques en 10×10).
 *  - Phase A : K candidats structurés (chemin rapide), on garde le 1ᵉʳ unique ;
 *  - Phase B : réparation déterministe bornée d'un candidat structuré ;
 *  - Phase C : fallback escalier prouvé unique (ne lève jamais).
 * L'unicité est toujours VÉRIFIÉE (`count === 1`) en A/B et PROUVÉE par construction en C.
 */
function generate(seed: number, difficulty: Difficulty): NonogramPuzzle {
  const n = sizeFor(difficulty);
  const K = 12;

  // Phase A — candidats structurés seedés.
  for (let k = 0; k < K; k++) {
    const rng = mulberry32(mixSeed(seed, k + 1));
    const grid = fixDegenerate(rng, structuredImage(rng, n, k % 3), n);
    const { rowClues, colClues } = cluesFromGrid(grid, n);
    const puzzle: NonogramPuzzle = { size: n, rowClues, colClues };
    if (search(puzzle, 2, false).count === 1) return puzzle;
  }

  // Phase B — réparation déterministe bornée d'un candidat structuré.
  const rngB = mulberry32(mixSeed(seed, 0));
  const repaired = repairToUnique(fixDegenerate(rngB, structuredImage(rngB, n, 0), n), n);
  {
    const { rowClues, colClues } = cluesFromGrid(repaired, n);
    const puzzle: NonogramPuzzle = { size: n, rowClues, colClues };
    if (search(puzzle, 2, false).count === 1) return puzzle;
  }

  // Phase C — fallback terminal prouvé unique (inconditionnel).
  const grid = terminalUniqueImage(mulberry32(mixSeed(seed, 0xc)), n);
  const { rowClues, colClues } = cluesFromGrid(grid, n);
  return { size: n, rowClues, colClues };
}

function validate(puzzle: NonogramPuzzle, board: NonogramBoard): ValidationResult {
  const n = puzzle.size;
  const violations: Violation[] = [];

  // Durcissement anti-triche (BUG-03) : forme n×n + domaine {0,1,null}.
  const malformed =
    !Array.isArray(board) ||
    board.length !== n ||
    board.some(
      (row) => !Array.isArray(row) || row.length !== n || row.some((v) => v !== 0 && v !== 1 && v !== null),
    );
  if (malformed) {
    return { status: 'invalid', violations: [{ rule: 'shape', cells: [] }] };
  }

  const bin = board.map((row) => row.map((v) => (v === 1 ? 1 : 0)));
  let allMatch = true;
  let overfilled = false;

  const sum = (a: readonly number[]): number => a.reduce((s, x) => s + x, 0);

  for (let r = 0; r < n; r++) {
    const runs = runsOf(bin[r]);
    if (!eqRuns(runs, puzzle.rowClues[r])) allMatch = false;
    if (sum(bin[r]) > sum(puzzle.rowClues[r])) {
      overfilled = true;
      violations.push({ rule: 'row', cells: Array.from({ length: n }, (_, c) => ({ r, c })) });
    }
  }
  for (let c = 0; c < n; c++) {
    const col = bin.map((row) => row[c]);
    const runs = runsOf(col);
    if (!eqRuns(runs, puzzle.colClues[c])) allMatch = false;
    if (sum(col) > sum(puzzle.colClues[c])) {
      overfilled = true;
      violations.push({ rule: 'col', cells: Array.from({ length: n }, (_, r) => ({ r, c })) });
    }
  }

  const status = allMatch ? 'valid' : overfilled ? 'invalid' : 'incomplete';
  return { status, violations };
}

/** Validateur Nonogram — sûr côté client (n'expose jamais la solution). */
export const nonogramValidate = validate;

/** Moteur complet Nonogram — SERVEUR UNIQUEMENT (`solve`/`generate`). */
export const nonogramEngine: GameEngine<NonogramPuzzle, NonogramBoard> = {
  id: 'nonogram',
  generate,
  solve: (puzzle) => search(puzzle, 1, true).first as unknown as NonogramBoard | null,
  countSolutions: (puzzle, cap) => search(puzzle, cap, false).count,
  validate,
};
