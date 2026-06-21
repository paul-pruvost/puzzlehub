import { Suspense, lazy, useMemo } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { findGame } from '../games/registry';

export function RankedGamePage(): JSX.Element {
  const { game = '' } = useParams();
  const meta = findGame(game);
  const Ranked = useMemo(() => (meta?.loadRanked ? lazy(meta.loadRanked) : null), [meta]);

  // H2 : jeu inconnu ou sans mode classé → retour à la sélection.
  if (!meta || !Ranked) {
    return <Navigate to="/classe" replace />;
  }

  return (
    <section className="space-y-4">
      <Link
        to="/classe"
        className="inline-flex items-center gap-1 text-sm font-medium text-muted transition-colors hover:text-text"
      >
        <span aria-hidden>←</span> Mode classé
      </Link>
      <Suspense fallback={<p className="text-sm text-muted">Chargement du plateau classé…</p>}>
        <Ranked />
      </Suspense>
    </section>
  );
}
