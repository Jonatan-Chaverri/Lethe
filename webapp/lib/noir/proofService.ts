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
}

const artifactCache: Partial<Record<CircuitKind, Promise<CompiledCircuit>>> = {};
type BbModule = {
  Barretenberg: {
    new: (options?: { threads?: number }) => Promise<any>;
  };
  UltraHonkBackend: new (acirBytecode: string, api: any) => any;
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

async function buildWithdrawInputs(): Promise<WithdrawInputs> {
  const secret = BigInt(1111);
  const nullifier = BigInt(2222);
  const kUnits = 10;
  const wUnits = 4;
  const newSecret = BigInt(3333);
  const newNullifier = BigInt(4444);
  const depth = 20;

  const pathElements = Array.from({ length: depth }, (_, i) => BigInt(i + 123));
  const pathIndices = Array.from({ length: depth }, (_, i) => i % 2 === 1);

  const api = await getBbApi();

  const commitment = await pedersenHash(api, [BigInt(0), secret, nullifier, BigInt(kUnits)]);
  let hash = await pedersenHash(api, [BigInt(1), commitment]);

  for (let i = 0; i < depth; i += 1) {
    const sibling = pathElements[i];
    const isRight = pathIndices[i];
    const left = isRight ? sibling : hash;
    const right = isRight ? hash : sibling;
    hash = await pedersenHash(api, [BigInt(2), left, right]);
  }

  const root = hash;
  const nullifierHash = await pedersenHash(api, [nullifier]);

  return {
    secret: secret.toString(),
    nullifier: nullifier.toString(),
    path_elements: pathElements.map((item) => item.toString()),
    path_indices: pathIndices,
    new_secret: newSecret.toString(),
    new_nullifier: newNullifier.toString(),
    root: root.toString(),
    nullifier_hash: nullifierHash.toString(),
    k_units: kUnits,
    w_units: wUnits,
  };
}

async function prove(circuit: CircuitKind, inputs: DepositInputs | WithdrawInputs): Promise<CircuitProofResult> {
  const artifact = await loadArtifact(circuit);
  const noir = new Noir(artifact);
  const api = await getBbApi();
  const { UltraHonkBackend } = await getBbModule();
  const backend = new UltraHonkBackend(artifact.bytecode, api);

  const { witness } = await noir.execute(inputs);
  const proofData = await backend.generateProof(witness);
  const verified = await backend.verifyProof(proofData);

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
  const inputs: DepositInputs = {
    secret: randomFieldString(),
    nullifier: randomFieldString(),
    k_units: amountUnits,
  };

  return prove("deposit", inputs);
}

export async function generateWithdrawProof(): Promise<CircuitProofResult> {
  const inputs = await buildWithdrawInputs();
  return prove("withdraw", inputs);
}
