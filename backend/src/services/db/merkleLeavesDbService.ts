import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { HttpError } from "../../lib/httpError";
import { logger } from "@/lib/logger";

const MERKLE_LEAF_SELECT = {
  id: true,
  commitment: true,
  leaf_index: true,
  inserted_root: true,
  tx_hash: true,
  block_number: true,
  created_at: true,
} satisfies Prisma.MerkleLeafSelect;

export type DbMerkleLeaf = Prisma.MerkleLeafGetPayload<{
  select: typeof MERKLE_LEAF_SELECT;
}>;

interface CreateMerkleLeafInput {
  commitment: string;
  leafIndex: bigint;
  insertedRoot: string;
  txHash: string;
  blockNumber: bigint;
}

export const merkleLeavesDbService = {
  async create(input: CreateMerkleLeafInput): Promise<DbMerkleLeaf> {
    try {
      return await prisma.merkleLeaf.create({
        data: {
          commitment: input.commitment,
          leaf_index: input.leafIndex,
          inserted_root: input.insertedRoot,
          tx_hash: input.txHash,
          block_number: input.blockNumber,
        },
        select: MERKLE_LEAF_SELECT,
      });
    } catch (error) {
      throw new HttpError(500, "Failed to create merkle leaf", error);
    }
  },

  async getLatestBlockNumber(defaultBlockNumber: bigint): Promise<bigint> {
    try {
      const latest = await prisma.merkleLeaf.findFirst({
        orderBy: { block_number: "desc" },
        select: { block_number: true },
      });
      if (!latest) {
        return BigInt(0);
      }
      return latest.block_number;
    } catch (error) {
      logger.error(`Failed to get latest block number: ${error}`);
      return defaultBlockNumber;
    }
  },

  async findById(id: string): Promise<DbMerkleLeaf | null> {
    try {
      return await prisma.merkleLeaf.findUnique({
        where: { id },
        select: MERKLE_LEAF_SELECT,
      });
    } catch (error) {
      throw new HttpError(500, "Failed to query merkle leaf by id", error);
    }
  },

  async findByCommitment(commitment: string): Promise<DbMerkleLeaf | null> {
    try {
      return await prisma.merkleLeaf.findFirst({
        where: { commitment },
        select: MERKLE_LEAF_SELECT,
      });
    } catch (error) {
      throw new HttpError(500, "Failed to query merkle leaf by commitment", error);
    }
  },

  async findByLeafIndex(leafIndex: bigint): Promise<DbMerkleLeaf | null> {
    try {
      return await prisma.merkleLeaf.findFirst({
        where: { leaf_index: leafIndex },
        select: MERKLE_LEAF_SELECT,
      });
    } catch (error) {
      throw new HttpError(500, "Failed to query merkle leaf by leaf index", error);
    }
  },

  async findByInsertedRoot(insertedRoot: string): Promise<DbMerkleLeaf[]> {
    try {
      return await prisma.merkleLeaf.findMany({
        where: { inserted_root: insertedRoot },
        select: MERKLE_LEAF_SELECT,
        orderBy: { leaf_index: "asc" },
      });
    } catch (error) {
      throw new HttpError(500, "Failed to query merkle leaves by inserted root", error);
    }
  },

  async findLatestByBlockNumber(blockNumber: bigint): Promise<DbMerkleLeaf[]> {
    try {
      return await prisma.merkleLeaf.findMany({
        where: { block_number: blockNumber },
        select: MERKLE_LEAF_SELECT,
        orderBy: { leaf_index: "asc" },
      });
    } catch (error) {
      throw new HttpError(500, "Failed to query merkle leaves by block number", error);
    }
  },

  async findMany(limit = 100, offset = 0): Promise<DbMerkleLeaf[]> {
    try {
      return await prisma.merkleLeaf.findMany({
        select: MERKLE_LEAF_SELECT,
        orderBy: { block_number: "desc" },
        take: limit,
        skip: offset,
      });
    } catch (error) {
      throw new HttpError(500, "Failed to query merkle leaves", error);
    }
  },

  async findAllOrderedByLeafIndex(): Promise<DbMerkleLeaf[]> {
    try {
      return await prisma.merkleLeaf.findMany({
        select: MERKLE_LEAF_SELECT,
        orderBy: { leaf_index: "asc" },
      });
    } catch (error) {
      throw new HttpError(500, "Failed to query all merkle leaves ordered by index", error);
    }
  },

  async count(): Promise<number> {
    try {
      return await prisma.merkleLeaf.count();
    } catch (error) {
      throw new HttpError(500, "Failed to count merkle leaves", error);
    }
  },
};
