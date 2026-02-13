import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { HttpError } from "../../lib/httpError";

const SHARE_PRICE_SELECT = {
  id: true,
  price_per_k_unit: true,
  created_at: true,
} satisfies Prisma.SharePriceSelect;

export type DbSharePrice = Prisma.SharePriceGetPayload<{
  select: typeof SHARE_PRICE_SELECT;
}>;

interface InsertSharePriceInput {
  pricePerKUnit: number | string | Prisma.Decimal;
}

export const sharePriceDbService = {
  async insert(input: InsertSharePriceInput): Promise<DbSharePrice> {
    try {
      return await prisma.sharePrice.create({
        data: {
          price_per_k_unit: input.pricePerKUnit,
        },
        select: SHARE_PRICE_SELECT,
      });
    } catch (error) {
      throw new HttpError(500, "Failed to insert share price", error);
    }
  },

  async getLatest(): Promise<DbSharePrice | null> {
    try {
      return await prisma.sharePrice.findFirst({
        orderBy: { created_at: "desc" },
        select: SHARE_PRICE_SELECT,
      });
    } catch (error) {
      throw new HttpError(500, "Failed to get latest share price", error);
    }
  },

  async findByTimeRange(from: Date, to: Date): Promise<DbSharePrice[]> {
    try {
      return await prisma.sharePrice.findMany({
        where: {
          created_at: {
            gte: from,
            lte: to,
          },
        },
        orderBy: { created_at: "asc" },
        select: SHARE_PRICE_SELECT,
      });
    } catch (error) {
      throw new HttpError(500, "Failed to query share prices by time range", error);
    }
  },
};
