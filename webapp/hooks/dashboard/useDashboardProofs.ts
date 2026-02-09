"use client";

import { useState } from "react";
import { connect } from "starknetkit";
import { deposit, depositCallback, getMerklePath, getPurchasableUnits, withdraw } from "@/lib/api/userPositions";
import {
  generateDepositProof,
  generateWithdrawProof,
  WBTC_UNITS_PER_BTC,
  type CircuitProofResult,
} from "@/lib/noir/proofService";
import type { LetheNote } from "@/lib/notes/secureNotes";

export const MIN_DEPOSIT_BTC = 0.001;
export const MIN_WITHDRAW_BTC = 0.001;

function btcToUnits(btcStr: string): number {
  const n = parseFloat(btcStr);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * WBTC_UNITS_PER_BTC);
}

type DepositWallet = {
  request: (payload: {
    type: "wallet_addInvokeTransaction";
    params: {
      calls: {
        contract_address: string;
        entry_point: string;
        calldata: string[];
      }[];
    };
  }) => Promise<{ transaction_hash: string }>;
};

interface UseDashboardProofsParams {
  wallet: any;
  connectWalletWithoutSignature: () => Promise<any>;
  refetchUserPosition: () => Promise<unknown>;
  getSelectedWithdrawNote: () => LetheNote | undefined;
  onDepositNoteGenerated: (note: LetheNote) => void;
  onDepositLeafIndexResolved: (commitment: string, leafIndex: number) => void;
  onOpenDownloadModal: () => void;
  onBeforeDepositStart: () => void;
}

export function useDashboardProofs({
  wallet,
  connectWalletWithoutSignature,
  refetchUserPosition,
  getSelectedWithdrawNote,
  onDepositNoteGenerated,
  onDepositLeafIndexResolved,
  onOpenDownloadModal,
  onBeforeDepositStart,
}: UseDashboardProofsParams) {
  const [depositProof, setDepositProof] = useState<CircuitProofResult | null>(null);
  const [withdrawProof, setWithdrawProof] = useState<CircuitProofResult | null>(null);
  const [proofError, setProofError] = useState<string | null>(null);
  const [activeProof, setActiveProof] = useState<"deposit" | "withdraw" | null>(null);
  const [depositAmountOpen, setDepositAmountOpen] = useState(false);
  const [depositAmountInput, setDepositAmountInput] = useState("");
  const [depositAmountError, setDepositAmountError] = useState<string | null>(null);
  const [depositModalStatus, setDepositModalStatus] = useState<"pending" | "success" | null>(null);

  const handleOpenDepositAmount = () => {
    setDepositAmountError(null);
    setDepositAmountInput("");
    setDepositAmountOpen(true);
  };

  const handleCloseDepositAmount = () => {
    setDepositAmountOpen(false);
    setDepositAmountError(null);
  };

  const trySilentConnect = async () => {
    try {
      const result = await connect({ modalMode: "neverAsk" });
      return result.wallet && result.connectorData?.account ? result.wallet : null;
    } catch {
      return null;
    }
  };

  const resolveWallet = async (): Promise<DepositWallet | null> => {
    if (wallet) return wallet;
    const silentlyConnected = await trySilentConnect();
    if (silentlyConnected) return silentlyConnected as DepositWallet;
    try {
      const result = await connectWalletWithoutSignature();
      return result?.wallet ?? null;
    } catch {
      return null;
    }
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
    onBeforeDepositStart();
    setActiveProof("deposit");
    setDepositModalStatus("pending");

    try {
      const purchasableUnits = await getPurchasableUnits(amountUnits);
      const result = await generateDepositProof(Number(purchasableUnits));
      const transactionDetails = await deposit(result.proofHex, result.publicInputs, amountUnits);

      console.log("transaction details", JSON.stringify(transactionDetails, null, 2));

      const walletToUse = await resolveWallet();
      if (!walletToUse) {
        setProofError("Wallet not connected. Please connect your wallet to execute the deposit.");
        setDepositModalStatus(null);
        return;
      }

      const { transaction_hash } = await walletToUse.request({
        type: "wallet_addInvokeTransaction",
        params: {
          calls: transactionDetails.map((transaction) => ({
            contract_address: transaction.contract_address,
            entry_point: transaction.entrypoint,
            calldata: transaction.calldata ?? [],
          })),
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 5000));
      const callbackResult = await depositCallback(transaction_hash, amountUnits);

      setDepositProof(result);
      const generatedNote = result.depositNote;
      if (generatedNote) {
        onDepositNoteGenerated(generatedNote);
        if (callbackResult.commitment && typeof callbackResult.leaf_index === "number") {
          onDepositLeafIndexResolved(callbackResult.commitment, callbackResult.leaf_index);
        }
        onOpenDownloadModal();
      }

      setProofError(null);
      setDepositModalStatus("success");
      await refetchUserPosition();
      setTimeout(() => setDepositModalStatus(null), 2000);
    } catch (error) {
      setProofError(error instanceof Error ? error.message : "Failed to generate deposit proof");
      setDepositModalStatus(null);
    } finally {
      setActiveProof(null);
    }
  };

  const handleGenerateWithdrawProof = async () => {
    setProofError(null);
    const selectedNote = getSelectedWithdrawNote();
    if (!selectedNote) {
      setProofError("Load your encrypted notes file and select a note before withdrawing.");
      return;
    }

    setActiveProof("withdraw");
    try {
      if (!Number.isInteger(selectedNote.leaf_index) || selectedNote.leaf_index < 0) {
        throw new Error("This note does not have a valid leaf_index yet. Reload notes from file or try again.");
      }

      const merklePath = await getMerklePath(selectedNote.commitment, selectedNote.leaf_index);
      console.log("merkle path", JSON.stringify(merklePath, null, 2));
      console.log('selectedNote', JSON.stringify(selectedNote, null, 2));
      const result = await generateWithdrawProof(selectedNote, {
        path_elements: merklePath.path_elements,
        path_indices: merklePath.path_indices,
        root: merklePath.root,
      });
      console.log("withdraw proof result", result);
      const transactionDetails = await withdraw(result.proofHex, result.publicInputs, 0);

      const walletToUse = await resolveWallet();
      if (!walletToUse) {
        setProofError("Wallet not connected. Please connect your wallet to execute the withdraw.");
        return;
      }

      await walletToUse.request({
        type: "wallet_addInvokeTransaction",
        params: {
          calls: [
            {
              contract_address: transactionDetails.contract_address,
              entry_point: transactionDetails.entrypoint,
              calldata: transactionDetails.calldata ?? [],
            },
          ],
        },
      });

      setWithdrawProof(result);
      await refetchUserPosition();
    } catch (error) {
      console.log("withdraw proof error", error);
      setProofError(error instanceof Error ? error.message : "Failed to generate withdraw proof");
    } finally {
      setActiveProof(null);
    }
  };

  return {
    depositProof,
    withdrawProof,
    proofError,
    setProofError,
    activeProof,
    depositAmountOpen,
    depositAmountInput,
    setDepositAmountInput,
    depositAmountError,
    handleOpenDepositAmount,
    handleCloseDepositAmount,
    handleConfirmDepositAmount,
    handleGenerateWithdrawProof,
    depositModalStatus,
  };
}
