export interface UserDto {
  id: string;
  name: string | null;
  email: string | null;
  wallet: string;
  wallet_provider: string;
  created_at: Date;
}
