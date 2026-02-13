"use client";

import { useState } from "react";
import { ETransactionVersion, AccountInterface, RpcProvider } from "starknet";
import { connect } from "starknetkit";

import { deposit, depositCallback, getMerklePath, getPurchasableUnits, withdraw, withdrawCallback } from "@/lib/api/userPositions";
import type { ConnectorData, StarknetWindowObject } from "starknetkit";
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

interface UseDashboardProofsParams {
  wallet: StarknetWindowObject | null;
  account: AccountInterface | null;
  connectWalletWithoutSignature: () => Promise<{
    wallet: StarknetWindowObject;
    account?: AccountInterface | null;
  }>;
  refetchUserPosition: () => Promise<unknown>;
  getWithdrawableNotes: () => LetheNote[];
  onDepositNoteGenerated: (note: LetheNote) => void;
  onDepositLeafIndexResolved: (commitment: string, leafIndex: number) => void;
  onWithdrawNotesTransition: (spentCommitment: string, changeNote?: LetheNote) => void;
  onPersistNotesAfterMutation: () => Promise<void>;
  onBeforeDepositStart: () => void;
  onBeforeWithdrawStart: () => void;
}

export function useDashboardProofs({
  wallet,
  account,
  connectWalletWithoutSignature,
  refetchUserPosition,
  getWithdrawableNotes,
  onDepositNoteGenerated,
  onDepositLeafIndexResolved,
  onWithdrawNotesTransition,
  onPersistNotesAfterMutation,
  onBeforeDepositStart,
  onBeforeWithdrawStart,
}: UseDashboardProofsParams) {
  const asBigInt = (value: unknown): bigint | null => {
    if (typeof value === "bigint") return value;
    if (typeof value === "number" && Number.isFinite(value)) return BigInt(Math.trunc(value));
    if (typeof value === "string" && value.length > 0) {
      try {
        return value.startsWith("0x") || value.startsWith("0X") ? BigInt(value) : BigInt(value);
      } catch {
        return null;
      }
    }
    return null;
  };

  const toHex = (value: bigint): string => `0x${value.toString(16)}`;

  const getCallsFromTransactions = (transactions: TransactionDetailsLike[]) =>
    transactions.map((transaction) => ({
      contract_address: transaction.contract_address,
      entry_point: transaction.entrypoint,
      calldata: transaction.calldata ?? [],
    }));

  type TransactionDetailsLike = {
    contract_address: string;
    entrypoint: string;
    calldata?: string[];
  };

  type WalletConnection = {
    wallet: StarknetWindowObject;
    account: AccountInterface | null;
  };

  const sendInvokeWithBackendFee = async (
    connection: WalletConnection,
    calls: {
      contract_address: string;
      entry_point: string;
      calldata: string[];
    }[],
    feeEstimate?: any
  ): Promise<{ transaction_hash: string }> => {
    const MIN_L2_GAS_AMOUNT = BigInt("2200000000");
    const MIN_L2_GAS_PRICE = BigInt("20000000000");
    const SCALE_NUM = BigInt(150);
    const SCALE_DEN = BigInt(100);

    const estimatedOverallFee =
      asBigInt(feeEstimate?.overall_fee) ?? asBigInt(feeEstimate?.overallFee) ?? null;

    const rb = feeEstimate?.resource_bounds ?? feeEstimate?.resourceBounds;
    const l2Gas = rb?.l2_gas ?? rb?.l2Gas;
    const estimatedL2Gas =
      asBigInt(l2Gas?.max_amount) ?? asBigInt(l2Gas?.maxAmount) ?? null;
    const estimatedL2GasPrice =
      asBigInt(l2Gas?.max_price_per_unit) ??
      asBigInt(l2Gas?.maxPricePerUnit) ??
      null;

    const scaledEstimatedL2Gas =
      estimatedL2Gas !== null ? (estimatedL2Gas * SCALE_NUM) / SCALE_DEN : null;
    const scaledEstimatedL2GasPrice =
      estimatedL2GasPrice !== null ? (estimatedL2GasPrice * SCALE_NUM) / SCALE_DEN : null;

    const maxL2Gas =
      scaledEstimatedL2Gas !== null && scaledEstimatedL2Gas > MIN_L2_GAS_AMOUNT
        ? scaledEstimatedL2Gas
        : MIN_L2_GAS_AMOUNT;
    const maxL2GasPrice =
      scaledEstimatedL2GasPrice !== null && scaledEstimatedL2GasPrice > MIN_L2_GAS_PRICE
        ? scaledEstimatedL2GasPrice
        : MIN_L2_GAS_PRICE;

    const minFeeFromBounds = maxL2Gas * maxL2GasPrice;
    const scaledOverallFee =
      estimatedOverallFee !== null ? (estimatedOverallFee * SCALE_NUM) / SCALE_DEN : null;
    const maxFeeValue =
      scaledOverallFee !== null && scaledOverallFee > minFeeFromBounds
        ? scaledOverallFee
        : minFeeFromBounds;

    const details = {
      version: ETransactionVersion.V3,
      resourceBounds: {
        l2_gas: { max_amount: maxL2Gas, max_price_per_unit: maxL2GasPrice },
        l1_gas: { max_amount: BigInt("0x1000000"), max_price_per_unit: BigInt("0x1") },
        l1_data_gas: { max_amount: BigInt("0x1000000"), max_price_per_unit: BigInt("0x1") },
      },
      maxFee: maxFeeValue,
    };

    const executeCalls = calls.map((call) => ({
      contractAddress: call.contract_address,
      entrypoint: call.entry_point,
      calldata: call.calldata,
      
    }));

    if (connection.account) {
      const executeResult = await connection.account.execute(executeCalls, details);
      if (executeResult?.transaction_hash) {
        console.log("invoke route: connector.account.execute");
        return { transaction_hash: executeResult.transaction_hash };
      }
      if ((executeResult as any)?.transactionHash) {
        console.log("invoke route: connector.account.execute");
        return { transaction_hash: (executeResult as any).transactionHash };
      }
      throw new Error("connector.account.execute did not return transaction hash");
    }

    throw new Error("No AccountInterface available. Reconnect wallet to execute with tx options.");
  };

  const [depositProof, setDepositProof] = useState<CircuitProofResult | null>(null);
  const [withdrawProof, setWithdrawProof] = useState<CircuitProofResult | null>(null);
  const [proofError, setProofError] = useState<string | null>(null);
  const [activeProof, setActiveProof] = useState<"deposit" | "withdraw" | null>(null);
  const [depositAmountOpen, setDepositAmountOpen] = useState(false);
  const [depositAmountInput, setDepositAmountInput] = useState("");
  const [depositAmountError, setDepositAmountError] = useState<string | null>(null);
  const [withdrawAmountOpen, setWithdrawAmountOpen] = useState(false);
  const [withdrawAmountInput, setWithdrawAmountInput] = useState("");
  const [withdrawAmountError, setWithdrawAmountError] = useState<string | null>(null);
  const [depositModalStatus, setDepositModalStatus] = useState<"pending" | "success" | null>(null);
  const [withdrawModalStatus, setWithdrawModalStatus] = useState<"pending" | "success" | null>(null);
  const [withdrawModalProgress, setWithdrawModalProgress] = useState<string | null>(null);

  const handleOpenDepositAmount = () => {
    setDepositAmountError(null);
    setDepositAmountInput("");
    setDepositAmountOpen(true);
  };

  const handleCloseDepositAmount = () => {
    setDepositAmountOpen(false);
    setDepositAmountError(null);
  };

  const handleOpenWithdrawAmount = () => {
    setWithdrawAmountError(null);
    setWithdrawAmountInput("");
    setWithdrawAmountOpen(true);
  };

  const handleCloseWithdrawAmount = () => {
    setWithdrawAmountOpen(false);
    setWithdrawAmountError(null);
  };

  const trySilentConnect = async (): Promise<WalletConnection | null> => {
    try {
      const result = await connect({ modalMode: "neverAsk" });
      if (!result.wallet || !result.connectorData?.account) {
        return null;
      }
      const account = await result.connector?.account(new RpcProvider({
        nodeUrl: process.env.RPC_URL
      }));
      return { wallet: result.wallet as StarknetWindowObject, account: account ?? null };
    } catch {
      return null;
    }
  };

  const resolveWallet = async (): Promise<WalletConnection | null> => {
    if (wallet) {
      const walletAccount = ((wallet as any).account ?? null) as AccountInterface | null;
      return { wallet, account: walletAccount ?? account ?? null };
    }
    const silentlyConnected = await trySilentConnect();
    if (silentlyConnected) return silentlyConnected;
    try {
      const result = await connectWalletWithoutSignature();
      return { wallet: result.wallet, account: result.account ?? null };
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
      const { transactions, deposit_fee } = await deposit(result.proofHex, result.publicInputs, amountUnits);

      const connection = await resolveWallet();
      if (!connection) {
        setProofError("Wallet not connected. Please connect your wallet to execute the deposit.");
        setDepositModalStatus(null);
        return;
      }

      const depositCalls = getCallsFromTransactions(transactions);
      const { transaction_hash } = await sendInvokeWithBackendFee(connection, depositCalls, deposit_fee);

      await new Promise((resolve) => setTimeout(resolve, 5000));
      const callbackResult = await depositCallback(transaction_hash, amountUnits);
      console.log("callbackResult", JSON.stringify(callbackResult, null, 2));

      setDepositProof(result);
      const generatedNote = result.depositNote;
      if (generatedNote) {
        onDepositNoteGenerated(generatedNote);
        if (callbackResult.commitment && typeof callbackResult.leaf_index === "number") {
          onDepositLeafIndexResolved(callbackResult.commitment, callbackResult.leaf_index);
        }
        await onPersistNotesAfterMutation();
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

  const parseNoteUnits = (note: LetheNote): number => {
    const raw = note.k_units.trim().toLowerCase();
    if (!raw) return 0;
    return raw.startsWith("0x") ? Number.parseInt(raw, 16) : Number.parseInt(raw, 10);
  };

  const handleConfirmWithdrawAmount = async () => {
    setWithdrawAmountError(null);
    const trimmed = withdrawAmountInput.trim();
    if (!trimmed) {
      setWithdrawAmountError("Enter an amount in BTC");
      return;
    }
    const amountBtc = parseFloat(trimmed);
    if (!Number.isFinite(amountBtc) || amountBtc < MIN_WITHDRAW_BTC) {
      setWithdrawAmountError(`Minimum withdraw is ${MIN_WITHDRAW_BTC.toFixed(3)} BTC`);
      return;
    }
    const amountUnits = btcToUnits(trimmed);
    if (amountUnits <= 0) {
      setWithdrawAmountError("Amount is too small");
      return;
    }

    setWithdrawAmountOpen(false);
    setProofError(null);
    onBeforeWithdrawStart();
    setActiveProof("withdraw");
    setWithdrawModalStatus("pending");
    setWithdrawModalProgress("Preparing withdraw...");
    try {
      const requiredUnitsRaw = await getPurchasableUnits(amountUnits);
      const requiredUnits = Number(requiredUnitsRaw);
      if (!Number.isFinite(requiredUnits) || requiredUnits <= 0) {
        throw new Error("Unable to determine withdraw units for the requested BTC amount.");
      }

      const connection = await resolveWallet();
      if (!connection) {
        setProofError("Wallet not connected. Please connect your wallet to execute the withdraw.");
        return;
      }

      const available = getWithdrawableNotes()
        .map((note) => ({ note, units: parseNoteUnits(note) }))
        .filter((item) => item.units > 0)
        .sort((a, b) => b.units - a.units);
      if (available.length === 0) {
        throw new Error("No spendable notes available. Reload notes file and try again.");
      }

      let remainingUnits = requiredUnits;
      let lastProof: CircuitProofResult | null = null;
      const spendPlan = available
        .map((item) => ({ ...item, consume: Math.min(item.units, Math.max(0, remainingUnits)) }))
        .filter((item) => item.consume > 0);
      let plannedRemaining = requiredUnits;
      const planSteps = spendPlan.map((item) => {
        const consume = Math.min(item.units, plannedRemaining);
        plannedRemaining -= consume;
        return consume;
      });
      const totalSteps = planSteps.length;
      let currentStep = 0;
      for (const item of available) {
        if (remainingUnits <= 0) break;
        const consumeUnits = Math.min(item.units, remainingUnits);
        if (consumeUnits <= 0) continue;
        if (!Number.isInteger(item.note.leaf_index) || item.note.leaf_index < 0) {
          continue;
        }
        currentStep += 1;
        setWithdrawModalProgress(`Processing note ${currentStep}/${Math.max(1, totalSteps)}...`);

        const merklePath = await getMerklePath(item.note.commitment, item.note.leaf_index);
        const result = await generateWithdrawProof(
          {
            commitment: item.note.commitment,
            k_units: String(item.units),
            secret: item.note.secret,
            nullifier: item.note.nullifier,
            leaf_index: item.note.leaf_index,
          },
          {
            path_elements: merklePath.path_elements,
            path_indices: merklePath.path_indices,
            root: merklePath.root,
          },
          consumeUnits
        );
        console.log("result", JSON.stringify(result, null, 2));

        const { transaction, withdraw_fee } = await withdraw(result.proofHex, result.publicInputs, 0);
        const withdrawCalls = getCallsFromTransactions([transaction]);
        const { transaction_hash } = await sendInvokeWithBackendFee(connection, withdrawCalls, withdraw_fee);
        setWithdrawModalProgress(`Waiting confirmation for note ${currentStep}/${Math.max(1, totalSteps)}...`);
        const callbackResult = await withdrawCallback(transaction_hash);
        console.log("callbackResult", JSON.stringify(callbackResult, null, 2));

        let changeNote: LetheNote | undefined;
        if (
          callbackResult.commitment &&
          typeof callbackResult.leaf_index === "number" &&
          result.withdrawNote
        ) {
          changeNote = {
            ...result.withdrawNote,
            commitment: callbackResult.commitment,
            leaf_index: callbackResult.leaf_index,
          };
        }

        onWithdrawNotesTransition(item.note.commitment, changeNote);
        await onPersistNotesAfterMutation();
        remainingUnits -= consumeUnits;
        lastProof = result;
      }

      if (remainingUnits > 0) {
        throw new Error("Not enough units in notes to complete requested withdraw amount.");
      }

      if (lastProof) {
        setWithdrawProof(lastProof);
      }
      setWithdrawModalStatus("success");
      setWithdrawModalProgress("Withdraw completed.");
      await refetchUserPosition();
      setTimeout(() => {
        setWithdrawModalStatus(null);
        setWithdrawModalProgress(null);
      }, 2000);
    } catch (error) {
      setProofError(error instanceof Error ? error.message : "Failed to generate withdraw proof");
      setWithdrawModalStatus(null);
      setWithdrawModalProgress(null);
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
    withdrawAmountOpen,
    withdrawAmountInput,
    setWithdrawAmountInput,
    withdrawAmountError,
    withdrawModalStatus,
    withdrawModalProgress,
    handleOpenDepositAmount,
    handleCloseDepositAmount,
    handleOpenWithdrawAmount,
    handleCloseWithdrawAmount,
    handleConfirmDepositAmount,
    handleConfirmWithdrawAmount,
    depositModalStatus,
  };
}
