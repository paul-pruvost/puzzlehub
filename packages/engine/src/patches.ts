import { mulberry32, nextInt } from '@puzzlehub/shared';
import type { Difficulty, ValidationResult, Violation } from '@puzzlehub/shared';
import type { GameEngine } from './types';

/**
 * PATCHES = SHIKAKU (FND-D-22) — partition de la grille N×N en rectangles ;
 * chaque rectangle contient exactement un indice = son aire ; tout couvert.
 * Solution unique.
 */
export interface PatchesClue {
  r: number;
  c: number;
  value: number;
}

export interface PatchesPuzzle {
  size: number;
  clues: PatchesClue[];
}

/** Chaque case pointe l'indice (rectangle) auquel elle appartient, ou null. */
export type PatchesBoard = (number | null)[][];

// Budget d'exploration en NŒUDS (PAT-F-3) : déterministe inter-machines,
// contrairement à un timeout wall-clock. Garantit une génération reproductible.
const GEN_NODE_BUDGET = 300_000;
const COUNT_NODE_BUDGET = 5_000_000;

interface Rect {
  r0: number;
  c0: number;
  r1: number;
  c1: number;
}

function sizeFor(d: Difficulty): number {
  if (d === 'facile') return 5;
  if (d === 'difficile') return 9;
  return 7;
}

// --- Partition guillotine aléatoire seedée ---
function partition(rng: () => number, rect: Rect, out: Rect[]): void {
  const h = rect.r1 - rect.r0 + 1;
  const w = rect.c1 - rect.c0 + 1;
  const area = h * w;
  const splittable = h > 1 || w > 1;
  const stop = area <= 2 || (area <= 6 && rng() < 0.4) || rng() < 0.12;
  if (!splittable || stop) {
    out.push(rect);
    return;
  }
  const splitV = w > 1 && (h <= 1 || rng() < 0.5);
  if (splitV) {
    const cut = rect.c0 + 1 + nextInt(rng, w - 1);
    partition(rng, { ...rect, c1: cut - 1 }, out);
    partition(rng, { ...rect, c0: cut }, out);
  } else {
    const cut = rect.r0 + 1 + nextInt(rng, h - 1);
    partition(rng, { ...rect, r1: cut - 1 }, out);
    partition(rng, { ...rect, r0: cut }, out);
  }
}

/** Rectangles possibles d'aire `clue.value` contenant la case de l'indice et aucun autre indice. */
function rectsForClue(n: number, clue: PatchesClue, clueCells: Set<string>): Rect[] {
  const res: Rect[] = [];
  const v = clue.value;
  for (let h = 1; h <= n; h++) {
    if (v % h !== 0) continue;
    const w = v / h;
    if (w > n) continue;
    for (let r0 = Math.max(0, clue.r - h + 1); r0 <= Math.min(clue.r, n - h); r0++) {
      for (let c0 = Math.max(0, clue.c - w + 1); c0 <= Math.min(clue.c, n - w); c0++) {
        const r1 = r0 + h - 1;
        const c1 = c0 + w - 1;
        let ok = true;
        for (const cell of clueCells) {
          const comma = cell.indexOf(',');
          const rr = Number(cell.slice(0, comma));
          const cc = Number(cell.slice(comma + 1));
          if (rr >= r0 && rr <= r1 && cc >= c0 && cc <= c1 && !(rr === clue.r && cc === clue.c)) {
            ok = false;
            break;
          }
        }
        if (ok) res.push({ r0, c0, r1, c1 });
      }
    }
  }
  return res;
}

interface SearchOut {
  count: number;
  first: PatchesBoard | null;
  /** `true` si le budget de nœuds a été dépassé (résultat non concluant). */
  timedOut: boolean;
}

function search(puzzle: PatchesPuzzle, cap: number, nodeBudget: number, wantFirst: boolean): SearchOut {
  const n = puzzle.size;
  const clueCells = new Set(puzzle.clues.map((c) => `${c.r},${c.c}`));
  const candidates = puzzle.clues.map((c) => rectsForClue(n, c, clueCells));
  // Heuristique : traiter d'abord les indices les plus contraints.
  const order = puzzle.clues.map((_, i) => i).sort((a, b) => candidates[a].length - candidates[b].length);
  const owner: PatchesBoard = Array.from({ length: n }, () => new Array<number | null>(n).fill(null));

  let count = 0;
  let first: PatchesBoard | null = null;
  let timedOut = false;
  let nodes = 0;

  const fits = (rect: Rect): boolean => {
    for (let r = rect.r0; r <= rect.r1; r++)
      for (let c = rect.c0; c <= rect.c1; c++) if (owner[r][c] !== null) return false;
    return true;
  };
  const paint = (rect: Rect, value: number | null): void => {
    for (let r = rect.r0; r <= rect.r1; r++) for (let c = rect.c0; c <= rect.c1; c++) owner[r][c] = value;
  };

  const rec = (i: number): void => {
    if (timedOut || count >= cap) return;
    if (++nodes > nodeBudget) {
      timedOut = true;
      return;
    }
    if (i === order.length) {
      count++;
      if (wantFirst && first === null) first = owner.map((row) => row.slice());
      return;
    }
    const k = order[i];
    for (const rect of candidates[k]) {
      if (!fits(rect)) continue;
      paint(rect, k);
      rec(i + 1);
      paint(rect, null);
      if (timedOut || count >= cap) return;
    }
  };

  rec(0);
  return { count, first, timedOut };
}

function generate(seed: number, difficulty: Difficulty): PatchesPuzzle {
  const n = sizeFor(difficulty);
  const rng = mulberry32((seed ^ 0xc2b2ae35) >>> 0);
  for (let attempt = 0; attempt < 400; attempt++) {
    const rects: Rect[] = [];
    partition(rng, { r0: 0, c0: 0, r1: n - 1, c1: n - 1 }, rects);
    if (rects.length < 2) continue;
    const clues: PatchesClue[] = rects.map((rc) => ({
      r: rc.r0 + nextInt(rng, rc.r1 - rc.r0 + 1),
      c: rc.c0 + nextInt(rng, rc.c1 - rc.c0 + 1),
      value: (rc.r1 - rc.r0 + 1) * (rc.c1 - rc.c0 + 1),
    }));
    const puzzle: PatchesPuzzle = { size: n, clues };
    const res = search(puzzle, 2, GEN_NODE_BUDGET, false);
    if (!res.timedOut && res.count === 1) return puzzle;
  }
  throw new Error('patches: génération à solution unique échouée');
}

function validate(puzzle: PatchesPuzzle, board: PatchesBoard): ValidationResult {
  const n = puzzle.size;
  const k = puzzle.clues.length;
  const violations: Violation[] = [];

  // Durcissement forme/domaine (anti-triche, FND-D-24).
  const malformed =
    !Array.isArray(board) ||
    board.length !== n ||
    board.some(
      (row) =>
        !Array.isArray(row) ||
        row.length !== n ||
        row.some((v) => v !== null && (!Number.isInteger(v) || (v as number) < 0 || (v as number) >= k)),
    );
  if (malformed) return { status: 'invalid', violations: [{ rule: 'shape', cells: [] }] };

  // Invariante de cohérence du puzzle (PAT-F-1/F-2) : la somme des aires couvre
  // exactement la grille. Sous cette garantie, complétude + bornes `≤` ⇒ partition
  // en rectangles parfaits (preuve dans l'audit). Sinon, puzzle malformé.
  const totalArea = puzzle.clues.reduce((s, c) => s + c.value, 0);
  if (totalArea !== n * n) return { status: 'invalid', violations: [{ rule: 'puzzle', cells: [] }] };

  const clueCells = puzzle.clues.map((c) => `${c.r},${c.c}`);
  let filled = true;

  for (let idx = 0; idx < k; idx++) {
    const cells: { r: number; c: number }[] = [];
    let r0 = n;
    let c0 = n;
    let r1 = -1;
    let c1 = -1;
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (board[r][c] === idx) {
          cells.push({ r, c });
          r0 = Math.min(r0, r);
          c0 = Math.min(c0, c);
          r1 = Math.max(r1, r);
          c1 = Math.max(c1, c);
        }
      }
    }
    if (cells.length === 0) continue;
    const value = puzzle.clues[idx].value;
    const bboxArea = (r1 - r0 + 1) * (c1 - c0 + 1);
    if (cells.length > value || bboxArea > value) {
      violations.push({ rule: 'rect', cells });
      continue;
    }
    // Aucun autre indice dans la bounding box du rectangle.
    for (let other = 0; other < k; other++) {
      if (other === idx) continue;
      const cc = clueCells[other];
      const comma = cc.indexOf(',');
      const rr = Number(cc.slice(0, comma));
      const ccol = Number(cc.slice(comma + 1));
      if (rr >= r0 && rr <= r1 && ccol >= c0 && ccol <= c1) {
        violations.push({ rule: 'clue', cells });
        break;
      }
    }
  }

  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (board[r][c] === null) filled = false;

  const status = violations.length > 0 ? 'invalid' : filled ? 'valid' : 'incomplete';
  return { status, violations };
}

/** Validateur Patches — sûr côté client (FND-D-20). */
export const patchesValidate = validate;

/** Moteur complet Patches — SERVEUR UNIQUEMENT. */
export const patchesEngine: GameEngine<PatchesPuzzle, PatchesBoard> = {
  id: 'patches',
  generate,
  solve: (puzzle) => search(puzzle, 1, COUNT_NODE_BUDGET, true).first,
  // `timeoutMs` ignoré au profit d'un budget en nœuds déterministe (PAT-F-3).
  countSolutions: (puzzle, cap) => {
    const res = search(puzzle, cap, COUNT_NODE_BUDGET, false);
    return res.timedOut ? cap + 1 : res.count; // jamais de faux-positif d'unicité
  },
  validate,
};
