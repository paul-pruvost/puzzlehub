import { useMemo, useState } from 'react';
import type { Coord } from '@puzzlehub/shared';
import { type Difficulty } from '@puzzlehub/shared';
import { zipClient, type ZipPuzzle } from '@puzzlehub/engine';
import { TrainingShell } from '../TrainingShell';
import { useTrainingLevel } from '../useTrainingLevel';
import { useTrainingClear } from '../useTrainingClear';
import { cellKey, nextPath } from './cells';
import { ZipBoard } from './ZipBoard';

const STATUS_TEXT: Record<string, string> = {
  valid: 'Résolu, bravo !',
  invalid: 'Chemin invalide (cases en rouge).',
  incomplete: 'Relie les repères dans l’ordre en remplissant toutes les cases…',
};

export default function ZipBoardPage(): JSX.Element {
  const [difficulty, setDifficulty] = useState<Difficulty>('facile');
  const { puzzle, index, levelCount, goPrev, goNext } = useTrainingLevel<ZipPuzzle>('zip', difficulty);

  const [path, setPath] = useState<Coord[]>([]);
  const [forPuzzle, setForPuzzle] = useState<ZipPuzzle | null>(null);
  if (puzzle && puzzle !== forPuzzle) {
    setForPuzzle(puzzle);
    setPath([]);
  }

  const result = useMemo(
    () => (puzzle ? zipClient.validate(puzzle, path) : { status: 'incomplete' as const, violations: [] }),
    [puzzle, path],
  );
  useTrainingClear('zip', difficulty, index, result.status === 'valid');

  const violations = useMemo(() => {
    const set = new Set<string>();
    for (const v of result.violations) for (const c of v.cells) set.add(cellKey(c.r, c.c));
    return set;
  }, [result]);

  const onCellClick = (r: number, c: number): void => {
    if (!puzzle) return;
    setPath((prev) => nextPath(prev, r, c, puzzle));
  };

  return (
    <TrainingShell
      difficulty={difficulty}
      onDifficulty={setDifficulty}
      onRestart={() => setPath([])}
      status={result.status}
      statusText={STATUS_TEXT[result.status]}
      levelIndex={index}
      levelCount={levelCount}
      onPrev={goPrev}
      onNext={goNext}
      tutorial={
        <>
          <li>Pars de la case « 1 », puis clique des cases voisines pour tracer un chemin.</li>
          <li>Passe par les repères dans l’ordre croissant (1, 2, 3, …).</li>
          <li>Le chemin doit remplir toutes les cases, sans repasser deux fois.</li>
          <li>Clique la dernière case (ou une case du tracé) pour revenir en arrière.</li>
        </>
      }
    >
      {puzzle ? (
        <ZipBoard puzzle={puzzle} path={path} violations={violations} onCellClick={onCellClick} />
      ) : (
        <p className="text-sm text-muted">Chargement du niveau…</p>
      )}
    </TrainingShell>
  );
}
