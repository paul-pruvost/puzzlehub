import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { sudokuClient, type SudokuBoard as Board, type SudokuPuzzle } from '@puzzlehub/engine';

import { RankedPlay } from '../../play/RankedPlay';
import { parseDifficulty } from '../../play/difficulty';
import type { GameRankedConfig } from '../../play/types';
import { SudokuPlay } from './SudokuPlay';
import { boardFromGiven } from './cells';

export const sudokuRankedConfig: GameRankedConfig<Board, Board, SudokuPuzzle> = {
  id: 'sudoku',
  client: sudokuClient,
  initialState: (puzzle) => boardFromGiven(puzzle),
  toServerBoard: (state) => state,
};

export function renderSudokuBoard(ctx: {
  puzzle: SudokuPuzzle;
  state: Board;
  violations: Set<string>;
  setState: (updater: (prev: Board) => Board) => void;
}): ReactNode {
  return (
    <SudokuPlay
      puzzle={ctx.puzzle}
      board={ctx.state}
      violations={ctx.violations}
      setBoard={ctx.setState}
    />
  );
}

export default function RankedSudoku(): JSX.Element {
  const [params] = useSearchParams();
  const difficulty = parseDifficulty(params.get('d'));
  return (
    <RankedPlay
      config={sudokuRankedConfig}
      source={{ kind: 'ranked', game: 'sudoku', difficulty }}
      title="Mini-Sudoku — Classé"
      intro="Grille servie et validée par le serveur (anti-triche). XP créditée à la résolution."
      renderBoard={renderSudokuBoard}
    />
  );
}
