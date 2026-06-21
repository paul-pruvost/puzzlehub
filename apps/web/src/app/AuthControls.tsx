import { Button, buttonClasses } from '@puzzlehub/ui';
import { loginUrl } from '../api/client';
import { useAuth } from './AuthProvider';

export function AuthControls(): JSX.Element {
  const { user, loading, logout } = useAuth();

  if (loading) return <span className="text-sm text-muted">…</span>;

  if (!user) {
    return (
      <a href={loginUrl()} className={buttonClasses('primary', 'sm')}>
        Connexion Google
      </a>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden max-w-[12ch] truncate text-sm text-muted sm:inline">
        {user.displayName}
      </span>
      <Button variant="secondary" size="sm" onClick={() => void logout()}>
        Déconnexion
      </Button>
    </div>
  );
}
