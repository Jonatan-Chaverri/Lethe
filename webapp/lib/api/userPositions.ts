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

export async function deposit(proof: string, publicInputs: string[]): Promise<TransactionDetails> {
  const envelope = await apiRequest<ApiEnvelope<TransactionDetails>>("/api/user-positions/deposit", {
    method: "POST",
    body: { proof, publicInputs },
  });
  return envelope.data;
}
