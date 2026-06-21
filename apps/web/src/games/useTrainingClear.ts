import { useEffect, useRef } from 'react';
import type { Difficulty, GameId } from '@puzzlehub/shared';
import { useOfflineProgress } from '../app/OfflineProgressProvider';

/**
 * Enregistre le premier clear d'un niveau d'entraînement (OFLP-D-2, first-clear
 * strict). Se déclenche une seule fois par (difficulté, index) quand `solved`
 * passe à vrai ; rejouer le même niveau ne recrédite rien.
 */
export function useTrainingClear(
  game: GameId,
  difficulty: Difficulty,
  index: number,
  solved: boolean,
): void {
  const { recordClear } = useOfflineProgress();
  const lastKey = useRef<string | null>(null);

  useEffect(() => {
    if (!solved) return;
    const key = `${difficulty}:${index}`;
    if (lastKey.current === key) return;
    lastKey.current = key;
    recordClear(game, difficulty, index);
  }, [solved, game, difficulty, index, recordClear]);
}
