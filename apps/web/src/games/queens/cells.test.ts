import { describe, it, expect } from 'vitest';
import type { QueensPuzzle } from '@puzzlehub/engine';
import { boardFromGrid, cycle, emptyGrid, regionSides } from './cells';

describe('logique de plateau Queens', () => {
  it('cycle vide → croix → reine → vide', () => {
    expect(cycle('empty')).toBe('mark');
    expect(cycle('mark')).toBe('queen');
    expect(cycle('queen')).toBe('empty');
  });

  it('boardFromGrid prend la colonne de la reine par ligne (sinon null)', () => {
    const grid = emptyGrid(3);
    grid[0][2] = 'queen';
    grid[1][0] = 'mark';
    expect(boardFromGrid(grid)).toEqual([2, null, null]);
  });

  it('regionSides détecte les frontières de région', () => {
    const puzzle: QueensPuzzle = {
      size: 2,
      regions: [
        [0, 1],
        [0, 1],
      ],
    };
    expect(regionSides(puzzle, 0, 0)).toEqual({ top: true, right: true, bottom: false, left: true });
  });
});
