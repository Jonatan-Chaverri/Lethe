import { apiRequest, type ApiEnvelope } from "./client";

/**
 * Result of a testnet WBTC mint. Shape depends on the contract's mint response.
 */
export type MintTestnetWBTCResponse = Record<string, unknown>;

/**
 * Fetches the connected wallet's WBTC balance.
 * @param token - Auth access token
 * @returns Balance as string in wei/smallest units. Use a formatting util for human-readable WBTC.
 */
export async function getWBTCBalance(token: string): Promise<string> {
  const envelope = await apiRequest<ApiEnvelope<string>>("/api/onchain/getWBTCBalance", {
    method: "GET",
    token,
  });
  return envelope.data;
}

export async function mintTestnetWBTC(token: string): Promise<MintTestnetWBTCResponse> {
  const envelope = await apiRequest<ApiEnvelope<MintTestnetWBTCResponse>>(
    "/api/onchain/mintTestnetWBTC",
    {
      method: "GET",
      token,
    }
  );
  return envelope.data;
}
