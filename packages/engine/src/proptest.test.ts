import fc from 'fast-check';
import type { Difficulty } from '@puzzlehub/shared';
import { describe, expect, it } from 'vitest';

import { nonogramEngine } from './nonogram';
import { patchesEngine } from './patches';
import { queensEngine } from './queens';
import { sudokuEngine } from './sudoku';
import { tangoEngine } from './tango';
import { zipEngine } from './zip';
import type { GameEngine } from './types';

/**
 * Invariants property-based (PROP-D-2) vérifiés sur des seeds aléatoires :
 *  P1 — solve produit une solution que validate juge `valid` ;
 *  P2 — le puzzle généré a une solution unique (countSolutions cap 2 === 1).
 */
function checkInvariants<P, B>(engine: GameEngine<P, B>, difficulty: Difficulty): (seed: number) => void {
  return (seed: number) => {
    const puzzle = engine.generate(seed, difficulty);
    const sol = engine.solve(puzzle);
    expect(sol).not.toBeNull();
    expect(engine.validate(puzzle, sol as B).status).toBe('valid');
    expect(engine.countSolutions(puzzle, 2)).toBe(1);
  };
}

const seed = fc.integer({ min: 0, max: 1_000_000 });

describe('property-based — invariants moteurs (unicité + validate(solve))', () => {
  it('Tango (facile & moyen)', () => {
    fc.assert(fc.property(seed, checkInvariants(tangoEngine, 'facile')), { numRuns: 30 });
    fc.assert(fc.property(seed, checkInvariants(tangoEngine, 'moyen')), { numRuns: 20 });
  });

  it('Queens (facile)', () => {
    fc.assert(fc.property(seed, checkInvariants(queensEngine, 'facile')), { numRuns: 20 });
  });

  it('Patches (facile & moyen)', () => {
    fc.assert(fc.property(seed, checkInvariants(patchesEngine, 'facile')), { numRuns: 30 });
    fc.assert(fc.property(seed, checkInvariants(patchesEngine, 'moyen')), { numRuns: 20 });
  });

  it('Sudoku (facile, moyen & difficile)', () => {
    fc.assert(fc.property(seed, checkInvariants(sudokuEngine, 'facile')), { numRuns: 30 });
    fc.assert(fc.property(seed, checkInvariants(sudokuEngine, 'moyen')), { numRuns: 20 });
    fc.assert(fc.property(seed, checkInvariants(sudokuEngine, 'difficile')), { numRuns: 15 });
  });

  it(
    'Nonogram (facile, moyen & difficile)',
    () => {
      fc.assert(fc.property(seed, checkInvariants(nonogramEngine, 'facile')), { numRuns: 15 });
      fc.assert(fc.property(seed, checkInvariants(nonogramEngine, 'moyen')), { numRuns: 8 });
      // difficile 10×10 : régression BUG-Nonogram-gen (génération désormais fiable).
      fc.assert(fc.property(seed, checkInvariants(nonogramEngine, 'difficile')), { numRuns: 10 });
    },
    60_000,
  );

  it(
    'Zip (facile)',
    () => {
      fc.assert(fc.property(seed, checkInvariants(zipEngine, 'facile')), { numRuns: 12 });
    },
    30_000,
  );
});
