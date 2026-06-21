import type { PatchesBoard as Board, PatchesPuzzle } from '@puzzlehub/engine';
import { cn, gameColorVar } from '@puzzlehub/ui';
import { buildClueMap, cellKey, ownerSides, type ClueInfo } from './cells';

export interface PatchesBoardProps {
  puzzle: PatchesPuzzle;
  owner: Board;
  active: number | null;
  violations: Set<string>;
  onCellClick: (r: number, c: number) => void;
}

export function PatchesBoard({
  puzzle,
  owner,
  active,
  violations,
  onCellClick,
}: PatchesBoardProps): JSX.Element {
  const n = puzzle.size;
  const clues = buildClueMap(puzzle);
  const strong = 'var(--color-text)';
  const weak = 'color-mix(in srgb, var(--color-text) 14%, transparent)';

  return (
    <div className="inline-block rounded-card border border-border bg-surface-2 p-2 shadow-2">
      <div
        className="inline-grid overflow-hidden rounded-md shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-text)_12%,transparent)]"
        style={{ gridTemplateColumns: `repeat(${n}, 40px)` }}
      >
        {owner.map((row, r) =>
          row.map((ownerIdx, c) => {
            const clue: ClueInfo | undefined = clues.get(cellKey(r, c));
            const sides = ownerSides(owner, r, c, n);
            const bad = violations.has(cellKey(r, c));
            const inActive = active !== null && ownerIdx === active;
            const isActiveClue = clue !== undefined && active === clue.index;
            const assignable = !clue;
            return (
              <button
                key={cellKey(r, c)}
                type="button"
                onClick={() => onCellClick(r, c)}
                aria-label={
                  clue
                    ? `Indice ${clue.value} en ${r + 1},${c + 1}${active === clue.index ? ' (actif)' : ''}`
                    : `Case ${r + 1},${c + 1}${ownerIdx === null ? ' libre' : ` rectangle ${ownerIdx + 1}`}${bad ? ', en conflit' : ''}`
                }
                aria-invalid={bad || undefined}
                aria-pressed={clue ? active === clue.index : undefined}
                className={cn(
                  'relative flex h-10 w-10 items-center justify-center outline-none transition-[filter,box-shadow] duration-150',
                  inActive &&
                    'brightness-[0.95] shadow-[inset_0_0_0_2px_color-mix(in_srgb,var(--game-fg)_18%,transparent)]',
                  assignable &&
                    'hover:brightness-[0.97] active:brightness-[0.93] focus-visible:z-10 focus-visible:brightness-[0.97]',
                  isActiveClue && !bad && 'z-10 ring-2 ring-inset ring-accent',
                  bad && 'z-10 ring-2 ring-inset ring-danger',
                )}
                style={{
                  backgroundColor:
                    ownerIdx !== null ? gameColorVar(ownerIdx) : 'var(--color-surface)',
                  color: ownerIdx !== null ? 'var(--game-fg)' : 'var(--color-text)',
                  borderStyle: 'solid',
                  borderTopWidth: sides.top ? 2.5 : 1,
                  borderRightWidth: sides.right ? 2.5 : 1,
                  borderBottomWidth: sides.bottom ? 2.5 : 1,
                  borderLeftWidth: sides.left ? 2.5 : 1,
                  borderTopColor: sides.top ? strong : weak,
                  borderRightColor: sides.right ? strong : weak,
                  borderBottomColor: sides.bottom ? strong : weak,
                  borderLeftColor: sides.left ? strong : weak,
                }}
              >
                {clue ? (
                  <span
                    className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-pill text-sm font-bold tabular-nums shadow-1 ring-1 ring-inset transition-all',
                      isActiveClue
                        ? 'scale-105 bg-gradient-accent text-accent-fg ring-white/30 shadow-2'
                        : 'bg-surface text-text ring-border',
                    )}
                    style={
                      isActiveClue
                        ? undefined
                        : { boxShadow: 'var(--shadow-1), inset 0 1px 1px rgba(255,255,255,0.4)' }
                    }
                  >
                    {clue.value}
                  </span>
                ) : null}
              </button>
            );
          }),
        )}
      </div>
    </div>
  );
}
