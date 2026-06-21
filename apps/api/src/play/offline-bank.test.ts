import { describe, it, expect } from 'vitest';
import type { Difficulty } from '@puzzlehub/shared';
import { tangoEngine, sudokuEngine, patchesEngine } from '@puzzlehub/engine/server';
import { offlineSeed } from '../../scripts/build-offline-bank.js';
import { SERVER_GAMES, type PlayableGame } from './bank.js';
import tangoLevels from '../../../web/src/games/offline/tango.levels.json';
import sudokuLevels from '../../../web/src/games/offline/sudoku.levels.json';

/**
 * L1 — déterminisme de la banque hors-ligne (OFLP-D-5).
 *
 * Deux garanties :
 *  1) `offlineSeed` + `generate` est reproductible (deux générations identiques) ;
 *  2) le JSON livré correspond bien à la génération seedée (pas de drift).
 *
 * On compare la 1ʳᵉ génération (bump 0) : les slots livrés sont uniques au 1ᵉʳ
 * essai, donc le JSON = generate(offlineSeed(...)). On ne teste que quelques
 * slots pour rester rapide.
 */
const SLOTS: { game: PlayableGame; difficulty: Difficulty; index: number }[] = [
  { game: 'tango', difficulty: 'facile', index: 0 },
  { game: 'tango', difficulty: 'moyen', index: 3 },
  { game: 'sudoku', difficulty: 'difficile', index: 7 },
];

describe('banque hors-ligne — déterminisme (L1)', () => {
  it('offlineSeed est un uint32 stable', () => {
    const a = offlineSeed('tango', 'facile', 0);
    const b = offlineSeed('tango', 'facile', 0);
    expect(a).toBe(b);
    expect(Number.isInteger(a)).toBe(true);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThanOrEqual(0xffffffff);
    // Sensible aux composants de la clé.
    expect(offlineSeed('tango', 'facile', 1)).not.toBe(a);
    expect(offlineSeed('tango', 'moyen', 0)).not.toBe(a);
    expect(offlineSeed('queens', 'facile', 0)).not.toBe(a);
  });

  it('deux générations du même slot sont byte-identiques', () => {
    for (const { game, difficulty, index } of SLOTS) {
      const seed = offlineSeed(game, difficulty, index);
      const a = SERVER_GAMES[game].generate(seed, difficulty);
      const b = SERVER_GAMES[game].generate(seed, difficulty);
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    }
  });

  it('le JSON livré correspond à la génération seedée (pas de drift)', () => {
    const banks: Record<string, { levels: Record<Difficulty, unknown[]> }> = {
      tango: tangoLevels as unknown as { levels: Record<Difficulty, unknown[]> },
      sudoku: sudokuLevels as unknown as { levels: Record<Difficulty, unknown[]> },
    };
    for (const { game, difficulty, index } of SLOTS) {
      const seed = offlineSeed(game, difficulty, index);
      const generated = SERVER_GAMES[game].generate(seed, difficulty);
      const stored = banks[game].levels[difficulty][index];
      expect(JSON.stringify(stored)).toBe(JSON.stringify(generated));
    }
  });

  it('les puzzles livrés ne contiennent jamais de solution (anti-fuite)', () => {
    const blob = JSON.stringify(tangoLevels) + JSON.stringify(sudokuLevels);
    expect(blob).not.toContain('solution');
  });

  it('chaque slot livré est à solution unique (countSolutions === 1)', () => {
    // Quelques slots seulement, moteurs rapides (tango/patches/sudoku).
    expect(tangoEngine.countSolutions(tangoLevels.levels.facile[0] as never, 2)).toBe(1);
    expect(sudokuEngine.countSolutions(sudokuLevels.levels.facile[0] as never, 2)).toBe(1);
    void patchesEngine;
  });
});
