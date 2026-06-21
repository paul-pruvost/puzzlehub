import type { GameId } from '@puzzlehub/shared';

/** Clé de date UTC (YYYY-MM-DD) pour le défi quotidien (PROG-D-6/D-7). */
export function dailyDateKey(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/** Seed déterministe (FNV-1a) → même puzzle pour tous un jour donné. */
export function dailySeed(dateKey: string, game: GameId): number {
  const s = `${dateKey}:${game}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Suivi « une tentative par utilisateur / jour / jeu ».
 * `claim` est un test-and-set atomique (F7) : renvoie `true` si la tentative du
 * jour vient d'être réservée, `false` si elle l'était déjà. Empêche le double
 * démarrage concurrent (donc le double bonus).
 */
export interface DailyStore {
  claim(userId: string, dateKey: string, game: GameId): Promise<boolean>;
}

export class MemoryDailyStore implements DailyStore {
  private readonly seen = new Set<string>();
  private key(userId: string, dateKey: string, game: GameId): string {
    return `${userId}:${dateKey}:${game}`;
  }
  async claim(userId: string, dateKey: string, game: GameId): Promise<boolean> {
    const k = this.key(userId, dateKey, game);
    if (this.seen.has(k)) return false;
    this.seen.add(k); // réservation synchrone, avant tout await en appelant
    return true;
  }
}
