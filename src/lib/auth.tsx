import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

type AuthUser = { username: string } | null;

type AuthContextValue = {
  user: AuthUser;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('exo-auth');
      if (raw) setUser(JSON.parse(raw));
    } catch {}
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const expectedUser = (import.meta as any).env.VITE_ADMIN_USER || 'admin';
    const expectedPass = (import.meta as any).env.VITE_ADMIN_PASS || 'admin';
    const ok = username === expectedUser && password === expectedPass;
    if (ok) {
      const u = { username };
      setUser(u);
      try { localStorage.setItem('exo-auth', JSON.stringify(u)); } catch {}
    }
    return ok;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    try { localStorage.removeItem('exo-auth'); } catch {}
  }, []);

  const value = useMemo(() => ({ user, login, logout }), [user, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}


