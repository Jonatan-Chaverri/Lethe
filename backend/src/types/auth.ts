export interface UserDto {
  id: string;
  name: string | null;
  email: string | null;
  wallet: string;
  wallet_provider: string;
  created_at: Date;
}

export interface SessionTokens {
  access_token: string;
  refresh_token: string;
}

export interface SessionContext {
  userAgent?: string | null;
  deviceInfo?: string | null;
  ipAddress?: string | null;
}
