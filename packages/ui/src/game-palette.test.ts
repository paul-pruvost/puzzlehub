import { describe, expect, it } from 'vitest';
import { GAME_PALETTE_SIZE, gameColorVar } from './game-palette';

describe('gameColorVar', () => {
  it('mappe les indices 0-based sur --game-1..9', () => {
    expect(gameColorVar(0)).toBe('var(--game-1)');
    expect(gameColorVar(8)).toBe('var(--game-9)');
  });

  it('cycle modulo la taille de palette', () => {
    expect(gameColorVar(GAME_PALETTE_SIZE)).toBe('var(--game-1)');
    expect(gameColorVar(GAME_PALETTE_SIZE + 3)).toBe('var(--game-4)');
  });

  it('gère les indices négatifs sans casser', () => {
    expect(gameColorVar(-1)).toBe('var(--game-9)');
  });
});
