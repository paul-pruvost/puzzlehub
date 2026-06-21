import { describe, it, expect } from 'vitest';
import type { TangoPuzzle } from '@puzzlehub/engine';
import { applyTangoClick, boardFromGiven, isGiven, nextSymbol } from './cells';

describe('logique de plateau Tango', () => {
  it('cycle vide → soleil → lune → vide (clavier)', () => {
    expect(nextSymbol(null)).toBe(0);
    expect(nextSymbol(0)).toBe(1);
    expect(nextSymbol(1)).toBe(null);
  });

  it('clic gauche pose le soleil, toggle si déjà soleil, remplace la lune', () => {
    expect(applyTangoClick(null, 'sun')).toBe(0);
    expect(applyTangoClick(0, 'sun')).toBe(null);
    expect(applyTangoClick(1, 'sun')).toBe(0);
  });

  it('clic droit pose la lune, toggle si déjà lune, remplace le soleil', () => {
    expect(applyTangoClick(null, 'moon')).toBe(1);
    expect(applyTangoClick(1, 'moon')).toBe(null);
    expect(applyTangoClick(0, 'moon')).toBe(1);
  });

  it('boardFromGiven copie les indices sans muter le puzzle', () => {
    const puzzle: TangoPuzzle = {
      size: 2,
      given: [
        [0, null],
        [null, 1],
      ],
      constraints: [],
    };
    const board = boardFromGiven(puzzle);
    board[0][1] = 1;
    expect(puzzle.given[0][1]).toBeNull();
    expect(isGiven(puzzle, 0, 0)).toBe(true);
    expect(isGiven(puzzle, 0, 1)).toBe(false);
  });
});
