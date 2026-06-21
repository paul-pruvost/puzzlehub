import type { ReactNode } from 'react';
import { cn } from '../cn';

export interface HeroProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  tagline?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/** Bandeau d'accueil — halo dégradé + titre display, sur surface en couches. */
export function Hero({ eyebrow, title, tagline, actions, className }: HeroProps): JSX.Element {
  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-card border border-border bg-surface px-6 py-12 shadow-1 sm:px-10 sm:py-16',
        className,
      )}
    >
      {/* Halos dégradés décoratifs (signature, pas de wash plat). */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gradient-accent opacity-20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-28 -left-16 h-64 w-64 rounded-full bg-celebrate opacity-10 blur-3xl"
      />
      <div className="relative max-w-2xl">
        {eyebrow && (
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-accent">{eyebrow}</p>
        )}
        <h1 className="font-display text-4xl font-bold leading-[1.05] text-text sm:text-5xl">{title}</h1>
        {tagline && <p className="mt-4 max-w-xl text-lg text-muted">{tagline}</p>}
        {actions && <div className="mt-7 flex flex-wrap items-center gap-3">{actions}</div>}
      </div>
    </section>
  );
}
