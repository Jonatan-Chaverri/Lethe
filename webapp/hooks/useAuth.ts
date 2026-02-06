"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { BackendUser } from "@/lib/api/auth";
import { authService } from "@/services/authService";

export function useAuth(isWalletConnected: boolean) {
  const [user, setUser] = useState<BackendUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshMe = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const currentUser = await authService.getMe();
      setUser(currentUser);
    } catch (err) {
      setUser(null);
      setError(err instanceof Error ? err.message : "Failed to fetch user");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshMe();
  }, [refreshMe, isWalletConnected]);

  return useMemo(
    () => ({
      isAuthenticated: Boolean(user),
      user,
      isLoading,
      error,
      refreshMe,
      logout: () => {
        authService.logout();
        setUser(null);
      },
    }),
    [user, isLoading, error, refreshMe]
  );
}
