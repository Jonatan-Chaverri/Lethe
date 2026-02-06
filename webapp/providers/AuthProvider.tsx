"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { RegisterWalletPayload, BackendUser } from "@/lib/api/auth";
import { authService } from "@/services/authService";

interface AuthContextValue {
  user: BackendUser | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  authError: string | null;
  refreshUser: () => Promise<BackendUser | null>;
  registerWalletSession: (payload: RegisterWalletPayload) => Promise<BackendUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<BackendUser | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const refreshUser = useCallback(async () => {
    setAuthError(null);
    try {
      const currentUser = await authService.getMeWithAutoRefresh();
      setUser(currentUser);
      return currentUser;
    } catch (error) {
      setUser(null);
      setAuthError(error instanceof Error ? error.message : "Authentication request failed");
      return null;
    }
  }, []);

  const registerWalletSession = useCallback(async (payload: RegisterWalletPayload) => {
    setAuthError(null);
    const session = await authService.registerWallet(payload);
    setUser(session.user);
    return session.user;
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
    setAuthError(null);
  }, []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const bootUser = await authService.bootstrapSession();
        if (!mounted) return;
        setUser(bootUser);
      } catch (error) {
        if (!mounted) return;
        setAuthError(error instanceof Error ? error.message : "Session bootstrap failed");
        setUser(null);
      } finally {
        if (mounted) {
          setIsBootstrapping(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isBootstrapping,
      authError,
      refreshUser,
      registerWalletSession,
      logout,
    }),
    [user, isBootstrapping, authError, refreshUser, registerWalletSession, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthSession() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuthSession must be used inside <AuthProvider>");
  }
  return ctx;
}

