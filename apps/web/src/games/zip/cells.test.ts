import { describe, it, expect } from 'vitest';
import type { ZipPuzzle } from '@puzzlehub/engine';
import { nextPath } from './cells';

const puzzle: ZipPuzzle = {
  size: 2,
  numbers: [
    [1, null],
    [null, 2],
  ],
  walls: [],
};

describe('logique de plateau Zip', () => {
  it('ne démarre que sur la case 1', () => {
    expect(nextPath([], 0, 1, puzzle)).toEqual([]);
    expect(nextPath([], 0, 0, puzzle)).toEqual([{ r: 0, c: 0 }]);
  });

  it('étend vers une case adjacente libre', () => {
    const p = nextPath([{ r: 0, c: 0 }], 1, 0, puzzle);
    expect(p).toEqual([
      { r: 0, c: 0 },
      { r: 1, c: 0 },
    ]);
  });

  it('n’étend pas vers une case non adjacente', () => {
    expect(nextPath([{ r: 0, c: 0 }], 1, 1, puzzle)).toEqual([{ r: 0, c: 0 }]);
  });

  it('clic sur la dernière case annule le dernier pas', () => {
    const path = [
      { r: 0, c: 0 },
      { r: 1, c: 0 },
    ];
    expect(nextPath(path, 1, 0, puzzle)).toEqual([{ r: 0, c: 0 }]);
  });

  it('un drag enchaîné (séquence de cases) construit le chemin complet', () => {
    // Simule pointerdown sur (0,0) puis pointerenter sur (1,0),(1,1).
    const drag: Array<[number, number]> = [
      [0, 0],
      [1, 0],
      [1, 1],
    ];
    let path = nextPath([], drag[0][0], drag[0][1], puzzle);
    for (let i = 1; i < drag.length; i++) {
      path = nextPath(path, drag[i][0], drag[i][1], puzzle);
    }
    expect(path).toEqual([
      { r: 0, c: 0 },
      { r: 1, c: 0 },
      { r: 1, c: 1 },
    ]);
  });

  it('un mur bloque l’extension pendant le drag', () => {
    const walled: ZipPuzzle = { ...puzzle, walls: ['0,0|1,0'] };
    const path = nextPath([{ r: 0, c: 0 }], 1, 0, walled);
    expect(path).toEqual([{ r: 0, c: 0 }]);
  });

  it('repasser sur une case ancienne tronque le chemin jusqu’à elle', () => {
    const path = [
      { r: 0, c: 0 },
      { r: 1, c: 0 },
      { r: 1, c: 1 },
    ];
    expect(nextPath(path, 0, 0, puzzle)).toEqual([{ r: 0, c: 0 }]);
  });
});
