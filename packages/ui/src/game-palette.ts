/**
 * Palette de jeu catégorielle (UX-D-4) — daltonien-safe, sobre (FND-D-2).
 * Source unique pour colorer des régions/rectangles (Queens, Patches, …).
 * Le cyclage modulo {@link GAME_PALETTE_SIZE} garantit un index toujours valide.
 */
export const GAME_PALETTE_SIZE = 9;

/** Variable CSS de fond pour un index de région/catégorie (0-based, cyclé). */
export function gameColorVar(index: number): string {
  const n = ((index % GAME_PALETTE_SIZE) + GAME_PALETTE_SIZE) % GAME_PALETTE_SIZE;
  return `var(--game-${n + 1})`;
}

/** Couleur de texte lisible par-dessus une teinte de palette. */
export const GAME_FG_VAR = 'var(--game-fg)';
