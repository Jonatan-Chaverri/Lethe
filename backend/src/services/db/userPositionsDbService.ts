import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { HttpError } from "../../lib/httpError";

const USER_POSITION_SELECT = {
  user_id: true,
  total_active_shares: true,
  total_deposited_btc: true,
  total_withdrawn_btc: true,
  realized_pnl: true,
  unrealized_pnl: true,
  updated_at: true,
} satisfies Prisma.UserPositionSelect;

export type DbUserPosition = Prisma.UserPositionGetPayload<{
  select: typeof USER_POSITION_SELECT;
}>;

interface UpsertUserPositionInput {
  totalActiveShares?: number | string | Prisma.Decimal;
  totalDepositedBtc?: number | string | Prisma.Decimal;
  totalWithdrawnBtc?: number | string | Prisma.Decimal;
  realizedPnl?: number | string | Prisma.Decimal;
  unrealizedPnl?: number | string | Prisma.Decimal;
}

export const userPositionsDbService = {
  async getByUserId(userId: string): Promise<DbUserPosition | null> {
    try {
      return await prisma.userPosition.findUnique({
        where: { user_id: userId },
        select: USER_POSITION_SELECT,
      });
    } catch (error) {
      throw new HttpError(500, "Failed to query user position", error);
    }
  },

  async upsert(userId: string, input: UpsertUserPositionInput = {}): Promise<DbUserPosition> {
    try {
      return await prisma.userPosition.upsert({
        where: { user_id: userId },
        create: {
          user_id: userId,
          total_active_shares: input.totalActiveShares ?? 0,
          total_deposited_btc: input.totalDepositedBtc ?? 0,
          total_withdrawn_btc: input.totalWithdrawnBtc ?? 0,
          realized_pnl: input.realizedPnl ?? 0,
          unrealized_pnl: input.unrealizedPnl ?? 0,
        },
        update: {
          ...(input.totalActiveShares !== undefined && {
            total_active_shares: input.totalActiveShares,
          }),
          ...(input.totalDepositedBtc !== undefined && {
            total_deposited_btc: input.totalDepositedBtc,
          }),
          ...(input.totalWithdrawnBtc !== undefined && {
            total_withdrawn_btc: input.totalWithdrawnBtc,
          }),
          ...(input.realizedPnl !== undefined && {
            realized_pnl: input.realizedPnl,
          }),
          ...(input.unrealizedPnl !== undefined && {
            unrealized_pnl: input.unrealizedPnl,
          }),
        },
        select: USER_POSITION_SELECT,
      });
    } catch (error) {
      throw new HttpError(500, "Failed to upsert user position", error);
    }
  },

  async update(
    userId: string,
    input: UpsertUserPositionInput
  ): Promise<DbUserPosition> {
    try {
      return await prisma.userPosition.update({
        where: { user_id: userId },
        data: {
          ...(input.totalActiveShares !== undefined && {
            total_active_shares: input.totalActiveShares,
          }),
          ...(input.totalDepositedBtc !== undefined && {
            total_deposited_btc: input.totalDepositedBtc,
          }),
          ...(input.totalWithdrawnBtc !== undefined && {
            total_withdrawn_btc: input.totalWithdrawnBtc,
          }),
          ...(input.realizedPnl !== undefined && {
            realized_pnl: input.realizedPnl,
          }),
          ...(input.unrealizedPnl !== undefined && {
            unrealized_pnl: input.unrealizedPnl,
          }),
        },
        select: USER_POSITION_SELECT,
      });
    } catch (error) {
      throw new HttpError(500, "Failed to update user position", error);
    }
  },
};
