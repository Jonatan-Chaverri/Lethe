export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

interface ApiRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  auth?: boolean;
  skipAuthRefresh?: boolean;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";
const ACCESS_TOKEN_KEY = "lethe_access_token";
const REFRESH_TOKEN_KEY = "lethe_refresh_token";
const AUTH_USER_KEY = "lethe_auth_user";

let refreshPromise: Promise<string | null> | null = null;

export interface ApiEnvelope<T> {
  success: boolean;
  timestamp: number;
  message: string;
  data: T;
}

function isBrowser() {
  return typeof window !== "undefined";
}

function getAccessToken(): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

function getRefreshToken(): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

function setTokens(accessToken: string, refreshToken: string) {
  if (!isBrowser()) return;
  window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

function clearSession() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  window.localStorage.removeItem(AUTH_USER_KEY);
}

async function requestWithHeaders<T>(
  path: string,
  options: ApiRequestOptions,
  headers: HeadersInit
): Promise<{ response: Response; parsed: T | unknown | null }> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  let parsed: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  return { response, parsed: parsed as T | unknown | null };
}

async function refreshAccessToken(): Promise<string | null> {
  if (!isBrowser()) return null;
  if (refreshPromise) return refreshPromise;

  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    clearSession();
    return null;
  }

  refreshPromise = (async () => {
    const { response, parsed } = await requestWithHeaders<ApiEnvelope<{ access_token: string; refresh_token: string }>>(
      "/api/auth/refresh",
      { method: "POST", auth: false, skipAuthRefresh: true, body: { refresh_token: refreshToken } },
      { "Content-Type": "application/json" }
    );

    if (!response.ok) {
      clearSession();
      return null;
    }

    const envelope = parsed as ApiEnvelope<{ access_token: string; refresh_token: string }> | null;
    const tokens = envelope?.data;
    if (!tokens?.access_token || !tokens?.refresh_token) {
      clearSession();
      return null;
    }

    setTokens(tokens.access_token, tokens.refresh_token);
    return tokens.access_token;
  })()
    .catch(() => {
      clearSession();
      return null;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const useAuth = options.auth !== false;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (useAuth) {
    const token = getAccessToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const { response, parsed } = await requestWithHeaders<T>(path, options, headers);

  if (
    response.status === 401 &&
    useAuth &&
    !options.skipAuthRefresh &&
    path !== "/api/auth/refresh"
  ) {
    const newAccessToken = await refreshAccessToken();
    if (newAccessToken) {
      const retryHeaders: HeadersInit = {
        ...headers,
        Authorization: `Bearer ${newAccessToken}`,
      };
      const retry = await requestWithHeaders<T>(path, { ...options, skipAuthRefresh: true }, retryHeaders);
      if (retry.response.ok) {
        return retry.parsed as T;
      }
      const retryMessage =
        typeof retry.parsed === "object" && retry.parsed !== null && "message" in retry.parsed
          ? String((retry.parsed as { message: string }).message)
          : `Request failed with status ${retry.response.status}`;
      throw new ApiError(retryMessage, retry.response.status, retry.parsed);
    }
  }

  if (!response.ok) {
    const message =
      typeof parsed === "object" && parsed !== null && "message" in parsed
        ? String((parsed as { message: string }).message)
        : `Request failed with status ${response.status}`;

    throw new ApiError(message, response.status, parsed);
  }

  return parsed as T;
}
