import { Link } from 'react-router-dom';
import { buttonClasses } from '@puzzlehub/ui';

export function NotFoundPage(): JSX.Element {
  return (
    <section className="flex flex-col items-center py-16 text-center">
      <p className="font-display text-7xl font-bold text-accent">404</p>
      <h1 className="mt-4 font-display text-2xl font-bold text-text">Page introuvable</h1>
      <p className="mt-1 text-muted">La page demandée n’existe pas (ou plus).</p>
      <Link to="/" className={buttonClasses('primary', 'md', 'mt-6')}>
        Retour à l’accueil
      </Link>
    </section>
  );
}
