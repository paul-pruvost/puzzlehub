import { DIFFICULTIES, type Difficulty, type GameId, type ValidationResult } from '@puzzlehub/shared';
import type {
  NonogramBoard,
  NonogramPuzzle,
  PatchesBoard,
  PatchesPuzzle,
  QueensBoard,
  QueensPuzzle,
  SudokuBoard,
  SudokuPuzzle,
  TangoBoard,
  TangoPuzzle,
  ZipBoard,
  ZipPuzzle,
} from '@puzzlehub/engine';
import {
  nonogramEngine,
  patchesEngine,
  queensEngine,
  sudokuEngine,
  tangoEngine,
  zipEngine,
} from '@puzzlehub/engine/server';
import { randomToken } from '../auth/pkce';

export type PlayableGame = 'tango' | 'queens' | 'patches' | 'zip' | 'sudoku' | 'nonogram';
export const PLAYABLE_GAMES: PlayableGame[] = ['tango', 'queens', 'patches', 'zip', 'sudoku', 'nonogram'];

/** Adaptateur serveur d'un jeu : génération offline + validation autoritative. */
export interface ServerGame {
  id: GameId;
  generate(seed: number, difficulty: Difficulty): unknown;
  validate(puzzle: unknown, board: unknown): ValidationResult;
}

const tangoServer: ServerGame = {
  id: 'tango',
  generate: (s, d) => tangoEngine.generate(s, d),
  validate: (p, b) => tangoEngine.validate(p as TangoPuzzle, b as TangoBoard),
};

const queensServer: ServerGame = {
  id: 'queens',
  generate: (s, d) => queensEngine.generate(s, d),
  validate: (p, b) => queensEngine.validate(p as QueensPuzzle, b as QueensBoard),
};

const patchesServer: ServerGame = {
  id: 'patches',
  generate: (s, d) => patchesEngine.generate(s, d),
  validate: (p, b) => patchesEngine.validate(p as PatchesPuzzle, b as PatchesBoard),
};

const zipServer: ServerGame = {
  id: 'zip',
  generate: (s, d) => zipEngine.generate(s, d),
  validate: (p, b) => zipEngine.validate(p as ZipPuzzle, b as ZipBoard),
};

const sudokuServer: ServerGame = {
  id: 'sudoku',
  generate: (s, d) => sudokuEngine.generate(s, d),
  validate: (p, b) => sudokuEngine.validate(p as SudokuPuzzle, b as SudokuBoard),
};

const nonogramServer: ServerGame = {
  id: 'nonogram',
  generate: (s, d) => nonogramEngine.generate(s, d),
  validate: (p, b) => nonogramEngine.validate(p as NonogramPuzzle, b as NonogramBoard),
};

export const SERVER_GAMES: Record<PlayableGame, ServerGame> = {
  tango: tangoServer,
  queens: queensServer,
  patches: patchesServer,
  zip: zipServer,
  sudoku: sudokuServer,
  nonogram: nonogramServer,
};

export interface BankPuzzle {
  id: string;
  game: GameId;
  difficulty: Difficulty;
  /** Puzzle servi au joueur — JAMAIS la solution (FND-D-20). */
  data: unknown;
}

export interface Bank {
  getRandom(game: GameId, difficulty: Difficulty): BankPuzzle | null;
  getById(id: string): BankPuzzle | null;
  /** Insère/écrase un puzzle (ex. défi quotidien généré à la volée, PROG-D-6). */
  put(puzzle: BankPuzzle): void;
  size(): number;
}

export class MemoryBank implements Bank {
  private readonly byId = new Map<string, BankPuzzle>();
  private readonly byCombo = new Map<string, BankPuzzle[]>();

  add(p: BankPuzzle): void {
    this.byId.set(p.id, p);
    const key = `${p.game}:${p.difficulty}`;
    const list = this.byCombo.get(key) ?? [];
    list.push(p);
    this.byCombo.set(key, list);
  }

  getRandom(game: GameId, difficulty: Difficulty): BankPuzzle | null {
    const list = this.byCombo.get(`${game}:${difficulty}`);
    if (!list || list.length === 0) return null;
    return list[Math.floor(Math.random() * list.length)];
  }

  getById(id: string): BankPuzzle | null {
    return this.byId.get(id) ?? null;
  }

  put(puzzle: BankPuzzle): void {
    this.byId.set(puzzle.id, puzzle);
  }

  size(): number {
    return this.byId.size;
  }
}

export interface BuildBankOptions {
  games?: PlayableGame[];
  difficulties?: Difficulty[];
  perCombo?: number;
  seedBase?: number;
}

/** Génère la banque offline (FND-D-16) : `perCombo` puzzles par (jeu, difficulté). */
export function buildBank(opts: BuildBankOptions = {}): MemoryBank {
  const games = opts.games ?? PLAYABLE_GAMES;
  const diffs = opts.difficulties ?? [...DIFFICULTIES];
  // Banque dev in-memory : peu de puzzles par combo (la prod est pré-générée offline,
  // FND-D-16 ; Zip 7×7 ~1 s/puzzle hors chemin requête).
  const per = opts.perCombo ?? 4;
  const bank = new MemoryBank();
  let seed = opts.seedBase ?? 1;
  for (const g of games) {
    for (const d of diffs) {
      for (let i = 0; i < per; i++) {
        bank.add({ id: randomToken(12), game: g, difficulty: d, data: SERVER_GAMES[g].generate(seed, d) });
        seed++;
      }
    }
  }
  return bank;
}
