import { useEffect, useMemo, useState } from 'react';
import { parsePuzzle, type Difficulty, type GameId } from '@puzzlehub/shared';
import { useOfflineProgress } from '../app/OfflineProgressProvider';
import { loadLevels } from './offline/loadLevels';

export interface TrainingLevel<P> {
  puzzle: P | null;
  index: number;
  levelCount: number;
  loading: boolean;
  goPrev: () => void;
  goNext: () => void;
  goTo: (n: number) => void;
}

/**
 * Charge la banque de niveaux hors-ligne d'un jeu (lazy, par jeu) et pilote le
 * niveau courant. À l'ouverture d'une difficulté, démarre au **premier niveau
 * non terminé** (OFLP-D-4) ; navigation prev/next/goTo libre ensuite.
 */
export function useTrainingLevel<P>(game: GameId, difficulty: Difficulty): TrainingLevel<P> {
  const { nextLevel } = useOfflineProgress();
  const [levels, setLevels] = useState<unknown[] | null>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLevels(null);
    void loadLevels(game).then((bank) => {
      if (cancelled) return;
      const list = bank.levels[difficulty] ?? [];
      setLevels(list);
      // Position initiale = prochain non terminé (lecture ponctuelle des clears).
      setIndex(nextLevel(game, difficulty, list.length));
    });
    return () => {
      cancelled = true;
    };
    // nextLevel volontairement hors deps : on ne veut pas re-sauter à chaque clear.
  }, [game, difficulty]);

  const levelCount = levels?.length ?? 0;
  const puzzle = useMemo<P | null>(
    () => (levels && levels[index] !== undefined ? parsePuzzle<P>(game, levels[index]) : null),
    [levels, index, game],
  );

  const goTo = (n: number): void => setIndex(Math.max(0, Math.min(levelCount - 1, n)));

  return {
    puzzle,
    index,
    levelCount,
    loading: levels === null,
    goPrev: () => goTo(index - 1),
    goNext: () => goTo(index + 1),
    goTo,
  };
}
