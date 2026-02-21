"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useWalletLogin } from "@/hooks/useWalletLogin";
import { useUserPosition } from "@/hooks/useUserPosition";
import { useWBTC } from "@/hooks/useWBTC";
import { useDashboardNotes } from "@/hooks/dashboard/useDashboardNotes";
import { getShareUnitPrice } from "@/lib/api/userPositions";
import { fetchChartData, type ChartDataPoint, type ChartRange, type ChartInterval } from "@/lib/api/sharePrice";
import { useDashboardProofs } from "@/hooks/dashboard/useDashboardProofs";

const SATS_PER_BTC = BigInt(100_000_000);

/** Minimum deposit/withdraw in BTC = price of 1 k_unit from getShareUnitPrice. */
function satsToBtc(sats: bigint): number {
  return Number(sats) / Number(SATS_PER_BTC);
}

function toBigIntCandidate(value: unknown): bigint | null {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isFinite(value)) return BigInt(Math.trunc(value));
  if (typeof value === "string" && value.trim().length > 0) {
    try {
      return BigInt(value.trim());
    } catch {
      return null;
    }
  }
  return null;
}

function formatBtcFromSats(value: bigint): string {
  const whole = value / SATS_PER_BTC;
  const fraction = value % SATS_PER_BTC;
  const fractional = fraction.toString().padStart(8, "0").replace(/0+$/, "");
  return fractional ? `${whole.toString()}.${fractional}` : whole.toString();
}

function formatUnits(value: bigint): string {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function getIntervalForRange(range: ChartRange): ChartInterval {
  if (range === "1h") return "1m";
  if (range === "1d") return "1h";
  return "1d";
}

export function useDashboard() {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const notesMenuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notesMenuOpen, setNotesMenuOpen] = useState(false);
  const [shareUnitPriceSats, setShareUnitPriceSats] = useState<bigint | null>(null);
  const [isLoadingSharePrice, setIsLoadingSharePrice] = useState(false);
  const [sharePriceError, setSharePriceError] = useState<string | null>(null);
  const [chartRange, setChartRange] = useState<ChartRange>("1d");
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [isLoadingChart, setIsLoadingChart] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);

  const { user, isAuthenticated, isBootstrapping } = useAuth();
  const { address, wallet, account, disconnectWallet, connectWalletWithoutSignature } = useWalletLogin();

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

  const minDepositBtc = useMemo(
    () => (shareUnitPriceSats === null ? 0.001 : satsToBtc(shareUnitPriceSats)),
    [shareUnitPriceSats]
  );
  const minWithdrawBtc = minDepositBtc;

  const proofs = useDashboardProofs({
    wallet,
    account,
    connectWalletWithoutSignature,
    refetchUserPosition,
    minDepositBtc,
    minWithdrawBtc,
    getWithdrawableNotes: () => notes.withdrawableNotes,
    onDepositNoteGenerated: (note) => {
      notes.addOrUpdateNote(note);
      void notes.persistUsingCurrentPassword();
    },
    onDepositLeafIndexResolved: (commitment, leafIndex) => {
      notes.applyLeafIndex(commitment, leafIndex);
      void notes.persistUsingCurrentPassword();
    },
    onWithdrawNotesTransition: (spentCommitment, changeNote) => {
      notes.applyWithdrawTransition(spentCommitment, changeNote);
    },
    onPersistNotesAfterMutation: notes.persistUsingCurrentPassword,
    onBeforeDepositStart: notes.clearNotesStatus,
    onBeforeWithdrawStart: notes.clearNotesStatus,
  });

  const walletAddress = address ?? user?.wallet ?? null;

  const currentPositionValue = useMemo(
    () => (isLoadingPosition ? "…" : `${currentBalanceDisplay} BTC`),
    [isLoadingPosition, currentBalanceDisplay]
  );
  const allTimeYieldValue = useMemo(
    () => (isLoadingPosition ? "…" : `${Number(totalYieldDisplay)/100000} BTC`),
    [isLoadingPosition, totalYieldDisplay]
  );

  useEffect(() => {
    if (!isBootstrapping && !isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, isBootstrapping, router]);

  useEffect(() => {
    if (!menuOpen && !notesMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
      if (notesMenuRef.current && !notesMenuRef.current.contains(event.target as Node)) {
        setNotesMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setNotesMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen, notesMenuOpen]);

  useEffect(() => {
    if (!isAuthenticated) {
      setShareUnitPriceSats(null);
      setSharePriceError(null);
      return;
    }
    let active = true;
    void (async () => {
      setIsLoadingSharePrice(true);
      setSharePriceError(null);
      try {
        const raw = await getShareUnitPrice();
        const parsed = toBigIntCandidate(
          (raw as any)?.share_unit_price ??
            (raw as any)?.unit_price ??
            (raw as any)?.price ??
            (raw as any)?.current_balance ??
            raw
        );
        if (parsed === null) {
          throw new Error("Invalid share unit price response.");
        }
        if (active) {
          setShareUnitPriceSats(parsed);
        }
      } catch (error) {
        if (active) {
          setSharePriceError(error instanceof Error ? error.message : "Failed to fetch share unit price.");
          setShareUnitPriceSats(null);
        }
      } finally {
        if (active) setIsLoadingSharePrice(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setChartData([]);
      setChartError(null);
      return;
    }
    let active = true;
    const interval = getIntervalForRange(chartRange);

    void (async () => {
      setIsLoadingChart(true);
      setChartError(null);
      try {
        const points = await fetchChartData(interval, chartRange);
        if (!active) return;
        setChartData(points);
      } catch (error) {
        if (!active) return;
        setChartError(error instanceof Error ? error.message : "Failed to fetch chart data.");
        setChartData([]);
      } finally {
        if (active) setIsLoadingChart(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [isAuthenticated, chartRange]);

  const notesPositionBtcDisplay = useMemo(() => {
    if (shareUnitPriceSats === null) return "0";
    const totalUnits = notes.notes.reduce((acc, note) => {
      const units = toBigIntCandidate(note.k_units);
      if (units === null) return acc;
      return acc + units;
    }, BigInt(0));
    const totalSats = totalUnits * shareUnitPriceSats;
    return formatBtcFromSats(totalSats);
  }, [notes.notes, shareUnitPriceSats]);

  const ownedShareUnitsDisplay = useMemo(() => {
    const totalUnits = notes.notes.reduce((acc, note) => {
      const units = toBigIntCandidate(note.k_units);
      if (units === null) return acc;
      return acc + units;
    }, BigInt(0));
    return (Number(totalUnits)/1000).toFixed(8);
  }, [notes.notes]);

  const shareUnitPriceBtcDisplay = useMemo(() => {
    if (shareUnitPriceSats === null) return "0";
    return formatBtcFromSats(shareUnitPriceSats * BigInt(1000));
  }, [shareUnitPriceSats]);

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
    positionError: sharePriceError ?? positionError,
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
    notesMenuOpen,
    setNotesMenuOpen,
    notesMenuRef,
    currentPositionValue: isLoadingSharePrice ? "…" : `${notesPositionBtcDisplay} BTC`,
    allTimeYieldValue: ownedShareUnitsDisplay,
    shareUnitPriceBtcValue: shareUnitPriceBtcDisplay,
    minDepositBtc,
    minWithdrawBtc,
    chartRange,
    setChartRange,
    chartData,
    isLoadingChart,
    chartError,
    notes: notes.notes,
    notesStatus: notes.notesStatus,
    linkedNotesFileName: notes.linkedNotesFileName,
    notesAction: notes.notesAction,
    setNotesAction: notes.setNotesAction,
    isNotesSetupRequired: notes.isNotesSetupRequired,
    needsFileRelink: notes.needsFileRelink,
    downloadNoteOpen: notes.downloadNoteOpen,
    downloadPassword: notes.downloadPassword,
    setDownloadPassword: notes.setDownloadPassword,
    downloadPasswordError: notes.downloadPasswordError,
    handleOpenDownloadNote: notes.handleOpenDownloadNote,
    handleCloseDownloadNote: notes.handleCloseDownloadNote,
    handleRunSelectedNotesAction: notes.handleRunSelectedNotesAction,
    handleViewCurrentNotesFile: notes.handleViewCurrentNotesFile,
    handleCreateNewNotesFile: notes.handleCreateNewNotesFile,
    handleLinkExistingNotesFile: notes.handleLinkExistingNotesFile,
    depositProof: proofs.depositProof,
    withdrawProof: proofs.withdrawProof,
    proofError: proofs.proofError,
    activeProof: proofs.activeProof,
    depositAmountOpen: proofs.depositAmountOpen,
    depositAmountInput: proofs.depositAmountInput,
    setDepositAmountInput: proofs.setDepositAmountInput,
    depositAmountError: proofs.depositAmountError,
    withdrawAmountOpen: proofs.withdrawAmountOpen,
    withdrawAmountInput: proofs.withdrawAmountInput,
    setWithdrawAmountInput: proofs.setWithdrawAmountInput,
    withdrawAmountError: proofs.withdrawAmountError,
    withdrawModalStatus: proofs.withdrawModalStatus,
    withdrawModalProgress: proofs.withdrawModalProgress,
    handleOpenDepositAmount: proofs.handleOpenDepositAmount,
    handleCloseDepositAmount: proofs.handleCloseDepositAmount,
    handleOpenWithdrawAmount: proofs.handleOpenWithdrawAmount,
    handleCloseWithdrawAmount: proofs.handleCloseWithdrawAmount,
    handleConfirmDepositAmount: proofs.handleConfirmDepositAmount,
    handleConfirmWithdrawAmount: proofs.handleConfirmWithdrawAmount,
    depositModalStatus: proofs.depositModalStatus,
    depositModalProgress: proofs.depositModalProgress,
  };
}
