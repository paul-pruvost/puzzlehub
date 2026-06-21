/**
 * Store de progression hors-ligne côté front (OFLP-D-6). Source de vérité quand
 * l'utilisateur n'est PAS connecté ; sinon miroir local du serveur. Clears en
 * bitmask par (jeu, difficulté) — cf. `@puzzlehub/shared/offline-progress`.
 */
import {
  clearMask,
  isLevelCleared,
  setLevelCleared,
  type Difficulty,
  type GameId,
  type OfflineClears,
} from '@puzzlehub/shared';

const KEY = 'puzzlehub-offline-progress';
const VERSION = 1;

interface Stored {
  version: number;
  clears: OfflineClears;
}

function read(): Stored {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { version: VERSION, clears: {} };
    const parsed = JSON.parse(raw) as Partial<Stored>;
    if (parsed.version !== VERSION || typeof parsed.clears !== 'object' || parsed.clears === null) {
      return { version: VERSION, clears: {} };
    }
    return { version: VERSION, clears: parsed.clears as OfflineClears };
  } catch {
    return { version: VERSION, clears: {} };
  }
}

function write(clears: OfflineClears): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ version: VERSION, clears }));
  } catch {
    /* stockage indisponible : progression en mémoire seulement */
  }
}

export function getLocalClears(): OfflineClears {
  return read().clears;
}

/** Remplace intégralement les clears locaux (après fusion serveur au login). */
export function setLocalClears(clears: OfflineClears): void {
  write(clears);
}

/**
 * Marque un niveau terminé localement. Renvoie `true` au PREMIER clear (XP à
 * créditer), `false` si déjà fait (first-clear strict, OFLP-D-2).
 */
export function recordLocalClear(game: GameId, difficulty: Difficulty, index: number): boolean {
  const { clears } = read();
  const mask = clearMask(clears, game, difficulty);
  if (isLevelCleared(mask, index)) return false;
  const byGame = (clears[game] ??= {});
  byGame[difficulty] = setLevelCleared(mask, index);
  write(clears);
  return true;
}
