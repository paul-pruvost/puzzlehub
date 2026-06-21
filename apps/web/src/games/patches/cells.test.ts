import { describe, it, expect } from 'vitest';
import type { PatchesPuzzle } from '@puzzlehub/engine';
import { buildClueMap, initialOwner, ownerSides } from './cells';

const puzzle: PatchesPuzzle = {
  size: 2,
  clues: [
    { r: 0, c: 0, value: 2 },
    { r: 0, c: 1, value: 2 },
  ],
};

describe('logique de plateau Patches', () => {
  it('buildClueMap indexe les cases-indices', () => {
    const map = buildClueMap(puzzle);
    expect(map.get('0,0')).toEqual({ index: 0, value: 2 });
    expect(map.has('1,0')).toBe(false);
  });

  it('initialOwner place chaque indice sur sa case', () => {
    const owner = initialOwner(puzzle);
    expect(owner[0][0]).toBe(0);
    expect(owner[0][1]).toBe(1);
    expect(owner[1][0]).toBeNull();
  });

  it('ownerSides détecte les frontières d’appartenance', () => {
    const owner = initialOwner(puzzle);
    expect(ownerSides(owner, 0, 0, 2)).toEqual({ top: true, right: true, bottom: true, left: true });
  });
});
