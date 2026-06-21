import type { NonogramBoard } from '@puzzlehub/engine';

export function cellKey(r: number, c: number): string {
  return `${r},${c}`;
}

export function emptyBoard(n: number): NonogramBoard {
  return Array.from({ length: n }, () => Array<0 | 1 | null>(n).fill(null));
}

/** Cycle au clic : vide → plein (1) → croix (0) → vide. */
export function nextCell(cell: 0 | 1 | null): 0 | 1 | null {
  if (cell === null) return 1;
  if (cell === 1) return 0;
  return null;
}
