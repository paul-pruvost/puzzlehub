import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';

export interface ResultOverlayProps {
  open: boolean;
  title?: ReactNode;
  /** Temps affiché (ms) — ex. `timeMs` serveur. */
  timeMs?: number | null;
  xpGained?: number | null;
  actions?: ReactNode;
  onClose?: () => void;
}

const CONFETTI = Array.from({ length: 14 }, (_, i) => i);
const CONFETTI_COLORS = [
  'var(--color-accent)',
  'var(--color-accent-2)',
  'var(--color-celebrate)',
  'var(--color-success)',
  'var(--game-2)',
  'var(--game-6)',
];

function fmtTime(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} s`;
  return `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s`;
}

/**
 * Overlay de victoire (RD-D-4) — célébration CSS légère, non bloquante : le
 * plateau résolu reste lisible derrière. Le focus va sur le titre à l'ouverture.
 */
export function ResultOverlay({
  open,
  title = 'Niveau résolu !',
  timeMs,
  xpGained,
  actions,
  onClose,
}: ResultOverlayProps): JSX.Element | null {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (open) headingRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open || !onClose) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="false"
      aria-label="Niveau résolu"
    >
      <button
        type="button"
        aria-label="Fermer"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/45 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-sm animate-pop-in overflow-hidden rounded-card border border-border bg-surface p-7 text-center shadow-3">
        {/* Confetti CSS (décoratif, neutralisé par prefers-reduced-motion). */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-0">
          {CONFETTI.map((i) => (
            <span
              key={i}
              className="absolute block h-2 w-2 rounded-[1px] animate-confetti"
              style={{
                left: `${(i * 7 + 6) % 100}%`,
                backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
                animationDelay: `${(i % 5) * 90}ms`,
                animationDuration: `${900 + (i % 4) * 220}ms`,
              }}
            />
          ))}
        </div>

        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-accent text-2xl text-accent-fg shadow-2">
          ✦
        </div>
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="mt-4 font-display text-2xl font-bold text-text outline-none"
        >
          {title}
        </h2>

        {(timeMs != null || xpGained != null) && (
          <div className="mt-5 flex items-stretch justify-center gap-3">
            {timeMs != null && (
              <div className="flex-1 rounded-md border border-border bg-surface-2 px-3 py-2">
                <div className="text-xs uppercase tracking-wide text-muted">Temps</div>
                <div className="mt-0.5 font-display text-lg font-semibold tabular-nums text-text">
                  {fmtTime(timeMs)}
                </div>
              </div>
            )}
            {xpGained != null && (
              <div className="flex-1 rounded-md border border-border bg-surface-2 px-3 py-2">
                <div className="text-xs uppercase tracking-wide text-muted">Gagné</div>
                <div className="mt-0.5 font-display text-lg font-semibold tabular-nums text-accent">
                  +{xpGained} XP
                </div>
              </div>
            )}
          </div>
        )}

        {actions && <div className="mt-6 flex flex-wrap justify-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
