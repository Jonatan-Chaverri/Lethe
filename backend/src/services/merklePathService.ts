import { hash } from "starknet";
import { HttpError } from "@/lib/httpError";
import { merkleLeavesDbService } from "@/services/db/merkleLeavesDbService";
import { merkleRootsDbService } from "@/services/db/merkleRootsDbService";
import { logger } from "@/lib/logger";

const TREE_DEPTH = 20;
const DOMAIN_LEAF = 1n;
const DOMAIN_NODE = 2n;
const U128_MASK = (1n << 128n) - 1n;

export interface MerklePathResult {
  commitment: string;
  leaf_index: number;
  path_elements: string[];
  path_indices: boolean[];
  root: string;
}

function toBigIntValue(value: string | number | bigint): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(value);
  return value.startsWith("0x") || value.startsWith("0X") ? BigInt(value) : BigInt(value);
}

function poseidonHash(elements: bigint[]): bigint {
  const result = hash.computePoseidonHashOnElements(elements.map((item) => item.toString()));
  return toBigIntValue(result);
}

function hashLeaf(commitment: bigint): bigint {
  const low = commitment & U128_MASK;
  const high = commitment >> 128n;
  return poseidonHash([DOMAIN_LEAF, low, high]);
}

function hashNode(left: bigint, right: bigint): bigint {
  return poseidonHash([DOMAIN_NODE, left, right]);
}

function buildZeroHashes(): bigint[] {
  const zeros: bigint[] = new Array(TREE_DEPTH);
  zeros[0] = hashLeaf(0n);
  for (let i = 1; i < TREE_DEPTH; i += 1) {
    zeros[i] = hashNode(zeros[i - 1], zeros[i - 1]);
  }
  return zeros;
}

export class MerklePathService {
  async buildPath(commitment: string, leafIndex: number): Promise<MerklePathResult> {
    if (!Number.isInteger(leafIndex) || leafIndex < 0) {
      throw new HttpError(400, "leaf_index must be a non-negative integer");
    }

    const leafByCommitment = await merkleLeavesDbService.findByCommitment(commitment);
    if (!leafByCommitment) {
      throw new HttpError(404, "Commitment not found");
    }

    const leafByIndex = await merkleLeavesDbService.findByLeafIndex(BigInt(leafIndex));
    if (!leafByIndex) {
      throw new HttpError(404, "leaf_index not found");
    }

    if (leafByIndex.commitment !== commitment) {
      throw new HttpError(400, "commitment does not match leaf_index");
    }

    const latestRoot = await merkleRootsDbService.findLatest();
    if (!latestRoot) {
      throw new HttpError(404, "No merkle roots found");
    }

    const leaves = await merkleLeavesDbService.findAllOrderedByLeafIndex();
    let levelHashes = new Map<bigint, bigint>();
    for (const leaf of leaves) {
      levelHashes.set(leaf.leaf_index, hashLeaf(toBigIntValue(leaf.commitment)));
    }

    const zeroHashes = buildZeroHashes();

    const pathElements: string[] = [];
    const pathIndices: boolean[] = [];
    let cursorIndex = BigInt(leafIndex);

    for (let level = 0; level < TREE_DEPTH; level += 1) {
      const siblingIndex = cursorIndex ^ 1n;
      const siblingHash = levelHashes.get(siblingIndex) ?? zeroHashes[level];
      pathElements.push(siblingHash.toString());
      pathIndices.push((cursorIndex & 1n) === 1n);

      const nextLevelHashes = new Map<bigint, bigint>();
      const parentIndices = new Set<bigint>();
      for (const index of levelHashes.keys()) {
        parentIndices.add(index >> 1n);
      }
      for (const parentIndex of parentIndices) {
        const left = levelHashes.get(parentIndex * 2n) ?? zeroHashes[level];
        const right = levelHashes.get(parentIndex * 2n + 1n) ?? zeroHashes[level];
        nextLevelHashes.set(parentIndex, hashNode(left, right));
      }
      levelHashes = nextLevelHashes;
      cursorIndex >>= 1n;
    }

    // Sanity-check: the generated witness path must reconstruct the latest stored root.
    let recomputed = hashLeaf(toBigIntValue(commitment));
    for (let level = 0; level < TREE_DEPTH; level += 1) {
      const sibling = toBigIntValue(pathElements[level]);
      const isRight = pathIndices[level];
      const left = isRight ? sibling : recomputed;
      const right = isRight ? recomputed : sibling;
      recomputed = hashNode(left, right);
    }
    if (recomputed.toString() !== toBigIntValue(latestRoot.root).toString()) {
      throw new HttpError(409, "Merkle path reconstruction mismatch with latest root");
    }

    return {
      commitment,
      leaf_index: leafIndex,
      path_elements: pathElements,
      path_indices: pathIndices,
      root: latestRoot.root,
    };
  }
}
