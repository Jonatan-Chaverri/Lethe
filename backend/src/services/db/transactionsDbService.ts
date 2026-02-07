import { Prisma, TransactionStatus } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { HttpError } from "../../lib/httpError";

const TRANSACTION_SELECT = {
  id: true,
  user_id: true,
  deposit_commitment: true,
  deposit_amount_btc: true,
  deposit_shares: true,
  deposit_share_price: true,
  withdrawn_shares: true,
  withdraw_share_price: true,
  status: true,
  created_at: true,
  updated_at: true,
} satisfies Prisma.TransactionSelect;

export type DbTransaction = Prisma.TransactionGetPayload<{
  select: typeof TRANSACTION_SELECT;
}>;

export type { TransactionStatus };

interface CreateTransactionInput {
  userId: string;
  depositCommitment: string;
  depositAmountBtc?: number | string | Prisma.Decimal;
  depositShares?: number | string | Prisma.Decimal;
  depositSharePrice?: number | string | Prisma.Decimal;
}

interface UpdateTransactionWithdrawalInput {
  withdrawnShares: number | string | Prisma.Decimal;
  withdrawSharePrice: number | string | Prisma.Decimal;
  status: TransactionStatus;
}

export const transactionsDbService = {
  async create(input: CreateTransactionInput): Promise<DbTransaction> {
    try {
      return await prisma.transaction.create({
        data: {
          user_id: input.userId,
          deposit_commitment: input.depositCommitment,
          deposit_amount_btc: input.depositAmountBtc ?? 0,
          deposit_shares: input.depositShares ?? 0,
          deposit_share_price: input.depositSharePrice ?? 0,
        },
        select: TRANSACTION_SELECT,
      });
    } catch (error) {
      throw new HttpError(500, "Failed to create transaction", error);
    }
  },

  async findById(id: string): Promise<DbTransaction | null> {
    try {
      return await prisma.transaction.findUnique({
        where: { id },
        select: TRANSACTION_SELECT,
      });
    } catch (error) {
      throw new HttpError(500, "Failed to query transaction by id", error);
    }
  },

  async findByUserId(userId: string): Promise<DbTransaction[]> {
    try {
      return await prisma.transaction.findMany({
        where: { user_id: userId },
        select: TRANSACTION_SELECT,
        orderBy: { created_at: "desc" },
      });
    } catch (error) {
      throw new HttpError(500, "Failed to query transactions by user", error);
    }
  },

  async findByUserIdAndStatus(
    userId: string,
    status: TransactionStatus
  ): Promise<DbTransaction[]> {
    try {
      return await prisma.transaction.findMany({
        where: { user_id: userId, status },
        select: TRANSACTION_SELECT,
        orderBy: { created_at: "desc" },
      });
    } catch (error) {
      throw new HttpError(500, "Failed to query transactions by user and status", error);
    }
  },

  async findByUserIdWhereStatusNotClosed(userId: string): Promise<DbTransaction[]> {
    try {
      return await prisma.transaction.findMany({
        where: {
          user_id: userId,
          status: { not: "closed" },
        },
        select: TRANSACTION_SELECT,
        orderBy: { created_at: "desc" },
      });
    } catch (error) {
      throw new HttpError(500, "Failed to query active transactions by user", error);
    }
  },

  async findByDepositCommitment(
    depositCommitment: string
  ): Promise<DbTransaction | null> {
    try {
      return await prisma.transaction.findFirst({
        where: { deposit_commitment: depositCommitment },
        select: TRANSACTION_SELECT,
      });
    } catch (error) {
      throw new HttpError(500, "Failed to query transaction by commitment", error);
    }
  },

  async updateWithdrawal(
    id: string,
    input: UpdateTransactionWithdrawalInput
  ): Promise<DbTransaction> {
    try {
      return await prisma.transaction.update({
        where: { id },
        data: {
          withdrawn_shares: input.withdrawnShares,
          withdraw_share_price: input.withdrawSharePrice,
          status: input.status,
        },
        select: TRANSACTION_SELECT,
      });
    } catch (error) {
      throw new HttpError(500, "Failed to update transaction withdrawal", error);
    }
  },

  async updateStatus(id: string, status: TransactionStatus): Promise<DbTransaction> {
    try {
      return await prisma.transaction.update({
        where: { id },
        data: { status },
        select: TRANSACTION_SELECT,
      });
    } catch (error) {
      throw new HttpError(500, "Failed to update transaction status", error);
    }
  },
};
