import type { Difficulty, GameId } from '@puzzlehub/shared';

/** Banque de niveaux hors-ligne d'un jeu (générée au build, puzzles seuls). */
export interface OfflineLevels {
  game: GameId;
  version: number;
  levels: Record<Difficulty, unknown[]>;
}

// Imports dynamiques → Vite code-split chaque banque dans son propre chunk :
// seule la banque du jeu ouvert est téléchargée (OFLP-D-5).
const loaders: Record<GameId, () => Promise<{ default: OfflineLevels }>> = {
  tango: () => import('./tango.levels.json') as Promise<{ default: OfflineLevels }>,
  queens: () => import('./queens.levels.json') as Promise<{ default: OfflineLevels }>,
  zip: () => import('./zip.levels.json') as Promise<{ default: OfflineLevels }>,
  patches: () => import('./patches.levels.json') as Promise<{ default: OfflineLevels }>,
  sudoku: () => import('./sudoku.levels.json') as Promise<{ default: OfflineLevels }>,
  nonogram: () => import('./nonogram.levels.json') as Promise<{ default: OfflineLevels }>,
};

export async function loadLevels(game: GameId): Promise<OfflineLevels> {
  const mod = await loaders[game]();
  return mod.default;
}
