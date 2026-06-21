import { describe, it, expect } from 'vitest';
import { GAMES, findGame } from './registry';

describe('registre de jeux', () => {
  it('a des identifiants uniques', () => {
    const ids = GAMES.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('expose Tango et Queens comme jouables', () => {
    expect(findGame('tango')?.available).toBe(true);
    expect(findGame('queens')?.available).toBe(true);
  });

  it('chaque jeu propose au moins une difficulté et une règle', () => {
    for (const g of GAMES) {
      expect(g.difficulties.length).toBeGreaterThan(0);
      expect(g.how.length).toBeGreaterThan(0);
    }
  });

  it('findGame renvoie undefined pour un identifiant inconnu', () => {
    expect(findGame('inconnu')).toBeUndefined();
  });
});
