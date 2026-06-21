import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Coord } from '@puzzlehub/shared';
import { zipClient, type ZipBoard, type ZipPuzzle } from '@puzzlehub/engine';

import { RankedPlay } from '../../play/RankedPlay';
import { parseDifficulty } from '../../play/difficulty';
import type { GameRankedConfig } from '../../play/types';
import { ZipBoard as ZipGrid } from './ZipBoard';
import { nextPath } from './cells';

export const zipRankedConfig: GameRankedConfig<Coord[], ZipBoard, ZipPuzzle> = {
  id: 'zip',
  client: zipClient,
  initialState: () => [],
  toServerBoard: (state) => state,
};

export function renderZipBoard(ctx: {
  puzzle: ZipPuzzle;
  state: Coord[];
  violations: Set<string>;
  setState: (updater: (prev: Coord[]) => Coord[]) => void;
}): ReactNode {
  const onCellClick = (r: number, c: number): void => {
    ctx.setState((prev) => nextPath(prev, r, c, ctx.puzzle));
  };
  return <ZipGrid puzzle={ctx.puzzle} path={ctx.state} violations={ctx.violations} onCellClick={onCellClick} />;
}

export default function RankedZip(): JSX.Element {
  const [params] = useSearchParams();
  const difficulty = parseDifficulty(params.get('d'));
  return (
    <RankedPlay
      config={zipRankedConfig}
      source={{ kind: 'ranked', game: 'zip', difficulty }}
      title="Zip — Classé"
      intro="Grille servie et validée par le serveur (anti-triche). XP créditée à la résolution."
      renderBoard={renderZipBoard}
    />
  );
}
