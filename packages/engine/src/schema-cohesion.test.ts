import { puzzleSchemaFor } from '@puzzlehub/shared';
import type { Difficulty, GameId } from '@puzzlehub/shared';
import { describe, expect, it } from 'vitest';

import { nonogramEngine, patchesEngine, queensEngine, sudokuEngine, tangoEngine, zipEngine } from './server';

/**
 * Cohésion forme ↔ schéma (RANK-D-2) : un puzzle réellement généré par chaque
 * moteur doit passer le schéma Zod partagé correspondant. Garde contre une
 * dérive silencieuse entre les types `*Puzzle` (engine) et les schémas (shared).
 * Test placé côté engine (engine → shared respecte le sens des dépendances).
 */
const cases: { id: GameId; gen: (seed: number, d: Difficulty) => unknown }[] = [
  { id: 'tango', gen: (s, d) => tangoEngine.generate(s, d) },
  { id: 'queens', gen: (s, d) => queensEngine.generate(s, d) },
  { id: 'zip', gen: (s, d) => zipEngine.generate(s, d) },
  { id: 'patches', gen: (s, d) => patchesEngine.generate(s, d) },
  { id: 'sudoku', gen: (s, d) => sudokuEngine.generate(s, d) },
  { id: 'nonogram', gen: (s, d) => nonogramEngine.generate(s, d) },
];

describe('cohésion puzzle généré ↔ schéma partagé', () => {
  for (const { id, gen } of cases) {
    it(`${id} : un puzzle généré passe son schéma`, () => {
      const puzzle = gen(42, 'facile');
      const result = puzzleSchemaFor(id).safeParse(puzzle);
      expect(result.success).toBe(true);
    });
  }
});
