import { apiRequest, type ApiEnvelope } from "./client";

/**
 * Result of a testnet WBTC mint. Shape depends on the contract's mint response.
 */
export type UserPositionResponse = {
  current_balance: string;
  total_yield: string;
};

export type TransactionDetails = {
  contract_address: string;
  entrypoint: string;
  calldata: string[];
};

export type DepositCallbackResponse = {
  commitment: string | null;
  leaf_index: number | null;
};

/**
 * Fetches the connected wallet's WBTC balance.
 * @returns Balance as string in wei/smallest units. Use a formatting util for human-readable WBTC.
 */
export async function getUserPosition(): Promise<UserPositionResponse> {
  const envelope = await apiRequest<ApiEnvelope<UserPositionResponse>>("/api/user-positions/getCurrentPosition", {
    method: "GET",
  });
  return envelope.data;
}

export async function getPurchasableUnits(amount_btc: number): Promise<bigint> {
  const envelope = await apiRequest<ApiEnvelope<bigint>>("/api/user-positions/getPurchasableUnits", {
    method: "POST",
    body: { amount_btc },
  });
  return envelope.data;
}

export async function deposit(proof: string, publicInputs: string[], amount_btc: number): Promise<TransactionDetails[]> {
  const envelope = await apiRequest<ApiEnvelope<TransactionDetails[]>>("/api/user-positions/deposit", {
    method: "POST",
    body: { proof, publicInputs, amount_btc },
  });
  return envelope.data;
}

export async function depositCallback(
  transaction_hash: string,
  deposit_units: number
): Promise<DepositCallbackResponse> {
  const envelope = await apiRequest<ApiEnvelope<DepositCallbackResponse>>("/api/user-positions/deposit/callback", {
    method: "POST",
    body: { transaction_hash, deposit_units },
  });
  return envelope.data;
}
