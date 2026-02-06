import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { HttpError } from "../../lib/httpError";

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  wallet: true,
  created_at: true,
  wallet_provider: true,
} satisfies Prisma.UserSelect;

export type DbUser = Prisma.UserGetPayload<{ select: typeof USER_SELECT }>;

interface CreateUserInput {
  wallet: string;
  walletProvider: string;
  name?: string;
  email?: string;
}

export const usersDbService = {
  async findByWallet(wallet: string): Promise<DbUser | null> {
    try {
      return await prisma.user.findUnique({
        where: { wallet },
        select: USER_SELECT,
      });
    } catch (error) {
      throw new HttpError(500, "Failed to query user by wallet", error);
    }
  },

  async findById(id: string): Promise<DbUser | null> {
    try {
      return await prisma.user.findUnique({
        where: { id },
        select: USER_SELECT,
      });
    } catch (error) {
      throw new HttpError(500, "Failed to query user by id", error);
    }
  },

  async createUser({ wallet, walletProvider, name, email }: CreateUserInput): Promise<DbUser> {
    try {
      return await prisma.user.create({
        data: {
          wallet,
          wallet_provider: walletProvider,
          name: name || null,
          email: email || null,
        },
        select: USER_SELECT,
      });
    } catch (error) {
      throw new HttpError(500, "Failed to create user", error);
    }
  },

  async updateWalletProvider(id: string, walletProvider: string): Promise<DbUser> {
    try {
      return await prisma.user.update({
        where: { id },
        data: { wallet_provider: walletProvider },
        select: USER_SELECT,
      });
    } catch (error) {
      throw new HttpError(500, "Failed to update user provider", error);
    }
  },
};
