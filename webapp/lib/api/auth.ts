import { apiRequest, type ApiEnvelope } from "./client";

export interface RegisterWalletPayload {
  wallet: string;
  wallet_provider: string;
  nonce: string;
  signature: [string, string];
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
  access_token: string;
  refresh_token: string;
  user: BackendUser;
}

export interface MeResponse {
  user: BackendUser;
}

export interface RefreshResponse {
  access_token: string;
  refresh_token: string;
}

export async function registerWallet(payload: RegisterWalletPayload) {
  const envelope = await apiRequest<ApiEnvelope<RegisterWalletResponse>>("/api/auth/register_wallet", {
    method: "POST",
    body: payload,
    auth: false,
  });
  return envelope.data;
}

export async function me() {
  const envelope = await apiRequest<ApiEnvelope<MeResponse>>("/api/auth/me", {
    method: "GET",
  });
  return envelope.data;
}

export async function refreshSession(refreshToken: string) {
  const envelope = await apiRequest<ApiEnvelope<RefreshResponse>>("/api/auth/refresh", {
    method: "POST",
    auth: false,
    body: {
      refresh_token: refreshToken,
    },
  });
  return envelope.data;
}
