import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getMe, getProgress, logout as apiLogout, type Me, type Progress } from '../api/client';

interface AuthCtx {
  user: Me | null;
  progress: Progress | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [user, setUser] = useState<Me | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async (): Promise<void> => {
    const me = await getMe();
    setUser(me);
    setProgress(me ? await getProgress() : null);
    setLoading(false);
  };

  useEffect(() => {
    void refresh();
  }, []);

  const logout = async (): Promise<void> => {
    await apiLogout();
    await refresh();
  };

  return (
    <Ctx.Provider value={{ user, progress, loading, refresh, logout }}>{children}</Ctx.Provider>
  );
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth doit être utilisé dans un AuthProvider');
  return ctx;
}
