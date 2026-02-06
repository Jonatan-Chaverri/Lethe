import { prisma } from "../../db/prisma.js";
import { HttpError } from "../../lib/httpError.js";

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  wallet: true,
  created_at: true,
  wallet_provider: true,
};

export const usersDbService = {
  async findByWallet(wallet) {
    try {
      return await prisma.user.findUnique({
        where: { wallet },
        select: USER_SELECT,
      });
    } catch (error) {
      throw new HttpError(500, "Failed to query user by wallet", error);
    }
  },

  async findById(id) {
    try {
      return await prisma.user.findUnique({
        where: { id },
        select: USER_SELECT,
      });
    } catch (error) {
      throw new HttpError(500, "Failed to query user by id", error);
    }
  },

  async createUser({ wallet, walletProvider, name, email }) {
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

  async updateWalletProvider(id, walletProvider) {
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
