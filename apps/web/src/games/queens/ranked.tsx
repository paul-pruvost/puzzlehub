import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { queensClient, type QueensBoard, type QueensPuzzle } from '@puzzlehub/engine';

import { RankedPlay } from '../../play/RankedPlay';
import { parseDifficulty } from '../../play/difficulty';
import type { GameRankedConfig } from '../../play/types';
import { QueensBoard as QueensGrid } from './QueensBoard';
import { boardFromGrid, cycle, emptyGrid, type CellState } from './cells';

export const queensRankedConfig: GameRankedConfig<CellState[][], QueensBoard, QueensPuzzle> = {
  id: 'queens',
  client: queensClient,
  initialState: (puzzle) => emptyGrid(puzzle.size),
  toServerBoard: (state) => boardFromGrid(state),
};

export function renderQueensBoard(ctx: {
  puzzle: QueensPuzzle;
  state: CellState[][];
  violations: Set<string>;
  setState: (updater: (prev: CellState[][]) => CellState[][]) => void;
}): ReactNode {
  const onCycle = (r: number, c: number): void => {
    ctx.setState((prev) => {
      const next = prev.map((row) => row.slice());
      const nx = cycle(next[r][c]);
      if (nx === 'queen') {
        // Une seule reine par ligne (représentation serveur).
        for (let cc = 0; cc < next[r].length; cc++) if (next[r][cc] === 'queen') next[r][cc] = 'empty';
      }
      next[r][c] = nx;
      return next;
    });
  };
  return <QueensGrid puzzle={ctx.puzzle} grid={ctx.state} violations={ctx.violations} onCycle={onCycle} />;
}

export default function RankedQueens(): JSX.Element {
  const [params] = useSearchParams();
  const difficulty = parseDifficulty(params.get('d'));
  return (
    <RankedPlay
      config={queensRankedConfig}
      source={{ kind: 'ranked', game: 'queens', difficulty }}
      title="Queens — Classé"
      intro="Grille servie et validée par le serveur (anti-triche). XP créditée à la résolution."
      renderBoard={renderQueensBoard}
    />
  );
}
