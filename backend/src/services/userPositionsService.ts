import type { DbTransaction } from "./db/transactionsDbService";
import type { DbUserPosition } from "./db/userPositionsDbService";
import { transactionsDbService } from "./db/transactionsDbService";
import { userPositionsDbService } from "./db/userPositionsDbService";

export interface UserPositionEntry {
  user_id: string;
  total_active_shares: number;
  total_deposited_btc: number;
  total_withdrawn_btc: number;
  realized_pnl: number;
  unrealized_pnl: number;
  updated_at: Date;
}

export interface UserTransactionEntry {
  id: string;
  user_id: string;
  deposit_commitment: string;
  deposit_amount_btc: number;
  deposit_shares: number;
  deposit_share_price: number;
  withdrawn_shares: number;
  withdraw_share_price: number;
  status: string;
  created_at: Date;
  updated_at: Date;
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "string") return Number(value);
  if (value != null && typeof (value as { toNumber?: () => number }).toNumber === "function") {
    return (value as { toNumber: () => number }).toNumber();
  }
  return Number(value);
}

function toUserPositionEntry(row: DbUserPosition): UserPositionEntry {
  return {
    user_id: row.user_id,
    total_active_shares: toNumber(row.total_active_shares),
    total_deposited_btc: toNumber(row.total_deposited_btc),
    total_withdrawn_btc: toNumber(row.total_withdrawn_btc),
    realized_pnl: toNumber(row.realized_pnl),
    unrealized_pnl: toNumber(row.unrealized_pnl),
    updated_at: row.updated_at,
  };
}

function toUserTransactionEntry(row: DbTransaction): UserTransactionEntry {
  return {
    id: row.id,
    user_id: row.user_id,
    deposit_commitment: row.deposit_commitment,
    deposit_amount_btc: toNumber(row.deposit_amount_btc),
    deposit_shares: toNumber(row.deposit_shares),
    deposit_share_price: toNumber(row.deposit_share_price),
    withdrawn_shares: toNumber(row.withdrawn_shares),
    withdraw_share_price: toNumber(row.withdraw_share_price),
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export class UserPositionsService {
  
  async getUserPosition(user_id: string): Promise<UserPositionEntry | null> {
    const position = await userPositionsDbService.getByUserId(user_id);
    return position ? toUserPositionEntry(position) : null;
  }

  async getUserActiveDeposits(user_id: string): Promise<UserTransactionEntry[]> {
    const transactions = await transactionsDbService.findByUserIdWhereStatusNotClosed(user_id);
    return transactions.map(toUserTransactionEntry);
  }
};
