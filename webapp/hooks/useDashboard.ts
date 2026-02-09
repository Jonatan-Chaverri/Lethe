"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useWalletLogin } from "@/hooks/useWalletLogin";
import { useUserPosition } from "@/hooks/useUserPosition";
import { useWBTC } from "@/hooks/useWBTC";
import { useDashboardNotes } from "@/hooks/dashboard/useDashboardNotes";
import {
  MIN_DEPOSIT_BTC,
  MIN_WITHDRAW_BTC,
  useDashboardProofs,
} from "@/hooks/dashboard/useDashboardProofs";

export { MIN_DEPOSIT_BTC, MIN_WITHDRAW_BTC };

export function useDashboard() {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const { user, isAuthenticated, isBootstrapping } = useAuth();
  const { address, wallet, disconnectWallet, connectWalletWithoutSignature } = useWalletLogin();

  const {
    currentBalanceDisplay,
    totalYieldDisplay,
    isLoading: isLoadingPosition,
    error: positionError,
    refetch: refetchUserPosition,
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

  const notes = useDashboardNotes();

  const proofs = useDashboardProofs({
    wallet,
    connectWalletWithoutSignature,
    refetchUserPosition,
    getSelectedWithdrawNote: () => notes.selectedNote,
    onDepositNoteGenerated: (note) => {
      notes.addOrUpdateNote(note);
      void notes.persistUsingCurrentPassword();
    },
    onDepositLeafIndexResolved: (commitment, leafIndex) => {
      notes.applyLeafIndex(commitment, leafIndex);
      void notes.persistUsingCurrentPassword();
    },
    onOpenDownloadModal: () => {
      if (!notes.hasNotesPassword) {
        notes.handleOpenDownloadNote();
      }
    },
    onBeforeDepositStart: notes.clearNotesStatus,
  });

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

  const handleLoadWithdrawNotes = async () => {
    const error = await notes.handleLoadWithdrawNotes();
    proofs.setProofError(error);
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
    currentPositionValue,
    allTimeYieldValue,
    notes: notes.notes,
    notesStatus: notes.notesStatus,
    needsFileRelink: notes.needsFileRelink,
    downloadNoteOpen: notes.downloadNoteOpen,
    downloadPassword: notes.downloadPassword,
    setDownloadPassword: notes.setDownloadPassword,
    downloadPasswordError: notes.downloadPasswordError,
    handleOpenDownloadNote: notes.handleOpenDownloadNote,
    handleCloseDownloadNote: notes.handleCloseDownloadNote,
    handleDownloadEncryptedNotes: notes.handleDownloadEncryptedNotes,
    handleCreateNewNotesFile: notes.handleCreateNewNotesFile,
    handleLinkExistingNotesFile: notes.handleLinkExistingNotesFile,
    setWithdrawPassword: notes.setWithdrawPassword,
    withdrawPassword: notes.withdrawPassword,
    handleSelectNotesFile: notes.handleSelectNotesFile,
    handleLoadWithdrawNotes,
    selectedWithdrawCommitment: notes.selectedWithdrawCommitment,
    setSelectedWithdrawCommitment: notes.setSelectedWithdrawCommitment,
    depositProof: proofs.depositProof,
    withdrawProof: proofs.withdrawProof,
    proofError: proofs.proofError,
    activeProof: proofs.activeProof,
    depositAmountOpen: proofs.depositAmountOpen,
    depositAmountInput: proofs.depositAmountInput,
    setDepositAmountInput: proofs.setDepositAmountInput,
    depositAmountError: proofs.depositAmountError,
    handleOpenDepositAmount: proofs.handleOpenDepositAmount,
    handleCloseDepositAmount: proofs.handleCloseDepositAmount,
    handleConfirmDepositAmount: proofs.handleConfirmDepositAmount,
    handleGenerateWithdrawProof: proofs.handleGenerateWithdrawProof,
    depositModalStatus: proofs.depositModalStatus,
  };
}
