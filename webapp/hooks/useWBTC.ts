"use client";

import { useCallback, useEffect, useState } from "react";
import { authService } from "@/services/authService";
import { getWBTCBalance, mintTestnetWBTC } from "@/lib/api/onchain";

const WBTC_DECIMALS = 100_000_000;

function weiToWbtcDisplay(wei: string): string {
  const n = Number(wei);
  if (!Number.isFinite(n) || n === 0) return "0.00000000";
  return (n / WBTC_DECIMALS).toFixed(8);
}

export interface UseWBTCResult {
  /** Human-readable WBTC balance (e.g. "1.50000000") */
  balanceDisplay: string;
  /** Raw balance in wei/smallest units */
  balanceRaw: string | null;
  /** True while the initial balance fetch or a refetch is in progress */
  isLoadingBalance: boolean;
  /** Error from the last balance fetch */
  balanceError: string | null;
  /** Refetch balance from chain */
  refetchBalance: () => Promise<void>;
  /** Mint testnet WBTC (1 WBTC). Refetches balance on success. */
  mint: () => Promise<void>;
  /** True while mint request is in progress */
  isMinting: boolean;
  /** Error from the last mint attempt */
  mintError: string | null;
}

export function useWBTC(isAuthenticated: boolean): UseWBTCResult {
  const [balanceRaw, setBalanceRaw] = useState<string | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [isMinting, setIsMinting] = useState(false);
  const [mintError, setMintError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    const token = authService.getAccessToken();
    if (!token || !isAuthenticated) {
      setBalanceRaw(null);
      setBalanceError(null);
      return;
    }
    setIsLoadingBalance(true);
    setBalanceError(null);
    try {
      const result = await getWBTCBalance(token);
      setBalanceRaw(result);
    } catch (error) {
      setBalanceError(error instanceof Error ? error.message : "Failed to fetch WBTC balance");
      setBalanceRaw(null);
    } finally {
      setIsLoadingBalance(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setBalanceRaw(null);
      setBalanceError(null);
      return;
    }
    fetchBalance();
  }, [isAuthenticated, fetchBalance]);

  const mint = useCallback(async () => {
    const token = authService.getAccessToken();
    if (!token || !isAuthenticated) return;
    setIsMinting(true);
    setMintError(null);
    try {
      await mintTestnetWBTC(token);
      await fetchBalance();
    } catch (error) {
      setMintError(error instanceof Error ? error.message : "Failed to mint testnet WBTC");
    } finally {
      setIsMinting(false);
    }
  }, [isAuthenticated, fetchBalance]);

  const balanceDisplay = balanceRaw !== null ? weiToWbtcDisplay(balanceRaw) : "0.00000000";

  return {
    balanceDisplay,
    balanceRaw,
    isLoadingBalance,
    balanceError,
    refetchBalance: fetchBalance,
    mint,
    isMinting,
    mintError,
  };
}
