"use client";

import { Noir, type CompiledCircuit } from "@noir-lang/noir_js";

type CircuitKind = "deposit" | "withdraw";

type DepositInputs = {
  secret: string;
  nullifier: string;
  k_units: number;
};

type WithdrawInputs = {
  secret: string;
  nullifier: string;
  path_elements: string[];
  path_indices: boolean[];
  new_secret: string;
  new_nullifier: string;
  root: string;
  nullifier_hash: string;
  k_units: number;
  w_units: number;
};

export type WithdrawMerklePath = {
  path_elements: string[];
  path_indices: boolean[];
  root: string;
};

function toHex(data: Uint8Array): string {
  return `0x${Array.from(data)
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")}`;
}

export interface CircuitProofResult {
  circuit: CircuitKind;
  proofHex: string;
  publicInputs: string[];
  verified: boolean;
  inputs: DepositInputs | WithdrawInputs;
  depositNote?: CreatedDepositNote;
  withdrawNote?: CreatedDepositNote;
}

export interface CreatedDepositNote {
  commitment: string;
  k_units: string;
  secret: string;
  nullifier: string;
  leaf_index: number;
}

const artifactCache: Partial<Record<CircuitKind, Promise<CompiledCircuit>>> = {};
type BbModule = {
  Barretenberg: {
    new: (options?: { threads?: number }) => Promise<any>;
  };
  UltraHonkBackend: new (
    acirBytecode: string,
    backendOptions?: { threads?: number },
    circuitOptions?: { recursive?: boolean }
  ) => any;
};
let bbModulePromise: Promise<BbModule> | null = null;
let bbApiPromise: Promise<any> | null = null;

async function loadArtifact(circuit: CircuitKind): Promise<CompiledCircuit> {
  if (!artifactCache[circuit]) {
    artifactCache[circuit] = fetch(`/noir/${circuit}.json`).then(async (response) => {
      if (!response.ok) {
        throw new Error(`Failed to load ${circuit} artifact`);
      }
      return (await response.json()) as CompiledCircuit;
    });
  }
  return artifactCache[circuit] as Promise<CompiledCircuit>;
}

async function ensureBufferPolyfills() {
  const writeBigUInt64BE = function writeBigUInt64BE(this: Uint8Array, value: bigint, offset = 0) {
    let remaining = BigInt(value);
    for (let i = 7; i >= 0; i -= 1) {
      this[offset + i] = Number(remaining & BigInt(0xff));
      remaining >>= BigInt(8);
    }
    return offset + 8;
  };

  const readBigUInt64BE = function readBigUInt64BE(this: Uint8Array, offset = 0) {
    let value = BigInt(0);
    for (let i = 0; i < 8; i += 1) {
      value = (value << BigInt(8)) + BigInt(this[offset + i] ?? 0);
    }
    return value;
  };

  const globalObj = globalThis as unknown as {
    Buffer?: {
      prototype: {
        writeBigUInt64BE?: (value: bigint, offset?: number) => number;
        readBigUInt64BE?: (offset?: number) => bigint;
      };
    };
  };

  if (!globalObj.Buffer) {
    const bufferModule = await import("buffer");
    (globalThis as unknown as { Buffer: typeof bufferModule.Buffer }).Buffer = bufferModule.Buffer;
  }

  const bufferProto = (globalThis as unknown as { Buffer: { prototype: any } }).Buffer.prototype;
  if (typeof bufferProto.writeBigUInt64BE !== "function") {
    bufferProto.writeBigUInt64BE = writeBigUInt64BE;
  }

  if (typeof bufferProto.readBigUInt64BE !== "function") {
    bufferProto.readBigUInt64BE = readBigUInt64BE;
  }

  const uint8Proto = Uint8Array.prototype as Uint8Array & {
    writeBigUInt64BE?: (value: bigint, offset?: number) => number;
    readBigUInt64BE?: (offset?: number) => bigint;
  };

  if (typeof uint8Proto.writeBigUInt64BE !== "function") {
    uint8Proto.writeBigUInt64BE = writeBigUInt64BE;
  }

  if (typeof uint8Proto.readBigUInt64BE !== "function") {
    uint8Proto.readBigUInt64BE = readBigUInt64BE;
  }
}

async function getBbModule(): Promise<BbModule> {
  if (!bbModulePromise) {
    bbModulePromise = (async () => {
      await ensureBufferPolyfills();
      return (await import("@aztec/bb.js")) as unknown as BbModule;
    })();
  }
  return bbModulePromise;
}

async function getBbApi(): Promise<any> {
  if (!bbApiPromise) {
    bbApiPromise = (async () => {
      const { Barretenberg } = await getBbModule();
      return Barretenberg.new({ threads: 1 });
    })();
  }
  return bbApiPromise;
}

function randomFieldString(): string {
  const rand = crypto.getRandomValues(new Uint32Array(3));
  const value =
    (BigInt(rand[0]) << BigInt(64)) +
    (BigInt(rand[1]) << BigInt(32)) +
    BigInt(rand[2]) +
    BigInt(1);
  return value.toString();
}

function toHexQuantity(value: number): string {
  return `0x${Math.max(0, Math.trunc(value)).toString(16)}`;
}

function parseKUnits(value: string): number {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return 0;
  if (trimmed.startsWith("0x")) return Number.parseInt(trimmed, 16);
  return Number.parseInt(trimmed, 10);
}

async function pedersenHash(
  api: Awaited<ReturnType<BbModule["Barretenberg"]["new"]>>,
  values: bigint[]
): Promise<bigint> {
  const toFr = (value: bigint): Uint8Array => {
    const out = new Uint8Array(32);
    let remaining = value >= BigInt(0) ? value : BigInt(0);
    for (let i = 31; i >= 0; i -= 1) {
      out[i] = Number(remaining & BigInt(0xff));
      remaining >>= BigInt(8);
    }
    return out;
  };

  const output = await api.pedersenHash({
    inputs: values.map(toFr),
    hashIndex: 0,
  });

  let parsed = BigInt(0);
  for (const byte of output.hash as Uint8Array) {
    parsed = (parsed << BigInt(8)) + BigInt(byte);
  }
  return parsed;
}

async function buildWithdrawInputsForUnits(
  note: CreatedDepositNote,
  path: WithdrawMerklePath,
  withdrawUnits: number
): Promise<WithdrawInputs> {
  if (!note) {
    throw new Error("Missing note for withdraw proof");
  }
  const secret = BigInt(note.secret);
  const nullifier = BigInt(note.nullifier);
  const kUnits = parseKUnits(note.k_units);
  if (!Number.isInteger(withdrawUnits) || withdrawUnits <= 0) {
    throw new Error("Withdraw units must be a positive integer.");
  }
  if (withdrawUnits > kUnits) {
    throw new Error("Withdraw units cannot exceed note units.");
  }
  const newSecret = BigInt(randomFieldString());
  const newNullifier = BigInt(randomFieldString());
  const api = await getBbApi();
  const nullifierHash = await pedersenHash(api, [nullifier]);

  return {
    secret: secret.toString(),
    nullifier: nullifier.toString(),
    path_elements: path.path_elements,
    path_indices: path.path_indices,
    new_secret: newSecret.toString(),
    new_nullifier: newNullifier.toString(),
    root: path.root,
    nullifier_hash: nullifierHash.toString(),
    k_units: kUnits,
    w_units: withdrawUnits,
  };
}

async function prove(circuit: CircuitKind, inputs: DepositInputs | WithdrawInputs): Promise<CircuitProofResult> {
  const artifact = await loadArtifact(circuit);
  const noir = new Noir(artifact);
  const { UltraHonkBackend } = await getBbModule();
  const backend = new UltraHonkBackend(artifact.bytecode, { threads: 1 });
  const honkOptions = { keccakZK: true };

  const { witness } = await noir.execute(inputs);
  const proofData = await backend.generateProof(witness, honkOptions);
  const verified = await backend.verifyProof(proofData, honkOptions);
  return {
    circuit,
    proofHex: toHex(proofData.proof),
    publicInputs: proofData.publicInputs,
    verified,
    inputs,
  };
}

/** WBTC uses 8 decimals: amount in BTC × 10^8 = integer units (no floating point). */
export const WBTC_UNITS_PER_BTC = 100_000_000;

export async function generateDepositProof(amountUnits: number): Promise<CircuitProofResult> {
  const secret = randomFieldString();
  const nullifier = randomFieldString();
  const inputs: DepositInputs = {
    secret,
    nullifier,
    k_units: amountUnits,
  };

  const api = await getBbApi();
  const commitment = await pedersenHash(api, [BigInt(0), BigInt(secret), BigInt(nullifier), BigInt(amountUnits)]);
  const proofResult = await prove("deposit", inputs);

  return {
    ...proofResult,
    depositNote: {
      commitment: commitment.toString(),
      k_units: toHexQuantity(amountUnits),
      secret,
      nullifier,
      leaf_index: -1,
    },
  };
}

export async function generateWithdrawProof(
  note: CreatedDepositNote,
  path: WithdrawMerklePath,
  withdrawUnits: number
): Promise<CircuitProofResult> {
  const inputs = await buildWithdrawInputsForUnits(note, path, withdrawUnits);
  const proofResult = await prove("withdraw", inputs);

  const remainingUnits = inputs.k_units - inputs.w_units;
  const api = await getBbApi();
  const newCommitment = await pedersenHash(
    api, 
    [BigInt(0), BigInt(inputs.new_secret), BigInt(inputs.new_nullifier), BigInt(remainingUnits)]
  );
  return {
    ...proofResult,
    withdrawNote:
      remainingUnits > 0
        ? {
            commitment: newCommitment.toString(),
            k_units: remainingUnits.toString(),
            secret: inputs.new_secret,
            nullifier: inputs.new_nullifier,
            leaf_index: -1,
          }
        : undefined,
  };
}
