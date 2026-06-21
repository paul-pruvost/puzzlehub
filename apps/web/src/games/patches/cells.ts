import type { PatchesBoard, PatchesPuzzle } from '@puzzlehub/engine';

export interface ClueInfo {
  index: number;
  value: number;
}

/** Map "r,c" → indice/valeur pour les cases-indices (non réassignables). */
export function buildClueMap(puzzle: PatchesPuzzle): Map<string, ClueInfo> {
  const map = new Map<string, ClueInfo>();
  puzzle.clues.forEach((clue, index) => map.set(`${clue.r},${clue.c}`, { index, value: clue.value }));
  return map;
}

/** Plateau initial : chaque case-indice appartient à son propre rectangle. */
export function initialOwner(puzzle: PatchesPuzzle): PatchesBoard {
  const n = puzzle.size;
  const owner: PatchesBoard = Array.from({ length: n }, () => new Array<number | null>(n).fill(null));
  puzzle.clues.forEach((clue, index) => {
    owner[clue.r][clue.c] = index;
  });
  return owner;
}

export function cellKey(r: number, c: number): string {
  return `${r},${c}`;
}

/** Frontières visuelles entre rectangles (cases d'appartenances différentes). */
export function ownerSides(
  owner: PatchesBoard,
  r: number,
  c: number,
  n: number,
): { top: boolean; right: boolean; bottom: boolean; left: boolean } {
  const here = owner[r][c];
  const diff = (rr: number, cc: number): boolean =>
    rr < 0 || cc < 0 || rr >= n || cc >= n || owner[rr][cc] !== here;
  return {
    top: diff(r - 1, c),
    right: diff(r, c + 1),
    bottom: diff(r + 1, c),
    left: diff(r, c - 1),
  };
}
