import type { QueensPuzzle } from '@puzzlehub/engine';
import { cn, gameColorVar } from '@puzzlehub/ui';
import { cellKey, regionSides, type CellState } from './cells';

function Crown(): JSX.Element {
  return (
    <span className="relative flex items-center justify-center motion-safe:animate-pop-in" aria-hidden>
      {/* Halo doux sous la couronne (lueur de victoire chaude). */}
      <span
        className="pointer-events-none absolute inset-0 m-auto h-7 w-7 rounded-full blur-[5px]"
        style={{ background: 'color-mix(in srgb, var(--color-celebrate) 55%, transparent)' }}
      />
      <svg
        viewBox="0 0 24 24"
        className="relative h-[22px] w-[22px] drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.32)]"
        fill="currentColor"
      >
        <path d="M2 7l5 4 5-7 5 7 5-4-2.5 12h-15L2 7z" />
        <rect x="4.5" y="19" width="15" height="2.4" rx="1.2" />
        <circle cx="2" cy="7" r="1.6" />
        <circle cx="22" cy="7" r="1.6" />
        <circle cx="12" cy="4" r="1.7" />
      </svg>
    </span>
  );
}

function content(state: CellState): JSX.Element | null {
  if (state === 'queen') return <Crown />;
  if (state === 'mark')
    return (
      <svg
        viewBox="0 0 24 24"
        className="h-3.5 w-3.5 opacity-50 motion-safe:animate-cell-fill"
        aria-hidden
      >
        <path
          d="M6 6l12 12M18 6L6 18"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    );
  return null;
}

function label(state: CellState): string {
  return state === 'queen' ? 'reine' : state === 'mark' ? 'exclue' : 'vide';
}

export interface QueensBoardProps {
  puzzle: QueensPuzzle;
  grid: CellState[][];
  violations: Set<string>;
  onCycle: (r: number, c: number) => void;
}

export function QueensBoard({ puzzle, grid, violations, onCycle }: QueensBoardProps): JSX.Element {
  const n = puzzle.size;
  const strong = 'var(--color-text)';
  const weak = 'color-mix(in srgb, var(--color-text) 14%, transparent)';
  return (
    <div className="inline-block rounded-card border border-border bg-surface-2 p-2 shadow-2">
      <div
        className="inline-grid overflow-hidden rounded-md shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-text)_12%,transparent)]"
        style={{ gridTemplateColumns: `repeat(${n}, 44px)` }}
      >
        {grid.map((row, r) =>
          row.map((state, c) => {
            const sides = regionSides(puzzle, r, c);
            const bad = violations.has(cellKey(r, c));
            const region = puzzle.regions[r][c];
            return (
              <button
                key={cellKey(r, c)}
                type="button"
                onClick={() => onCycle(r, c)}
                aria-label={`Case ${r + 1},${c + 1}, région ${region + 1} : ${label(state)}${bad ? ', en conflit' : ''}`}
                aria-invalid={bad || undefined}
                className={cn(
                  'group relative flex h-11 w-11 items-center justify-center outline-none transition-[filter,box-shadow] duration-150',
                  'hover:brightness-[0.96] active:brightness-[0.92] focus-visible:z-10 focus-visible:brightness-[0.96]',
                  state === 'queen' &&
                    'shadow-[inset_0_0_0_2px_color-mix(in_srgb,var(--game-fg)_22%,transparent)]',
                  bad && 'z-10 ring-2 ring-inset ring-danger',
                )}
                style={{
                  backgroundColor: gameColorVar(region),
                  color: 'var(--game-fg)',
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
                <span
                  className="pointer-events-none absolute left-1 top-0.5 text-[10px] font-semibold leading-none opacity-45 mix-blend-multiply dark:mix-blend-screen"
                  aria-hidden
                >
                  {region + 1}
                </span>
                {content(state)}
              </button>
            );
          }),
        )}
      </div>
    </div>
  );
}
