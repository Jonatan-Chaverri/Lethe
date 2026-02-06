import { ApiError } from "@/lib/api/client";
import {
  me,
  registerWallet,
  type BackendUser,
  type RegisterWalletPayload,
} from "@/lib/api/auth";

const AUTH_TOKEN_KEY = "lethe_auth_token";

function isBrowser() {
  return typeof window !== "undefined";
}

export const authService = {
  getToken(): string | null {
    if (!isBrowser()) return null;
    return window.localStorage.getItem(AUTH_TOKEN_KEY);
  },

  setToken(token: string) {
    if (!isBrowser()) return;
    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  },

  clearToken() {
    if (!isBrowser()) return;
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
  },

  async registerWallet(payload: RegisterWalletPayload) {
    const result = await registerWallet(payload);
    this.setToken(result.token);
    return result;
  },

  async getMe(): Promise<BackendUser | null> {
    const token = this.getToken();
    if (!token) return null;

    try {
      const result = await me(token);
      return result.user;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        this.clearToken();
        return null;
      }
      throw error;
    }
  },

  logout() {
    this.clearToken();
  },
};
