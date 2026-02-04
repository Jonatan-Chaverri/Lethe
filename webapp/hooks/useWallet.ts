"use client";

import { useCallback, useState } from "react";

export type WalletType = "argentx" | "braavos" | null;

export interface WalletState {
  isConnected: boolean;
  walletType: WalletType;
  address: string | null;
}

const FAKE_ADDRESS = "0x07a5b7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f";

/**
 * Mock wallet hook for Argent X / Braavos.
 * No real wallet calls; ready to swap for starknet.js or similar.
 */
export function useWallet(): WalletState & {
  connectWallet: (type: "argentx" | "braavos") => void;
  disconnectWallet: () => void;
} {
  const [state, setState] = useState<WalletState>({
    isConnected: false,
    walletType: null,
    address: null,
  });

  const connectWallet = useCallback((walletType: "argentx" | "braavos") => {
    setState({
      isConnected: true,
      walletType,
      address: FAKE_ADDRESS,
    });
  }, []);

  const disconnectWallet = useCallback(() => {
    setState({
      isConnected: false,
      walletType: null,
      address: null,
    });
  }, []);

  return {
    ...state,
    connectWallet,
    disconnectWallet,
  };
}
