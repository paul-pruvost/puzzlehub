import { useMemo, useState } from 'react';
import { type Difficulty } from '@puzzlehub/shared';
import { nonogramClient, type NonogramBoard as Board, type NonogramPuzzle } from '@puzzlehub/engine';
import { TrainingShell } from '../TrainingShell';
import { useTrainingLevel } from '../useTrainingLevel';
import { useTrainingClear } from '../useTrainingClear';
import { cellKey, emptyBoard, nextCell } from './cells';
import { NonogramBoard } from './NonogramBoard';

const STATUS_TEXT: Record<string, string> = {
  valid: 'Résolu, bravo !',
  invalid: 'Trop de cases pleines sur une ligne ou colonne (en rouge).',
  incomplete: 'Remplis les cases selon les indices de lignes et colonnes…',
};

export default function NonogramBoardPage(): JSX.Element {
  const [difficulty, setDifficulty] = useState<Difficulty>('facile');
  const { puzzle, index, levelCount, goPrev, goNext } = useTrainingLevel<NonogramPuzzle>('nonogram', difficulty);

  const [board, setBoard] = useState<Board>([]);
  const [forPuzzle, setForPuzzle] = useState<NonogramPuzzle | null>(null);
  if (puzzle && puzzle !== forPuzzle) {
    setForPuzzle(puzzle);
    setBoard(emptyBoard(puzzle.size));
  }

  const result = useMemo(
    () => (puzzle ? nonogramClient.validate(puzzle, board) : { status: 'incomplete' as const, violations: [] }),
    [puzzle, board],
  );
  useTrainingClear('nonogram', difficulty, index, result.status === 'valid');

  const violations = useMemo(() => {
    const set = new Set<string>();
    for (const v of result.violations) for (const c of v.cells) set.add(cellKey(c.r, c.c));
    return set;
  }, [result]);

  const onCellClick = (r: number, c: number): void => {
    setBoard((prev) => {
      const next = prev.map((row) => row.slice());
      next[r][c] = nextCell(next[r][c]);
      return next;
    });
  };

  return (
    <TrainingShell
      difficulty={difficulty}
      onDifficulty={setDifficulty}
      onRestart={() => puzzle && setBoard(emptyBoard(puzzle.size))}
      status={result.status}
      statusText={STATUS_TEXT[result.status]}
      levelIndex={index}
      levelCount={levelCount}
      onPrev={goPrev}
      onNext={goNext}
      tutorial={
        <>
          <li>Les nombres indiquent les blocs de cases pleines consécutives d’une ligne / colonne.</li>
          <li>Plusieurs nombres = plusieurs blocs, séparés par au moins une case vide, dans l’ordre.</li>
          <li>Clique pour alterner vide → pleine → croix (case sûrement vide) → vide.</li>
          <li>Le « 0 » signale une ligne ou colonne entièrement vide.</li>
        </>
      }
    >
      {puzzle ? (
        <NonogramBoard puzzle={puzzle} board={board} violations={violations} onCellClick={onCellClick} />
      ) : (
        <p className="text-sm text-muted">Chargement du niveau…</p>
      )}
    </TrainingShell>
  );
}
