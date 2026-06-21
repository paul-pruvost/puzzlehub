import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { nonogramClient, type NonogramBoard as Board, type NonogramPuzzle } from '@puzzlehub/engine';

import { RankedPlay } from '../../play/RankedPlay';
import { parseDifficulty } from '../../play/difficulty';
import type { GameRankedConfig } from '../../play/types';
import { NonogramBoard } from './NonogramBoard';
import { emptyBoard, nextCell } from './cells';

export const nonogramRankedConfig: GameRankedConfig<Board, Board, NonogramPuzzle> = {
  id: 'nonogram',
  client: nonogramClient,
  initialState: (puzzle) => emptyBoard(puzzle.size),
  toServerBoard: (state) => state,
};

export function renderNonogramBoard(ctx: {
  puzzle: NonogramPuzzle;
  state: Board;
  violations: Set<string>;
  setState: (updater: (prev: Board) => Board) => void;
}): ReactNode {
  const onCellClick = (r: number, c: number): void => {
    ctx.setState((prev) => {
      const next = prev.map((row) => row.slice());
      next[r][c] = nextCell(next[r][c]);
      return next;
    });
  };
  return (
    <div className="overflow-x-auto">
      <NonogramBoard puzzle={ctx.puzzle} board={ctx.state} violations={ctx.violations} onCellClick={onCellClick} />
    </div>
  );
}

export default function RankedNonogram(): JSX.Element {
  const [params] = useSearchParams();
  const difficulty = parseDifficulty(params.get('d'));
  return (
    <RankedPlay
      config={nonogramRankedConfig}
      source={{ kind: 'ranked', game: 'nonogram', difficulty }}
      title="Nonogram — Classé"
      intro="Grille servie et validée par le serveur (anti-triche). XP créditée à la résolution."
      renderBoard={renderNonogramBoard}
    />
  );
}
