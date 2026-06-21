/**
 * Source unique de la courbe de progression (FND-D-25, PROG-D-2).
 * Utilisée par le serveur (crédit/niveau) ET le front (barre d'XP) — pas de
 * duplication de formule.
 */
import type { Difficulty } from './games';

/** Barème XP par difficulté (PROG-D-1, FND-D-25). Source unique front↔back. */
export const XP_BY_DIFFICULTY: Record<Difficulty, number> = {
  facile: 10,
  moyen: 20,
  difficile: 35,
};

export function xpForDifficulty(d: Difficulty): number {
  return XP_BY_DIFFICULTY[d];
}

/** XP cumulée requise pour atteindre le niveau `level` (50·n·(n+1)). */
export function xpThresholdForLevel(level: number): number {
  return 50 * level * (level + 1);
}

/** Niveau dérivé de l'XP totale. */
export function levelForXp(xp: number): number {
  let n = 0;
  while (xpThresholdForLevel(n + 1) <= xp) n++;
  return n;
}
