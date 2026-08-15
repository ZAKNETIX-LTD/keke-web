import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import { clearAuth, getStoredToken, getStoredUser, storeAuth } from '../api/client';
import { login as loginRequest } from '../api/auth';
import { isAdminRole, type AdminUser } from '../lib/types';

type AuthContextValue = {
  user: AdminUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: AdminUser | null) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(() => {
    const stored = getStoredUser() as AdminUser | null;
    if (stored && isAdminRole(Number(stored.role))) return stored;
    return null;
  });
  const [token, setToken] = useState<string | null>(() => getStoredToken());

  const login = useCallback(async (email: string, password: string) => {
    const next = await loginRequest(email, password);
    setUser(next);
    setToken(getStoredToken());
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setUser(null);
    setToken(null);
  }, []);

  const setUserAndStore = useCallback((next: AdminUser | null) => {
    setUser(next);
    if (next) {
      const token = getStoredToken() || '';
      storeAuth(token, next);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(user && token),
      login,
      logout,
      setUser: setUserAndStore,
    }),
    [user, token, login, logout, setUserAndStore],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
