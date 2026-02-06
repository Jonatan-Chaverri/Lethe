import { apiRequest } from "./client";

export interface RegisterWalletPayload {
  wallet: string;
  wallet_provider: string;
  message_hash: string;
  signature: [string, string];
  name?: string;
  email?: string;
}

export interface BackendUser {
  id: string;
  name: string | null;
  email: string | null;
  wallet: string;
  wallet_provider: string;
  created_at: string;
}

export interface RegisterWalletResponse {
  token: string;
  user: BackendUser;
}

export interface MeResponse {
  user: BackendUser;
}

export async function registerWallet(payload: RegisterWalletPayload) {
  return apiRequest<RegisterWalletResponse>("/api/auth/register_wallet", {
    method: "POST",
    body: payload,
  });
}

export async function me(token: string) {
  return apiRequest<MeResponse>("/api/auth/me", {
    method: "GET",
    token,
  });
}
