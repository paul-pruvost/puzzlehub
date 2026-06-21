import type { Coord } from '@puzzlehub/shared';
import type { ZipPuzzle } from '@puzzlehub/engine';

export function cellKey(r: number, c: number): string {
  return `${r},${c}`;
}

function edgeKey(a: Coord, b: Coord): string {
  const k1 = `${a.r},${a.c}`;
  const k2 = `${b.r},${b.c}`;
  return k1 < k2 ? `${k1}|${k2}` : `${k2}|${k1}`;
}

/**
 * Calcule le nouveau chemin après un clic sur (r,c) :
 *  - chemin vide → démarre seulement sur la case « 1 » ;
 *  - clic sur la dernière case → annule (recule d'un pas) ;
 *  - clic sur une case déjà dans le chemin → tronque juste après elle ;
 *  - clic sur une case adjacente libre (sans mur) → étend le chemin.
 */
export function nextPath(path: Coord[], r: number, c: number, puzzle: ZipPuzzle): Coord[] {
  if (path.length === 0) {
    return puzzle.numbers[r][c] === 1 ? [{ r, c }] : path;
  }
  const last = path[path.length - 1];
  if (last.r === r && last.c === c) return path.slice(0, -1);
  const existing = path.findIndex((p) => p.r === r && p.c === c);
  if (existing >= 0) return path.slice(0, existing + 1);
  const adjacent = Math.abs(last.r - r) + Math.abs(last.c - c) === 1;
  const walled = new Set(puzzle.walls).has(edgeKey(last, { r, c }));
  return adjacent && !walled ? [...path, { r, c }] : path;
}
