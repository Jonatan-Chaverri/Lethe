"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useWalletLogin } from "@/hooks/useWalletLogin";
import { useUserPosition } from "@/hooks/useUserPosition";
import { useWBTC } from "@/hooks/useWBTC";
import { getPurchasableUnits } from "@/lib/api/userPositions";
import {
  generateDepositProof,
  generateWithdrawProof,
  WBTC_UNITS_PER_BTC,
  type CircuitProofResult,
} from "@/lib/noir/proofService";

export const MIN_DEPOSIT_BTC = 0.001;
export const MIN_WITHDRAW_BTC = 0.001;

function btcToUnits(btcStr: string): number {
  const n = parseFloat(btcStr);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * WBTC_UNITS_PER_BTC);
}

export function useDashboard() {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);

  const { user, isAuthenticated, isBootstrapping } = useAuth();
  const { address, disconnectWallet } = useWalletLogin();
  const {
    currentBalanceDisplay,
    totalYieldDisplay,
    isLoading: isLoadingPosition,
    error: positionError,
  } = useUserPosition(isAuthenticated);
  const {
    balanceDisplay: wbtcBalanceDisplay,
    isLoadingBalance: isLoadingWBTC,
    balanceError: wbtcBalanceError,
    refetchBalance: refetchWBTCBalance,
    mint: mintTestnetWBTC,
    isMinting,
    mintError: wbtcMintError,
  } = useWBTC(isAuthenticated);

  const [menuOpen, setMenuOpen] = useState(false);
  const [depositProof, setDepositProof] = useState<CircuitProofResult | null>(null);
  const [withdrawProof, setWithdrawProof] = useState<CircuitProofResult | null>(null);
  const [proofError, setProofError] = useState<string | null>(null);
  const [activeProof, setActiveProof] = useState<"deposit" | "withdraw" | null>(null);
  const [depositAmountOpen, setDepositAmountOpen] = useState(false);
  const [depositAmountInput, setDepositAmountInput] = useState("");
  const [depositAmountError, setDepositAmountError] = useState<string | null>(null);

  const walletAddress = address ?? user?.wallet ?? null;

  const currentPositionValue = useMemo(
    () => (isLoadingPosition ? "…" : `${currentBalanceDisplay} BTC`),
    [isLoadingPosition, currentBalanceDisplay]
  );
  const allTimeYieldValue = useMemo(
    () => (isLoadingPosition ? "…" : `${totalYieldDisplay} BTC`),
    [isLoadingPosition, totalYieldDisplay]
  );

  useEffect(() => {
    if (!isBootstrapping && !isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, isBootstrapping, router]);

  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  const handleOpenDepositAmount = () => {
    setDepositAmountError(null);
    setDepositAmountInput("");
    setDepositAmountOpen(true);
  };

  const handleCloseDepositAmount = () => {
    setDepositAmountOpen(false);
    setDepositAmountError(null);
  };

  const handleConfirmDepositAmount = async () => {
    setDepositAmountError(null);
    const trimmed = depositAmountInput.trim();
    if (!trimmed) {
      setDepositAmountError("Enter an amount in BTC");
      return;
    }
    const amountBtc = parseFloat(trimmed);
    if (!Number.isFinite(amountBtc) || amountBtc < MIN_DEPOSIT_BTC) {
      setDepositAmountError(`Minimum deposit is ${MIN_DEPOSIT_BTC.toFixed(3)} BTC`);
      return;
    }
    const amountUnits = btcToUnits(trimmed);
    if (amountUnits <= 0) {
      setDepositAmountError("Amount is too small");
      return;
    }
    setDepositAmountOpen(false);
    setProofError(null);
    setActiveProof("deposit");
    try {
      const purchasableUnits = await getPurchasableUnits(amountUnits);
      const result = await generateDepositProof(Number(purchasableUnits));
      setDepositProof(result);
    } catch (error) {
      setProofError(error instanceof Error ? error.message : "Failed to generate deposit proof");
    } finally {
      setActiveProof(null);
    }
  };

  const handleGenerateWithdrawProof = async () => {
    setProofError(null);
    setActiveProof("withdraw");
    try {
      const result = await generateWithdrawProof();
      setWithdrawProof(result);
    } catch (error) {
      setProofError(error instanceof Error ? error.message : "Failed to generate withdraw proof");
    } finally {
      setActiveProof(null);
    }
  };

  return {
    user,
    isAuthenticated,
    isBootstrapping,
    address,
    disconnectWallet,
    router,
    walletAddress,
    currentBalanceDisplay,
    totalYieldDisplay,
    isLoadingPosition,
    positionError,
    wbtcBalanceDisplay,
    isLoadingWBTC,
    refetchWBTCBalance,
    mintTestnetWBTC,
    isMinting,
    wbtcBalanceError,
    wbtcMintError,
    menuOpen,
    setMenuOpen,
    menuRef,
    depositProof,
    withdrawProof,
    proofError,
    activeProof,
    depositAmountOpen,
    depositAmountInput,
    setDepositAmountInput,
    depositAmountError,
    currentPositionValue,
    allTimeYieldValue,
    handleOpenDepositAmount,
    handleCloseDepositAmount,
    handleConfirmDepositAmount,
    handleGenerateWithdrawProof,
  };
}
