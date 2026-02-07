import { apiRequest, type ApiEnvelope } from "./client";

/**
 * Result of a testnet WBTC mint. Shape depends on the contract's mint response.
 */
export type UserPositionResponse = {
  current_balance: string;
  total_yield: string;
};

/**
 * Fetches the connected wallet's WBTC balance.
 * @param token - Auth access token
 * @returns Balance as string in wei/smallest units. Use a formatting util for human-readable WBTC.
 */
export async function getUserPosition(token: string): Promise<UserPositionResponse> {
  const envelope = await apiRequest<ApiEnvelope<UserPositionResponse>>("/api/user-positions/getCurrentPosition", {
    method: "GET",
    token,
  });
  return envelope.data;
}
