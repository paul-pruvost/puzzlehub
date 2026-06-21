import { describe, expect, it } from 'vitest';

import { createAuthStores, createGameStores } from './index';
import {
  MemorySelectionStore,
  MemorySessionStore,
  MemoryTxStore,
  MemoryUserStore,
} from './memory';
import { PrismaSelectionStore, PrismaSessionStore, PrismaTxStore, PrismaUserStore } from './prisma';

describe('createAuthStores (APRISMA-D-2)', () => {
  it('sans DATABASE_URL → stores in-memory', () => {
    const s = createAuthStores(undefined);
    expect(s.users).toBeInstanceOf(MemoryUserStore);
    expect(s.sessions).toBeInstanceOf(MemorySessionStore);
    expect(s.tx).toBeInstanceOf(MemoryTxStore);
  });

  it('avec DATABASE_URL → stores Prisma (pas de connexion avant requête)', () => {
    const s = createAuthStores('postgresql://u:p@localhost:5432/db?schema=public');
    expect(s.users).toBeInstanceOf(PrismaUserStore);
    expect(s.sessions).toBeInstanceOf(PrismaSessionStore);
    expect(s.tx).toBeInstanceOf(PrismaTxStore);
  });
});

describe('createGameStores (COSM-D-5)', () => {
  it('sans DATABASE_URL → cosmetics in-memory', () => {
    expect(createGameStores(undefined).cosmetics).toBeInstanceOf(MemorySelectionStore);
  });

  it('avec DATABASE_URL → cosmetics Prisma', () => {
    const s = createGameStores('postgresql://u:p@localhost:5432/db?schema=public');
    expect(s.cosmetics).toBeInstanceOf(PrismaSelectionStore);
  });
});

describe('MemorySelectionStore', () => {
  it('renvoie les défauts pour un nouvel utilisateur', async () => {
    const store = new MemorySelectionStore();
    expect(await store.get('u1')).toEqual({
      palette: 'palette-default',
      pieceSkin: 'skin-default',
      boardTheme: 'theme-default',
    });
  });

  it('set puis get reflète le choix, une catégorie à la fois', async () => {
    const store = new MemorySelectionStore();
    await store.set('u1', 'palette', 'palette-emerald');
    expect(await store.get('u1')).toEqual({
      palette: 'palette-emerald',
      pieceSkin: 'skin-default',
      boardTheme: 'theme-default',
    });
  });

  it('deleteForUser réinitialise aux défauts (RGPD)', async () => {
    const store = new MemorySelectionStore();
    await store.set('u1', 'palette', 'palette-emerald');
    await store.deleteForUser('u1');
    expect(await store.get('u1')).toEqual({
      palette: 'palette-default',
      pieceSkin: 'skin-default',
      boardTheme: 'theme-default',
    });
  });
});
