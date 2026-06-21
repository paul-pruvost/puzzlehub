import { useMemo, useState } from 'react';
import { type Difficulty } from '@puzzlehub/shared';
import { patchesClient, type PatchesBoard as Board, type PatchesPuzzle } from '@puzzlehub/engine';
import { TrainingShell } from '../TrainingShell';
import { useTrainingLevel } from '../useTrainingLevel';
import { useTrainingClear } from '../useTrainingClear';
import { buildClueMap, cellKey, initialOwner } from './cells';
import { PatchesBoard } from './PatchesBoard';

const STATUS_TEXT: Record<string, string> = {
  valid: 'Résolu, bravo !',
  invalid: 'Un rectangle est incorrect (cases en rouge).',
  incomplete: 'Assigne chaque case à un rectangle…',
};

export default function PatchesBoardPage(): JSX.Element {
  const [difficulty, setDifficulty] = useState<Difficulty>('facile');
  const { puzzle, index, levelCount, goPrev, goNext } = useTrainingLevel<PatchesPuzzle>('patches', difficulty);

  const clues = useMemo(() => (puzzle ? buildClueMap(puzzle) : new Map()), [puzzle]);
  const [owner, setOwner] = useState<Board>([]);
  const [active, setActive] = useState<number | null>(0);
  const [forPuzzle, setForPuzzle] = useState<PatchesPuzzle | null>(null);
  if (puzzle && puzzle !== forPuzzle) {
    setForPuzzle(puzzle);
    setOwner(initialOwner(puzzle));
    setActive(0);
  }

  const result = useMemo(
    () => (puzzle ? patchesClient.validate(puzzle, owner) : { status: 'incomplete' as const, violations: [] }),
    [puzzle, owner],
  );
  useTrainingClear('patches', difficulty, index, result.status === 'valid');

  const violations = useMemo(() => {
    const set = new Set<string>();
    for (const v of result.violations) for (const c of v.cells) set.add(cellKey(c.r, c.c));
    return set;
  }, [result]);

  const onCellClick = (r: number, c: number): void => {
    const clue = clues.get(cellKey(r, c));
    if (clue) {
      setActive(clue.index);
      return;
    }
    if (active === null) return;
    setOwner((prev) => {
      const next = prev.map((row) => row.slice());
      next[r][c] = next[r][c] === active ? null : active;
      return next;
    });
  };

  return (
    <TrainingShell
      difficulty={difficulty}
      onDifficulty={setDifficulty}
      onRestart={() => puzzle && setOwner(initialOwner(puzzle))}
      status={result.status}
      statusText={STATUS_TEXT[result.status]}
      levelIndex={index}
      levelCount={levelCount}
      onPrev={goPrev}
      onNext={goNext}
      tutorial={
        <>
          <li>Découpe la grille en rectangles : un seul nombre par rectangle.</li>
          <li>Le nombre indique l’aire (le nombre de cases) de son rectangle.</li>
          <li>Clique un nombre pour le sélectionner, puis clique les cases à lui rattacher.</li>
          <li>Toutes les cases doivent appartenir à un rectangle, sans chevauchement.</li>
        </>
      }
    >
      {puzzle ? (
        <PatchesBoard
          puzzle={puzzle}
          owner={owner}
          active={active}
          violations={violations}
          onCellClick={onCellClick}
        />
      ) : (
        <p className="text-sm text-muted">Chargement du niveau…</p>
      )}
    </TrainingShell>
  );
}
