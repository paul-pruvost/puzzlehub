/**
 * Progression hors-ligne (OFLP-D-2..D-6, CORR-1).
 *
 * Les niveaux terminés par (jeu, difficulté) sont stockés en **bitmask** entier
 * (bit i = niveau i terminé) → first-clear STRICT (rejouer ne recrédite rien) et
 * comptage exact même si on saute à un niveau N (pas de sur-crédit d'un simple
 * « index max »). Borné à 31 niveaux pour rester dans un entier 32-bit.
 *
 * L'XP hors-ligne est un SOMMANT DISJOINT de l'XP classé : le niveau global =
 * `levelForXp(xpClassé + offlineXpTotal(clears))`. Aucun double-compte, le classé
 * (serveur autoritatif) reste intact (OFLP-D-3).
 */
import type { Difficulty, GameId } from './games';
import { levelForXp, xpForDifficulty } from './progression';

/** Nombre de niveaux par (jeu, difficulté) dans la banque offline (OFLP-D-5).
 *  ≤ 31 pour tenir dans un bitmask 32-bit. */
export const OFFLINE_BANK_SIZE = 20;

/** Bitmask des niveaux terminés, par jeu puis difficulté. */
export type OfflineClears = Partial<Record<GameId, Partial<Record<Difficulty, number>>>>;

/** Masque des niveaux terminés pour un couple (jeu, difficulté). */
export function clearMask(clears: OfflineClears, game: GameId, difficulty: Difficulty): number {
  return clears[game]?.[difficulty] ?? 0;
}

export function isLevelCleared(mask: number, index: number): boolean {
  return index >= 0 && index < 31 && (mask & (1 << index)) !== 0;
}

/** Marque le niveau `index` terminé (immutable). Hors bornes → masque inchangé. */
export function setLevelCleared(mask: number, index: number): number {
  if (index < 0 || index >= 31) return mask >>> 0;
  return (mask | (1 << index)) >>> 0;
}

/** Nombre de niveaux distincts terminés (popcount). */
export function clearedCount(mask: number): number {
  let m = mask >>> 0;
  let count = 0;
  while (m !== 0) {
    m &= m - 1;
    count++;
  }
  return count;
}

/** Premier niveau non terminé dans [0, levelCount) ; si tous faits → dernier index. */
export function nextUnclearedIndex(mask: number, levelCount: number): number {
  for (let i = 0; i < levelCount && i < 31; i++) {
    if ((mask & (1 << i)) === 0) return i;
  }
  return Math.max(0, levelCount - 1);
}

/** XP hors-ligne totale = Σ (niveaux distincts terminés × barème de la difficulté). */
export function offlineXpTotal(clears: OfflineClears): number {
  let xp = 0;
  for (const game of Object.keys(clears) as GameId[]) {
    const byDiff = clears[game];
    if (!byDiff) continue;
    for (const d of Object.keys(byDiff) as Difficulty[]) {
      xp += clearedCount(byDiff[d] ?? 0) * xpForDifficulty(d);
    }
  }
  return xp;
}

/** Fusion idempotente (OR des masques) — merge localStorage ↔ serveur (OFLP-D-6). */
export function mergeClears(a: OfflineClears, b: OfflineClears): OfflineClears {
  const out: OfflineClears = {};
  for (const src of [a, b]) {
    for (const game of Object.keys(src) as GameId[]) {
      const byDiff = src[game];
      if (!byDiff) continue;
      const tgt = (out[game] ??= {});
      for (const d of Object.keys(byDiff) as Difficulty[]) {
        tgt[d] = (((tgt[d] ?? 0) | (byDiff[d] ?? 0)) >>> 0);
      }
    }
  }
  return out;
}

/** Niveau global = courbe de progression appliquée à (XP classé + XP hors-ligne). */
export function globalLevel(rankedXp: number, clears: OfflineClears): number {
  return levelForXp(rankedXp + offlineXpTotal(clears));
}
