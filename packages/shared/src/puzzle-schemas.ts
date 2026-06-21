import { z } from 'zod';

import type { GameId } from './games';

/**
 * Schémas Zod de **forme** des puzzles servis par `/play/start` (RANK-D-2).
 *
 * Source unique réutilisée par `apps/api` (bornes d'entrée éventuelles) et
 * `apps/web` (parse du `puzzle` reçu avant tout rendu de plateau).
 *
 * IMPORTANT (PLAY-D-6 / FND-D-20) : ces schémas décrivent **uniquement** la
 * forme du puzzle servi au joueur — JAMAIS la solution. Ils doivent rester
 * structurellement compatibles avec les types `*Puzzle` de `@puzzlehub/engine`
 * (vérifié par un test de cohérence : un puzzle engine doit passer son schéma).
 * `packages/shared` ne dépend pas de `@puzzlehub/engine` (sens inverse), d'où la
 * duplication assumée de la forme.
 */

const size = z.number().int().positive();
const coord = z.object({ r: z.number().int().nonnegative(), c: z.number().int().nonnegative() });

/** Vrai si `grid` est une matrice carrée `size × size`. */
function isSquare(grid: readonly unknown[][], n: number): boolean {
  return grid.length === n && grid.every((row) => row.length === n);
}

// --- Tango -----------------------------------------------------------------
const tangoCell = z.union([z.literal(0), z.literal(1), z.null()]);
const tangoConstraint = z.object({ a: coord, b: coord, type: z.union([z.literal('='), z.literal('x')]) });

export const tangoPuzzleSchema = z
  .object({
    size,
    given: z.array(z.array(tangoCell)),
    constraints: z.array(tangoConstraint),
  })
  .refine((p) => isSquare(p.given, p.size), { message: 'tango: given must be size×size', path: ['given'] });

// --- Queens ----------------------------------------------------------------
export const queensPuzzleSchema = z
  .object({
    size,
    regions: z.array(z.array(z.number().int().nonnegative())),
  })
  .refine((p) => isSquare(p.regions, p.size), { message: 'queens: regions must be size×size', path: ['regions'] })
  .refine((p) => p.regions.every((row) => row.every((v) => v < p.size)), {
    message: 'queens: region id out of range [0,size)',
    path: ['regions'],
  });

// --- Zip -------------------------------------------------------------------
export const zipPuzzleSchema = z
  .object({
    size,
    numbers: z.array(z.array(z.number().int().positive().nullable())),
    walls: z.array(z.string()),
  })
  .refine((p) => isSquare(p.numbers, p.size), { message: 'zip: numbers must be size×size', path: ['numbers'] });

// --- Patches ---------------------------------------------------------------
const patchesClue = z.object({
  r: z.number().int().nonnegative(),
  c: z.number().int().nonnegative(),
  value: z.number().int().positive(),
});

export const patchesPuzzleSchema = z
  .object({
    size,
    clues: z.array(patchesClue),
  })
  .refine((p) => p.clues.every((cl) => cl.r < p.size && cl.c < p.size), {
    message: 'patches: clue out of bounds',
    path: ['clues'],
  });

// --- Sudoku ----------------------------------------------------------------
export const sudokuPuzzleSchema = z
  .object({
    size,
    boxRows: z.number().int().positive(),
    boxCols: z.number().int().positive(),
    given: z.array(z.array(z.number().int().positive().nullable())),
  })
  .refine((p) => isSquare(p.given, p.size), { message: 'sudoku: given must be size×size', path: ['given'] })
  .refine((p) => p.boxRows * p.boxCols === p.size, {
    message: 'sudoku: boxRows×boxCols must equal size',
    path: ['boxRows'],
  })
  .refine((p) => p.given.every((row) => row.every((v) => v === null || v <= p.size)), {
    message: 'sudoku: digit out of range [1,size]',
    path: ['given'],
  });

// --- Nonogram --------------------------------------------------------------
const clueLines = z.array(z.array(z.number().int().positive()));
export const nonogramPuzzleSchema = z
  .object({
    size,
    rowClues: clueLines,
    colClues: clueLines,
  })
  .refine((p) => p.rowClues.length === p.size && p.colClues.length === p.size, {
    message: 'nonogram: rowClues/colClues must have size entries',
    path: ['rowClues'],
  })
  .refine(
    (p) =>
      [...p.rowClues, ...p.colClues].every(
        (line) => line.reduce((s, x) => s + x, 0) + Math.max(0, line.length - 1) <= p.size,
      ),
    { message: 'nonogram: a clue line cannot fit in size', path: ['rowClues'] },
  );

export type TangoPuzzleShape = z.infer<typeof tangoPuzzleSchema>;
export type QueensPuzzleShape = z.infer<typeof queensPuzzleSchema>;
export type ZipPuzzleShape = z.infer<typeof zipPuzzleSchema>;
export type PatchesPuzzleShape = z.infer<typeof patchesPuzzleSchema>;
export type SudokuPuzzleShape = z.infer<typeof sudokuPuzzleSchema>;
export type NonogramPuzzleShape = z.infer<typeof nonogramPuzzleSchema>;

/** Schéma de forme du puzzle par jeu (RANK-D-2). */
export const PUZZLE_SCHEMAS: Record<GameId, z.ZodTypeAny> = {
  tango: tangoPuzzleSchema,
  queens: queensPuzzleSchema,
  zip: zipPuzzleSchema,
  patches: patchesPuzzleSchema,
  sudoku: sudokuPuzzleSchema,
  nonogram: nonogramPuzzleSchema,
};

export function puzzleSchemaFor(game: GameId): z.ZodTypeAny {
  return PUZZLE_SCHEMAS[game];
}

/**
 * Parse runtime d'un puzzle reçu du serveur pour un jeu donné.
 * Retourne le puzzle typé en cas de succès, sinon `null` (durcissement front :
 * un puzzle malformé ne doit jamais initialiser un plateau).
 */
export function parsePuzzle<T = unknown>(game: GameId, raw: unknown): T | null {
  const result = puzzleSchemaFor(game).safeParse(raw);
  return result.success ? (result.data as T) : null;
}
