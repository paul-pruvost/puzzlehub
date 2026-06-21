import type { QueensBoard, QueensPuzzle } from '@puzzlehub/engine';

/** État d'affichage d'une case : vide, marquée d'une croix d'exclusion, ou reine. */
export type CellState = 'empty' | 'mark' | 'queen';

export function emptyGrid(n: number): CellState[][] {
  return Array.from({ length: n }, () => Array<CellState>(n).fill('empty'));
}

/** Cycle au clic : vide → croix → reine → vide (FND-D-27, geste d'exclusion). */
export function cycle(state: CellState): CellState {
  if (state === 'empty') return 'mark';
  if (state === 'mark') return 'queen';
  return 'empty';
}

/** Dérive le plateau serveur `(colonne|null)[]` : une reine par ligne max. */
export function boardFromGrid(grid: CellState[][]): QueensBoard {
  return grid.map((row) => {
    const c = row.indexOf('queen');
    return c === -1 ? null : c;
  });
}

/** Bordures de frontière de région autour d'une case (accessibilité hors couleur). */
export function regionSides(
  puzzle: QueensPuzzle,
  r: number,
  c: number,
): { top: boolean; right: boolean; bottom: boolean; left: boolean } {
  const n = puzzle.size;
  const here = puzzle.regions[r][c];
  const diff = (rr: number, cc: number): boolean =>
    rr < 0 || cc < 0 || rr >= n || cc >= n || puzzle.regions[rr][cc] !== here;
  return {
    top: diff(r - 1, c),
    right: diff(r, c + 1),
    bottom: diff(r + 1, c),
    left: diff(r, c - 1),
  };
}

export function cellKey(r: number, c: number): string {
  return `${r},${c}`;
}
