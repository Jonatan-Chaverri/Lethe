import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { logger } from "@/lib/logger";
import { getZKHonkCallData, init } from "garaga";

const DEFAULT_DEPOSIT_VK_PATH =
  process.env.DEPOSIT_VK_PATH ||
  resolve(process.cwd(), "./src/lib/Garaga/deposit/vk");
let garagaInitPromise: Promise<unknown> | null = null;

async function ensureGaragaReady(): Promise<void> {
  if (!garagaInitPromise) {
    garagaInitPromise = Promise.resolve(init());
  }
  await garagaInitPromise;
}

function hexToBytes(hex: string): Buffer {
  const normalized = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (normalized.length === 0) return Buffer.alloc(0);
  if (normalized.length % 2 !== 0) {
    throw new Error("Invalid hex string length");
  }
  return Buffer.from(normalized, "hex");
}

function publicInputTo32Bytes(value: string): Buffer {
  if (value.startsWith("0x")) {
    const bytes = hexToBytes(value);
    if (bytes.length > 32) {
      throw new Error("Public input felt exceeds 32 bytes");
    }
    if (bytes.length === 32) {
      return bytes;
    }
    const out = Buffer.alloc(32);
    bytes.copy(out, 32 - bytes.length);
    return out;
  }

  const asBigInt = BigInt(value);
  if (asBigInt < 0n) {
    throw new Error("Public input felt cannot be negative");
  }

  const out = Buffer.alloc(32);
  let remaining = asBigInt;
  for (let i = 31; i >= 0; i -= 1) {
    out[i] = Number(remaining & 0xffn);
    remaining >>= 8n;
  }
  if (remaining !== 0n) {
    throw new Error("Public input felt exceeds 32 bytes");
  }
  return out;
}

function normalizeCalldata(raw: unknown): string[] {
  const asArray = Array.isArray(raw)
    ? raw
    : raw &&
        typeof raw === "object" &&
        "calldata" in (raw as Record<string, unknown>) &&
        Array.isArray((raw as { calldata: unknown[] }).calldata)
      ? (raw as { calldata: unknown[] }).calldata
      : null;

  if (!asArray) {
    throw new Error("Garaga npm returned an unsupported calldata shape");
  }

  const normalized = asArray.map((value) => {
    if (typeof value === "string") return value;
    if (typeof value === "bigint") return value.toString();
    if (typeof value === "number") return Math.trunc(value).toString();
    throw new Error("Garaga npm calldata contains unsupported element type");
  });
  if (normalized.length === 0) {
    throw new Error("Garaga npm returned empty calldata");
  }
  return normalized;
}

export async function proofToDepositCalldata(
  proofHex: string,
  publicInputs: string[]
): Promise<string[]> {
  if (!proofHex || typeof proofHex !== "string") {
    throw new Error("Missing or invalid proof hex");
  }

  if (!Array.isArray(publicInputs) || publicInputs.length === 0) {
    throw new Error("Missing or invalid public inputs");
  }

  const vkPath = DEFAULT_DEPOSIT_VK_PATH;
  const proofBytes = hexToBytes(proofHex);
  const vkBytes = readFileSync(vkPath);
  const publicInputsBytes = Buffer.concat(publicInputs.map(publicInputTo32Bytes));

  logger.info(
    `Using Garaga npm API with VK path: ${vkPath} (proof_bytes=${proofBytes.length}, public_inputs=${publicInputs.length}, public_input_bytes=${publicInputsBytes.length})`
  );

  if (proofBytes.length % 32 !== 0) {
    throw new Error(
      `Failed to convert proof to verifier calldata: proof byte length (${proofBytes.length}) is not a multiple of 32`
    );
  }

  try {
    await ensureGaragaReady();
    const value = await getZKHonkCallData(proofBytes, publicInputsBytes, vkBytes);
    return normalizeCalldata(value);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("AssertionError: 508 == 508 == 258")) {
      throw new Error(
        "Failed to convert proof to verifier calldata: received an EVM-formatted UltraHonk proof. " +
          "Generate the proof with bb.js UltraHonk `keccakZK`/`starknetZK` options so Garaga can parse it."
      );
    }
    if (message.includes("is not on the curve")) {
      throw new Error(
        `Failed to convert proof to verifier calldata: ${message}. ` +
          `This usually means proof and VK are not from the same proof format/toolchain. ` +
          `Generate proof with bb.js UltraHonk using keccakZK/starknetZK options, and regenerate/copy VK with the same bb version.`
      );
    }
    throw new Error(`Failed to convert proof to verifier calldata: ${message}`);
  }
}
