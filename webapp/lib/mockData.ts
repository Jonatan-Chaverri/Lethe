/**
 * Centralized mock data for Lethe.
 * Replace these with real contract calls when integrating Starknet.
 */

export const MOCK_STATS = {
  totalBtcDeposited: 1247.89234123,
  totalBtcYielded: 89.45210987,
  activePositions: 3421,
} as const;

export const MOCK_USER = {
  /** Fake address for UI; replace with real wallet address from connector */
  address: "0x07a5b7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f",
  balanceBtc: 2.45678912,
  yieldAccrued: 0.08923456,
} as const;

/** Simulated delay (ms) for "contract" calls */
export const MOCK_LATENCY_MS = 400;
