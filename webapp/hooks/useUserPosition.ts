"use client";

import { useCallback, useEffect, useState } from "react";
import { authService } from "@/services/authService";
import { getUserPosition, type UserPositionResponse } from "@/lib/api/userPositions";

function toBtcDisplay(value: string | number): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "0.0000";
  return n.toFixed(4);
}

export interface UseUserPositionResult {
  /** Human-readable current balance (e.g. "1.5000") */
  currentBalanceDisplay: string;
  /** Human-readable total yield (e.g. "0.0234") */
  totalYieldDisplay: string;
  /** Raw API response when available */
  position: UserPositionResponse | null;
  /** True while the initial fetch or a refetch is in progress */
  isLoading: boolean;
  /** Error from the last fetch */
  error: string | null;
  /** Refetch position from backend */
  refetch: () => Promise<void>;
}

export function useUserPosition(isAuthenticated: boolean): UseUserPositionResult {
  const [position, setPosition] = useState<UserPositionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPosition = useCallback(async () => {
    const token = authService.getAccessToken();
    if (!token || !isAuthenticated) {
      setPosition(null);
      setError(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await getUserPosition(token);
      setPosition(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch position");
      setPosition(null);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setPosition(null);
      setError(null);
      return;
    }
    fetchPosition();
  }, [isAuthenticated, fetchPosition]);

  const currentBalanceDisplay =
    position?.current_balance != null ? toBtcDisplay(position.current_balance) : "0.0000";
  const totalYieldDisplay =
    position?.total_yield != null ? toBtcDisplay(position.total_yield) : "0.0000";

  return {
    currentBalanceDisplay,
    totalYieldDisplay,
    position,
    isLoading,
    error,
    refetch: fetchPosition,
  };
}
