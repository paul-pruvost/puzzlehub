import type { Cell, TangoPuzzle } from '@puzzlehub/engine';

/** Grille de plateau initialisée depuis les indices imposés du puzzle. */
export function boardFromGiven(puzzle: TangoPuzzle): Cell[][] {
  return puzzle.given.map((row) => row.slice());
}

/** Cycle d'une case (clavier) : vide → soleil(0) → lune(1) → vide. */
export function nextSymbol(cell: Cell): Cell {
  if (cell === null) return 0;
  if (cell === 0) return 1;
  return null;
}

/** Symbole posé par un bouton de souris (UX-D-2). */
export type TangoButton = 'sun' | 'moon';

/**
 * Applique un clic gauche (soleil) ou droit (lune) :
 *  - même symbole déjà présent → vide (toggle) ;
 *  - sinon → pose/remplace par le symbole du bouton.
 */
export function applyTangoClick(cell: Cell, button: TangoButton): Cell {
  if (button === 'sun') return cell === 0 ? null : 0;
  return cell === 1 ? null : 1;
}

/** Une case est-elle un indice imposé (non modifiable) ? */
export function isGiven(puzzle: TangoPuzzle, r: number, c: number): boolean {
  return puzzle.given[r][c] !== null;
}

/** Clé "r,c" pour les ensembles de cases (ex. cases en violation). */
export function cellKey(r: number, c: number): string {
  return `${r},${c}`;
}
