import type { SudokuBoard, SudokuPuzzle } from '@puzzlehub/engine';

export function cellKey(r: number, c: number): string {
  return `${r},${c}`;
}

/** Grille de plateau initialisée depuis les indices imposés. */
export function boardFromGiven(puzzle: SudokuPuzzle): SudokuBoard {
  return puzzle.given.map((row) => row.slice());
}

/** Une case est-elle un indice imposé (non modifiable) ? */
export function isGiven(puzzle: SudokuPuzzle, r: number, c: number): boolean {
  return puzzle.given[r][c] !== null;
}

export interface SudokuSelection {
  r: number;
  c: number;
}

/**
 * Pose (ou efface si `value === null`) un chiffre dans une case, immuable.
 * Ignore les cases imposées et les valeurs hors bornes 1..size.
 */
export function setDigit(
  puzzle: SudokuPuzzle,
  board: SudokuBoard,
  r: number,
  c: number,
  value: number | null,
): SudokuBoard {
  if (isGiven(puzzle, r, c)) return board;
  if (value !== null && (value < 1 || value > puzzle.size)) return board;
  const next = board.map((row) => row.slice());
  next[r][c] = value;
  return next;
}

/** Déplace la sélection en restant dans les bornes de la grille. */
export function moveSelection(
  sel: SudokuSelection,
  dr: number,
  dc: number,
  size: number,
): SudokuSelection {
  return {
    r: Math.min(size - 1, Math.max(0, sel.r + dr)),
    c: Math.min(size - 1, Math.max(0, sel.c + dc)),
  };
}

/** Indices (ligne, colonne, boîte) partageant une contrainte avec (r,c). */
export function sharesUnit(
  puzzle: SudokuPuzzle,
  a: SudokuSelection,
  r: number,
  c: number,
): boolean {
  if (a.r === r && a.c === c) return false;
  const sameRow = a.r === r;
  const sameCol = a.c === c;
  const sameBox =
    Math.floor(a.r / puzzle.boxRows) === Math.floor(r / puzzle.boxRows) &&
    Math.floor(a.c / puzzle.boxCols) === Math.floor(c / puzzle.boxCols);
  return sameRow || sameCol || sameBox;
}

/** Bordures épaisses aux frontières de boîte (et bords externes). */
export function boxSides(
  puzzle: SudokuPuzzle,
  r: number,
  c: number,
): { top: boolean; right: boolean; bottom: boolean; left: boolean } {
  return {
    top: r % puzzle.boxRows === 0,
    bottom: (r + 1) % puzzle.boxRows === 0,
    left: c % puzzle.boxCols === 0,
    right: (c + 1) % puzzle.boxCols === 0,
  };
}
