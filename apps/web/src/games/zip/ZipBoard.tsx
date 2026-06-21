import { useCallback, useEffect, useRef } from 'react';
import type { Coord } from '@puzzlehub/shared';
import type { ZipPuzzle } from '@puzzlehub/engine';
import { cn } from '@puzzlehub/ui';
import { cellKey } from './cells';

export interface ZipBoardProps {
  puzzle: ZipPuzzle;
  path: Coord[];
  violations: Set<string>;
  onCellClick: (r: number, c: number) => void;
}

export function ZipBoard({ puzzle, path, violations, onCellClick }: ZipBoardProps): JSX.Element {
  const n = puzzle.size;
  const step = new Map<string, number>();
  path.forEach((p, i) => step.set(cellKey(p.r, p.c), i));
  const lastKey = path.length > 0 ? cellKey(path[path.length - 1].r, path[path.length - 1].c) : '';
  let maxNum = 0;
  for (const row of puzzle.numbers) for (const v of row) if (v !== null && v > maxNum) maxNum = v;

  // Tracé au pointeur (UX-D-1) : on maintient le clic et on glisse. Chaque case
  // nouvellement survolée appelle `onCellClick` une seule fois (nextPath gère
  // extension/recul/troncature/mur). Le clic simple reste un fallback.
  const dragging = useRef(false);
  const lastEntered = useRef<string | null>(null);

  const endDrag = useCallback(() => {
    dragging.current = false;
    lastEntered.current = null;
  }, []);

  useEffect(() => {
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);
    return () => {
      window.removeEventListener('pointerup', endDrag);
      window.removeEventListener('pointercancel', endDrag);
    };
  }, [endDrag]);

  const enter = (r: number, c: number): void => {
    const key = cellKey(r, c);
    if (!dragging.current || lastEntered.current === key) return;
    lastEntered.current = key;
    onCellClick(r, c);
  };

  return (
    <div
      className="inline-grid gap-1 rounded-card border border-border bg-surface-2 p-2.5 shadow-2"
      style={{ gridTemplateColumns: `repeat(${n}, 42px)`, touchAction: 'none' }}
    >
      {Array.from({ length: n }, (_, r) =>
        Array.from({ length: n }, (_, c) => {
          const key = cellKey(r, c);
          const num = puzzle.numbers[r][c];
          const onPath = step.has(key);
          const bad = violations.has(key);
          const isLast = key === lastKey;
          const isStart = num === 1;
          const isEnd = num !== null && num === maxNum && maxNum > 1;
          const isWaypoint = num !== null;
          return (
            <button
              key={key}
              type="button"
              onPointerDown={() => {
                dragging.current = true;
                lastEntered.current = key;
                onCellClick(r, c);
              }}
              onPointerEnter={() => enter(r, c)}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault();
                  onCellClick(r, c);
                }
              }}
              aria-label={`Case ${r + 1},${c + 1}${isStart ? ', départ' : isEnd ? ', arrivée' : num !== null ? `, repère ${num}` : ''}${onPath ? `, étape ${(step.get(key) ?? 0) + 1}` : ''}${bad ? ', en conflit' : ''}`}
              aria-invalid={bad || undefined}
              className={cn(
                'relative flex h-[42px] w-[42px] items-center justify-center rounded-md border text-sm font-bold outline-none transition-all duration-150',
                onPath
                  ? 'border-transparent bg-gradient-accent text-accent-fg shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.28),inset_0_-1px_2px_rgba(0,0,0,0.18),0_1px_2px_rgba(40,33,20,0.18)]'
                  : 'border-border bg-surface text-text hover:border-muted hover:bg-surface-3 active:bg-surface-2 focus-visible:border-muted',
                isLast && onPath && 'z-10 ring-2 ring-inset ring-accent-fg shadow-2',
                isLast && !onPath && 'border-text',
                bad && 'z-10 ring-2 ring-inset ring-danger',
              )}
            >
              {isWaypoint ? (
                <span
                  className={cn(
                    'flex h-[26px] w-[26px] items-center justify-center rounded-pill text-[13px] font-bold tabular-nums shadow-1 ring-1 ring-inset transition-colors',
                    onPath ? 'ring-accent-fg' : 'bg-surface-2 text-text ring-border',
                    (isStart || isEnd) &&
                      (onPath
                        ? 'ring-2 ring-accent-fg'
                        : 'bg-surface-2 text-success ring-2 ring-success'),
                  )}
                  style={
                    onPath
                      ? {
                          backgroundColor: 'rgba(255,255,255,0.18)',
                          boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.25)',
                        }
                      : undefined
                  }
                >
                  {num}
                </span>
              ) : onPath ? (
                <span
                  className="h-3 w-3 rounded-pill bg-accent-fg shadow-[0_0_0_3px_rgba(255,255,255,0.18)] motion-safe:animate-cell-fill"
                  aria-hidden
                />
              ) : null}
            </button>
          );
        }),
      )}
    </div>
  );
}
