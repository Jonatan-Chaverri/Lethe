import {
  me,
  registerWallet,
  type BackendUser,
  type RegisterWalletPayload,
} from "@/lib/api/auth";

const ACCESS_TOKEN_KEY = "lethe_access_token";
const REFRESH_TOKEN_KEY = "lethe_refresh_token";
const AUTH_USER_KEY = "lethe_auth_user";

export interface SessionTokens {
  access_token: string;
  refresh_token: string;
}

function isBrowser() {
  return typeof window !== "undefined";
}

function parseStoredUser(raw: string | null): BackendUser | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as unknown;
    if (
      data &&
      typeof data === "object" &&
      "id" in data &&
      "wallet" in data &&
      typeof (data as BackendUser).id === "string" &&
      typeof (data as BackendUser).wallet === "string"
    ) {
      return data as BackendUser;
    }
  } catch {
    // ignore malformed value
  }
  return null;
}

export const authService = {
  getAccessToken(): string | null {
    if (!isBrowser()) return null;
    return window.localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  getRefreshToken(): string | null {
    if (!isBrowser()) return null;
    return window.localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  setTokens(tokens: SessionTokens) {
    if (!isBrowser()) return;
    window.localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
    window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
  },

  clearTokens() {
    if (!isBrowser()) return;
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  },

  getUser(): BackendUser | null {
    if (!isBrowser()) return null;
    return parseStoredUser(window.localStorage.getItem(AUTH_USER_KEY));
  },

  setUser(user: BackendUser) {
    if (!isBrowser()) return;
    window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  },

  clearUser() {
    if (!isBrowser()) return;
    window.localStorage.removeItem(AUTH_USER_KEY);
  },

  clearSession() {
    this.clearTokens();
    this.clearUser();
  },

  isAuthenticated(): boolean {
    return this.getAccessToken() !== null;
  },

  async registerWallet(payload: RegisterWalletPayload) {
    const session = await registerWallet(payload);

    this.setTokens({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
    this.setUser(session.user);

    const user = await this.getMeWithAutoRefresh();
    if (!user) {
      throw new Error("Failed to initialize user session after register_wallet");
    }

    return {
      ...session,
      user,
    };
  },

  async getMeWithAutoRefresh(): Promise<BackendUser | null> {
    try {
      const response = await me();
      this.setUser(response.user);
      return response.user;
    } catch (error) {
      this.clearSession();
      return null;
    }
  },

  async bootstrapSession(): Promise<BackendUser | null> {
    if (!this.getAccessToken() && !this.getRefreshToken()) {
      return null;
    }
    return this.getMeWithAutoRefresh();
  },

  logout() {
    this.clearSession();
  },
};
