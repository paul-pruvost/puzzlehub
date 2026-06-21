import { NavLink, Link, Outlet } from 'react-router-dom';
import { cn } from '@puzzlehub/ui';
import { ThemeToggle } from './ThemeToggle';
import { AuthControls } from './AuthControls';
import { XpBar } from './XpBar';
import { XpToast } from './XpToast';

const navLinkClass = ({ isActive }: { isActive: boolean }): string =>
  cn(
    'rounded-pill px-3 py-1.5 text-sm font-medium transition-colors',
    isActive ? 'bg-surface-2 text-text' : 'text-muted hover:bg-surface-2 hover:text-text',
  );

export function Layout(): JSX.Element {
  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-[color-mix(in_srgb,var(--color-surface)_82%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-1.5 sm:gap-3">
            <Link
              to="/"
              className="mr-1 font-display text-xl font-bold tracking-tight text-text"
              aria-label="puzzlehub — accueil"
            >
              puzzle
              <span className="bg-gradient-accent bg-clip-text text-transparent">hub</span>
            </Link>
            <nav className="flex items-center gap-0.5">
              <NavLink to="/classe" className={navLinkClass}>
                Classé
              </NavLink>
              <NavLink to="/defi" className={navLinkClass}>
                Défi
              </NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <XpBar />
            <AuthControls />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:py-10">
        <Outlet />
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-5xl px-4 py-6 text-sm text-muted">
          <span className="font-display font-semibold text-text">puzzlehub</span> — casse-têtes de
          logique, rejouables à l’infini.
        </div>
      </footer>

      <XpToast />
    </div>
  );
}
