"use client";

import { useMemo } from "react";
import { MOCK_STATS, MOCK_USER } from "@/lib/mockData";

/**
 * Mock contract data hook.
 * Replace with real Starknet contract reads (e.g. vault total supply, user balance).
 */
export function useMockContracts(hasWallet: boolean) {
  return useMemo(() => {
    return {
      getTotalDepositedBtc: () => MOCK_STATS.totalBtcDeposited,
      getTotalYieldedBtc: () => MOCK_STATS.totalBtcYielded,
      getActivePositions: () => MOCK_STATS.activePositions,
      getUserBalance: () => (hasWallet ? MOCK_USER.balanceBtc : 0),
      getUserYield: () => (hasWallet ? MOCK_USER.yieldAccrued : 0),
    };
  }, [hasWallet]);
}
