import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authApi } from '@/api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  const checkUserAuth = useCallback(async () => {
    setIsLoadingAuth(true);
    try {
      let result;
      try {
        result = await authApi.me();
      } catch (error) {
        if (error.status !== 401) throw error;
        await authApi.refresh();
        result = await authApi.me();
      }
      setUser(result.user);
      return result.user;
    } catch {
      setUser(null);
      return null;
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  }, []);

  useEffect(() => { checkUserAuth(); }, [checkUserAuth]);

  const login = useCallback(async (email, password) => {
    const result = await authApi.login({ email, password });
    setUser(result.user);
    setAuthChecked(true);
    return result.user;
  }, []);

  const logout = useCallback(async () => {
    try { await authApi.logout(); } finally { setUser(null); }
  }, []);

  const value = {
    user,
    isAuthenticated: Boolean(user),
    isLoadingAuth,
    isLoadingPublicSettings: false,
    authError: null,
    authChecked,
    login,
    logout,
    checkUserAuth,
    navigateToLogin: () => { window.location.assign('/login'); },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
