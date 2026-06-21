import { useEffect, useRef, useState } from 'react';
import { cn } from '../cn';

export interface TimerProps {
  /** Le chrono court tant que `true` ; se fige sinon (cumule le temps écoulé). */
  running: boolean;
  /** Temps figé à afficher (ex. `timeMs` serveur sur victoire) — prioritaire. */
  frozenMs?: number | null;
  className?: string;
}

function fmt(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const mm = String(Math.floor(total / 60)).padStart(2, '0');
  const ss = String(total % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

/**
 * Chrono live, purement présentationnel (jamais envoyé au serveur — l'autorité
 * de temps reste `/play/*`). Remontez-le via une `key` pour le remettre à zéro.
 */
export function Timer({ running, frozenMs, className }: TimerProps): JSX.Element {
  const [elapsed, setElapsed] = useState(0);
  const accRef = useRef(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;
    startRef.current = Date.now();
    const id = setInterval(() => {
      setElapsed(accRef.current + (Date.now() - (startRef.current ?? Date.now())));
    }, 200);
    return () => {
      clearInterval(id);
      if (startRef.current !== null) {
        accRef.current += Date.now() - startRef.current;
        startRef.current = null;
      }
    };
  }, [running]);

  const ms = frozenMs ?? elapsed;
  return (
    <span className={cn('font-mono tabular-nums', className)} aria-hidden>
      {fmt(ms)}
    </span>
  );
}
