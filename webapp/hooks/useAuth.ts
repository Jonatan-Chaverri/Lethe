"use client";

import { useMemo } from "react";

/**
 * Mock auth state. Future-ready for real auth (e.g. session, JWT, or wallet-gated access).
 * For now: "authenticated" is derived from wallet connection only.
 */
export function useAuth(isWalletConnected: boolean) {
  return useMemo(
    () => ({
      isAuthenticated: isWalletConnected,
      // Placeholder for future: user id, session expiry, etc.
    }),
    [isWalletConnected]
  );
}
