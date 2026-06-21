import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DIFFICULTIES, type Difficulty } from '@puzzlehub/shared';
import { Badge, Button, Card, IconGlyph, Panel, buttonClasses, gameColorVar } from '@puzzlehub/ui';

import { loginUrl } from '../api/client';
import { useAuth } from '../app/AuthProvider';
import { GAMES } from '../games/registry';

export function RankedHomePage(): JSX.Element {
  const { user } = useAuth();
  const [difficulty, setDifficulty] = useState<Difficulty>('facile');
  const games = GAMES.filter((g) => g.available && g.loadRanked);

  if (!user) {
    return (
      <Panel className="space-y-3 p-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-text">Mode classé</h1>
        <p className="text-muted">
          Connecte-toi pour jouer des grilles classées (servies et validées par le serveur).
        </p>
        <a href={loginUrl()} className={buttonClasses('primary')}>
          Connexion Google
        </a>
      </Panel>
    );
  }

  return (
    <section className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight text-text">Mode classé</h1>
        <p className="mt-1 text-muted">
          Grille servie et validée par le serveur (anti-triche). XP créditée à la résolution.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-sm font-medium text-muted">Difficulté</span>
        {DIFFICULTIES.map((d) => (
          <Button
            key={d}
            variant={d === difficulty ? 'primary' : 'secondary'}
            size="sm"
            className="capitalize"
            onClick={() => setDifficulty(d)}
            aria-pressed={d === difficulty}
          >
            {d}
          </Button>
        ))}
      </div>

      <ul className="grid gap-4 sm:grid-cols-2">
        {games.map((g) => (
          <li key={g.id}>
            <Link
              to={`/classe/${g.id}?d=${difficulty}`}
              className="block h-full rounded-card focus-visible:outline-none"
              aria-label={`Jouer ${g.name} en classé (${difficulty})`}
            >
              <Card interactive className="flex h-full items-center gap-4 p-5">
                <span
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md text-game-fg shadow-1"
                  style={{ backgroundColor: gameColorVar(g.accentIndex) }}
                >
                  <IconGlyph game={g.id} size={26} />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-lg font-semibold text-text">{g.name}</h2>
                  <p className="mt-0.5 text-sm text-muted">{g.tagline}</p>
                </div>
                <Badge tone="accent" className="capitalize">
                  {difficulty}
                </Badge>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
