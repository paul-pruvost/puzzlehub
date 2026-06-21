import type { GameId, ValidationResult } from '@puzzlehub/shared';
import { tangoValidate, type TangoBoard, type TangoPuzzle } from './tango';
import { queensValidate, type QueensBoard, type QueensPuzzle } from './queens';
import { patchesValidate, type PatchesBoard, type PatchesPuzzle } from './patches';
import { zipValidate, type ZipBoard, type ZipPuzzle } from './zip';
import { sudokuValidate, type SudokuBoard, type SudokuPuzzle } from './sudoku';
import { nonogramValidate, type NonogramBoard, type NonogramPuzzle } from './nonogram';

/**
 * Surface moteur SÛRE CÔTÉ CLIENT (FND-D-20) : expose uniquement `validate`
 * pour le feedback live (FND-D-24). Ni `solve`, ni `generate`, ni
 * `countSolutions` ne sont importables côté front → aucune fuite de solution.
 * Le serveur autoritatif utilise `@puzzlehub/engine/server`.
 */
export interface ClientEngine<Puzzle, Board> {
  readonly id: GameId;
  validate(puzzle: Puzzle, board: Board): ValidationResult;
}

export const tangoClient: ClientEngine<TangoPuzzle, TangoBoard> = {
  id: 'tango',
  validate: tangoValidate,
};

export const queensClient: ClientEngine<QueensPuzzle, QueensBoard> = {
  id: 'queens',
  validate: queensValidate,
};

export const patchesClient: ClientEngine<PatchesPuzzle, PatchesBoard> = {
  id: 'patches',
  validate: patchesValidate,
};

export const zipClient: ClientEngine<ZipPuzzle, ZipBoard> = {
  id: 'zip',
  validate: zipValidate,
};

export const sudokuClient: ClientEngine<SudokuPuzzle, SudokuBoard> = {
  id: 'sudoku',
  validate: sudokuValidate,
};

export const nonogramClient: ClientEngine<NonogramPuzzle, NonogramBoard> = {
  id: 'nonogram',
  validate: nonogramValidate,
};
