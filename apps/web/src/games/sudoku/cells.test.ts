import { describe, expect, it } from 'vitest';
import type { SudokuPuzzle } from '@puzzlehub/engine';
import { boardFromGiven, moveSelection, setDigit, sharesUnit } from './cells';

const puzzle: SudokuPuzzle = {
  size: 6,
  boxRows: 2,
  boxCols: 3,
  given: [
    [1, null, null, null, null, null],
    [null, null, null, null, null, null],
    [null, null, null, null, null, null],
    [null, null, null, null, null, null],
    [null, null, null, null, null, null],
    [null, null, null, null, null, null],
  ],
};

describe('logique de plateau Sudoku', () => {
  it('setDigit pose une valeur sur une case libre', () => {
    const board = setDigit(puzzle, boardFromGiven(puzzle), 0, 1, 4);
    expect(board[0][1]).toBe(4);
  });

  it('setDigit efface avec null', () => {
    let board = setDigit(puzzle, boardFromGiven(puzzle), 0, 1, 4);
    board = setDigit(puzzle, board, 0, 1, null);
    expect(board[0][1]).toBeNull();
  });

  it('setDigit ignore les cases imposées', () => {
    const board = setDigit(puzzle, boardFromGiven(puzzle), 0, 0, 5);
    expect(board[0][0]).toBe(1);
  });

  it('setDigit ignore une valeur hors bornes', () => {
    const board = setDigit(puzzle, boardFromGiven(puzzle), 0, 1, 7);
    expect(board[0][1]).toBeNull();
  });

  it('moveSelection reste dans la grille', () => {
    expect(moveSelection({ r: 0, c: 0 }, -1, 0, 6)).toEqual({ r: 0, c: 0 });
    expect(moveSelection({ r: 0, c: 0 }, 1, 1, 6)).toEqual({ r: 1, c: 1 });
    expect(moveSelection({ r: 5, c: 5 }, 1, 1, 6)).toEqual({ r: 5, c: 5 });
  });

  it('sharesUnit détecte ligne, colonne et boîte', () => {
    const sel = { r: 0, c: 0 };
    expect(sharesUnit(puzzle, sel, 0, 5)).toBe(true); // même ligne
    expect(sharesUnit(puzzle, sel, 5, 0)).toBe(true); // même colonne
    expect(sharesUnit(puzzle, sel, 1, 2)).toBe(true); // même boîte 2×3
    expect(sharesUnit(puzzle, sel, 5, 5)).toBe(false);
    expect(sharesUnit(puzzle, sel, 0, 0)).toBe(false); // elle-même
  });
});
