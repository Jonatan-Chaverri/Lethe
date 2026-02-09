"use client";

export interface LetheNote {
  commitment: string;
  k_units: string;
  secret: string;
  nullifier: string;
  leaf_index: number;
}

export interface LetheNotesPayload {
  version: 1;
  network: string;
  notes: LetheNote[];
}

type EncryptedNotesFile = {
  version: 1;
  network: string;
  kdf: {
    name: "PBKDF2";
    hash: "SHA-256";
    iterations: number;
    salt_b64: string;
  };
  cipher: {
    name: "AES-GCM";
    iv_b64: string;
  };
  ciphertext_b64: string;
};

const KDF_ITERATIONS = 210_000;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const DOWNLOAD_FILENAME = "lethe-notes.json.enc";

function utf8ToBytes(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function bytesToUtf8(value: Uint8Array): string {
  return new TextDecoder().decode(value);
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const value of bytes) {
    binary += String.fromCharCode(value);
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return Uint8Array.from(bytes).buffer;
}

function validateNotesPayload(data: unknown): LetheNotesPayload {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid notes payload");
  }

  const parsed = data as Partial<LetheNotesPayload>;
  if (parsed.version !== 1) {
    throw new Error("Unsupported notes version");
  }
  if (typeof parsed.network !== "string" || !parsed.network) {
    throw new Error("Invalid notes network");
  }
  if (!Array.isArray(parsed.notes)) {
    throw new Error("Invalid notes list");
  }

  for (const note of parsed.notes) {
    if (!note || typeof note !== "object") {
      throw new Error("Invalid note entry");
    }
    const item = note as Partial<LetheNote>;
    const hasValidFields =
      typeof item.commitment === "string" &&
      typeof item.k_units === "string" &&
      typeof item.secret === "string" &&
      typeof item.nullifier === "string" &&
      typeof item.leaf_index === "number";
    if (!hasValidFields) {
      throw new Error("Invalid note fields");
    }
  }

  return parsed as LetheNotesPayload;
}

async function deriveAesKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(utf8ToBytes(password)),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: toArrayBuffer(salt),
      iterations: KDF_ITERATIONS,
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export function getStarknetNetworkName(): string {
  return process.env.NEXT_PUBLIC_STARKNET_NETWORK === "mainnet" ? "starknet-mainnet" : "starknet-sepolia";
}

export function mergeNotes(current: LetheNote[], incoming: LetheNote[]): LetheNote[] {
  const byCommitment = new Map<string, LetheNote>();
  for (const note of [...current, ...incoming]) {
    byCommitment.set(note.commitment, note);
  }
  return Array.from(byCommitment.values());
}

export async function encryptNotesPayload(payload: LetheNotesPayload, password: string): Promise<string> {
  if (!password.trim()) {
    throw new Error("Password is required");
  }
  const validated = validateNotesPayload(payload);
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await deriveAesKey(password, salt);
  const plaintext = utf8ToBytes(JSON.stringify(validated));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(plaintext)
  );

  const fileBody: EncryptedNotesFile = {
    version: 1,
    network: validated.network,
    kdf: {
      name: "PBKDF2",
      hash: "SHA-256",
      iterations: KDF_ITERATIONS,
      salt_b64: bytesToBase64(salt),
    },
    cipher: {
      name: "AES-GCM",
      iv_b64: bytesToBase64(iv),
    },
    ciphertext_b64: bytesToBase64(new Uint8Array(encrypted)),
  };

  return JSON.stringify(fileBody, null, 2);
}

export async function decryptNotesContent(content: string, password: string): Promise<LetheNotesPayload> {
  if (!password.trim()) {
    throw new Error("Password is required");
  }
  const parsed = JSON.parse(content) as Partial<EncryptedNotesFile>;
  if (
    parsed.version !== 1 ||
    parsed.kdf?.name !== "PBKDF2" ||
    parsed.kdf?.hash !== "SHA-256" ||
    parsed.cipher?.name !== "AES-GCM" ||
    !parsed.kdf.salt_b64 ||
    !parsed.cipher.iv_b64 ||
    !parsed.ciphertext_b64
  ) {
    throw new Error("Invalid encrypted notes file");
  }

  const salt = base64ToBytes(parsed.kdf.salt_b64);
  const iv = base64ToBytes(parsed.cipher.iv_b64);
  const ciphertext = base64ToBytes(parsed.ciphertext_b64);
  const key = await deriveAesKey(password, salt);

  let plaintext: ArrayBuffer;
  try {
    plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: toArrayBuffer(iv) },
      key,
      toArrayBuffer(ciphertext)
    );
  } catch {
    throw new Error("Invalid password or corrupted file");
  }

  const payload = JSON.parse(bytesToUtf8(new Uint8Array(plaintext)));
  return validateNotesPayload(payload);
}

export async function downloadEncryptedNotes(payload: LetheNotesPayload, password: string): Promise<void> {
  const encryptedContent = await encryptNotesPayload(payload, password);
  const blob = new Blob([encryptedContent], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = DOWNLOAD_FILENAME;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
