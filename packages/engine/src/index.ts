// Point d'entrée par défaut = SÛR CÔTÉ CLIENT (types + validateurs uniquement).
// Le moteur complet (solve/generate) est sous `@puzzlehub/engine/server`.
export * from './types';
export * from './client';
export type { Sym, Cell, ConstraintType, TangoConstraint, TangoPuzzle, TangoBoard } from './tango';
export type { QueensPuzzle, QueensBoard } from './queens';
export type { PatchesPuzzle, PatchesBoard, PatchesClue } from './patches';
export type { ZipPuzzle, ZipBoard } from './zip';
export type { SudokuPuzzle, SudokuBoard } from './sudoku';
export type { NonogramPuzzle, NonogramBoard } from './nonogram';
