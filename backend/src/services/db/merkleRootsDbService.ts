import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { HttpError } from "../../lib/httpError";

const MERKLE_ROOT_SELECT = {
  id: true,
  root: true,
  block_number: true,
  tx_hash: true,
  created_at: true,
} satisfies Prisma.MerkleRootSelect;

export type DbMerkleRoot = Prisma.MerkleRootGetPayload<{
  select: typeof MERKLE_ROOT_SELECT;
}>;

interface CreateMerkleRootInput {
  root: string;
  blockNumber: bigint;
  txHash: string;
}

export const merkleRootsDbService = {
  async create(input: CreateMerkleRootInput): Promise<DbMerkleRoot> {
    try {
      return await prisma.merkleRoot.create({
        data: {
          root: input.root,
          block_number: input.blockNumber,
          tx_hash: input.txHash,
        },
        select: MERKLE_ROOT_SELECT,
      });
    } catch (error) {
      throw new HttpError(500, "Failed to create merkle root", error);
    }
  },

  async findById(id: string): Promise<DbMerkleRoot | null> {
    try {
      return await prisma.merkleRoot.findUnique({
        where: { id },
        select: MERKLE_ROOT_SELECT,
      });
    } catch (error) {
      throw new HttpError(500, "Failed to query merkle root by id", error);
    }
  },

  async findByRoot(root: string): Promise<DbMerkleRoot | null> {
    try {
      return await prisma.merkleRoot.findFirst({
        where: { root },
        select: MERKLE_ROOT_SELECT,
      });
    } catch (error) {
      throw new HttpError(500, "Failed to query merkle root by root", error);
    }
  },

  async findByBlockNumber(blockNumber: bigint): Promise<DbMerkleRoot | null> {
    try {
      return await prisma.merkleRoot.findFirst({
        where: { block_number: blockNumber },
        select: MERKLE_ROOT_SELECT,
      });
    } catch (error) {
      throw new HttpError(500, "Failed to query merkle root by block number", error);
    }
  },

  async findMany(limit = 100, offset = 0): Promise<DbMerkleRoot[]> {
    try {
      return await prisma.merkleRoot.findMany({
        select: MERKLE_ROOT_SELECT,
        orderBy: { block_number: "desc" },
        take: limit,
        skip: offset,
      });
    } catch (error) {
      throw new HttpError(500, "Failed to query merkle roots", error);
    }
  },

  async findLatest(): Promise<DbMerkleRoot | null> {
    try {
      return await prisma.merkleRoot.findFirst({
        select: MERKLE_ROOT_SELECT,
        orderBy: { block_number: "desc" },
      });
    } catch (error) {
      throw new HttpError(500, "Failed to query latest merkle root", error);
    }
  },

  async count(): Promise<number> {
    try {
      return await prisma.merkleRoot.count();
    } catch (error) {
      throw new HttpError(500, "Failed to count merkle roots", error);
    }
  },
};
