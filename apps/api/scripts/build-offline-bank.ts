/**
 * Build de la banque de niveaux hors-ligne (OFLP-D-5, FND-D-16/FND-D-20).
 *
 * Script Node (lancé via tsx) — JAMAIS exécuté dans le navigateur. Utilise
 * `@puzzlehub/engine/server` (generate/countSolutions) pour pré-générer une
 * banque ORDONNÉE par (jeu, difficulté). Émet UNIQUEMENT le puzzle (`data`) —
 * jamais la solution (anti-fuite, validation client = `validate` seul).
 *
 * Sortie : apps/web/src/games/offline/<game>.levels.json
 *   { game, version: 1, levels: { facile: [...], moyen: [...], difficile: [...] } }
 */
import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DIFFICULTIES, type Difficulty } from '@puzzlehub/shared';
import { OFFLINE_BANK_SIZE } from '@puzzlehub/shared';
import {
  nonogramEngine,
  patchesEngine,
  queensEngine,
  sudokuEngine,
  tangoEngine,
  zipEngine,
} from '@puzzlehub/engine/server';
import type { GameEngine } from '@puzzlehub/engine';
import { PLAYABLE_GAMES, type PlayableGame } from '../src/play/bank.js';

/** Moteurs complets (generate + countSolutions) — accès serveur uniquement. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ENGINES: Record<PlayableGame, GameEngine<any, any>> = {
  tango: tangoEngine,
  queens: queensEngine,
  patches: patchesEngine,
  zip: zipEngine,
  sudoku: sudokuEngine,
  nonogram: nonogramEngine,
};

/**
 * Nombre de niveaux par (jeu, difficulté). 20 par défaut (= OFFLINE_BANK_SIZE).
 * Réduit pour les jeux à puzzles lourds afin de borner le poids JSON (~120 KB/jeu).
 */
const PER_GAME_COUNT: Record<PlayableGame, number> = {
  tango: OFFLINE_BANK_SIZE,
  queens: OFFLINE_BANK_SIZE,
  patches: OFFLINE_BANK_SIZE,
  zip: OFFLINE_BANK_SIZE,
  sudoku: OFFLINE_BANK_SIZE,
  nonogram: OFFLINE_BANK_SIZE,
};

/**
 * Seed déterministe (FNV-1a, même style que `dailySeed`) pour un niveau offline.
 * Clé = "offline:<game>:<difficulty>:<index>" → uint32.
 */
export function offlineSeed(game: PlayableGame, difficulty: Difficulty, index: number): number {
  const s = `offline:${game}:${difficulty}:${index}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// scripts/ -> apps/api -> apps -> repo root
const REPO_ROOT = resolve(__dirname, '..', '..', '..');
const OUT_DIR = resolve(REPO_ROOT, 'apps', 'web', 'src', 'games', 'offline');

/** Quelques décalages de seed pour retenter en cas de non-unicité. */
const SEED_BUMPS = 8;

/** Génère un puzzle unique pour (game, difficulty, index). Retente si non unique. */
function generateUnique(game: PlayableGame, difficulty: Difficulty, index: number): unknown {
  const engine = ENGINES[game];
  for (let bump = 0; bump <= SEED_BUMPS; bump++) {
    // Décale l'index logique de `bump * OFFLINE_BANK_SIZE` pour un seed distinct
    // tout en restant déterministe et reproductible.
    const seed = offlineSeed(game, difficulty, index + bump * 1000);
    const puzzle = engine.generate(seed, difficulty);
    let count: number;
    try {
      count = engine.countSolutions(puzzle, 2);
    } catch (err) {
      console.warn(`[bank] ${game}/${difficulty}#${index} countSolutions threw (bump ${bump}):`, err);
      continue;
    }
    if (count === 1) {
      if (bump > 0) {
        console.warn(`[bank] ${game}/${difficulty}#${index} used seed bump ${bump} for uniqueness`);
      }
      return puzzle;
    }
    console.warn(`[bank] ${game}/${difficulty}#${index} not unique (count=${count}, bump ${bump}) — retrying`);
  }
  throw new Error(`[bank] ${game}/${difficulty}#${index}: no unique puzzle after ${SEED_BUMPS + 1} attempts`);
}

function buildGame(game: PlayableGame): { bytes: number } {
  const count = PER_GAME_COUNT[game];
  const levels: Record<Difficulty, unknown[]> = { facile: [], moyen: [], difficile: [] };
  for (const difficulty of DIFFICULTIES) {
    for (let index = 0; index < count; index++) {
      levels[difficulty].push(generateUnique(game, difficulty, index));
    }
  }
  const payload = { game, version: 1, levels };
  const json = JSON.stringify(payload); // compact (pas de pretty-print, OFLP-D-5 poids)
  const outFile = resolve(OUT_DIR, `${game}.levels.json`);
  writeFileSync(outFile, json, 'utf8');
  const bytes = statSync(outFile).size;
  return { bytes };
}

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });
  console.log(`[bank] writing to ${OUT_DIR}`);
  for (const game of PLAYABLE_GAMES) {
    const t0 = Date.now();
    const { bytes } = buildGame(game);
    const kb = (bytes / 1024).toFixed(1);
    console.log(`[bank] ${game}.levels.json — ${kb} KB (${PER_GAME_COUNT[game]}×3 levels, ${Date.now() - t0} ms)`);
  }
  console.log('[bank] done');
}

// Exécution directe (tsx scripts/build-offline-bank.ts) uniquement — pas à l'import
// (le test de déterminisme importe `offlineSeed` sans déclencher la génération).
if (process.argv[1] && resolve(process.argv[1]) === __filename) {
  main();
}
