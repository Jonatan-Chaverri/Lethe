"use client";

import {
  decryptNotesContent,
  encryptNotesPayload,
  getStarknetNetworkName,
  type LetheNote,
  type LetheNotesPayload,
} from "@/lib/notes/secureNotes";

const HANDLE_DB_NAME = "lethe-notes-db";
const HANDLE_STORE_NAME = "settings";
const HANDLE_KEY = "notesFileHandle";
const PASSWORD_STORAGE_KEY = "letheNotesPassword";
const NOTES_FILE_NAME = "lethe-notes.json.enc";

export type NotesFileHandle = {
  mode?: "fs-access" | "download";
  name?: string;
  getFile?: () => Promise<File>;
  createWritable?: () => Promise<{
    write: (content: string) => Promise<void>;
    close: () => Promise<void>;
  }>;
  queryPermission?: (opts: { mode: "read" | "readwrite" }) => Promise<"granted" | "denied" | "prompt">;
  requestPermission?: (opts: { mode: "read" | "readwrite" }) => Promise<"granted" | "denied" | "prompt">;
};

async function openHandleDb(): Promise<IDBDatabase> {
  return await new Promise((resolve, reject) => {
    const request = indexedDB.open(HANDLE_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(HANDLE_STORE_NAME)) {
        db.createObjectStore(HANDLE_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getStoredNotesFileHandle(): Promise<NotesFileHandle | null> {
  try {
    const db = await openHandleDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(HANDLE_STORE_NAME, "readonly");
      const store = tx.objectStore(HANDLE_STORE_NAME);
      const req = store.get(HANDLE_KEY);
      req.onsuccess = () => resolve((req.result as NotesFileHandle | undefined) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function setStoredNotesFileHandle(handle: NotesFileHandle): Promise<void> {
  try {
    const db = await openHandleDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(HANDLE_STORE_NAME, "readwrite");
      const store = tx.objectStore(HANDLE_STORE_NAME);
      const req = store.put(handle, HANDLE_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Ignore persistence failures.
  }
}

export async function clearStoredNotesFileHandle(): Promise<void> {
  try {
    const db = await openHandleDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(HANDLE_STORE_NAME, "readwrite");
      const store = tx.objectStore(HANDLE_STORE_NAME);
      const req = store.delete(HANDLE_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Ignore cleanup failures.
  }
}

export function getStoredNotesPassword(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(PASSWORD_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setStoredNotesPassword(password: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PASSWORD_STORAGE_KEY, password);
  } catch {
    // Ignore storage failures.
  }
}

export function isMissingNotesFileError(error: unknown): boolean {
  if (!error) return false;
  const maybeName = (error as { name?: string }).name;
  if (maybeName === "NotFoundError") return true;
  const message = (error as { message?: string }).message?.toLowerCase() ?? "";
  return message.includes("requested file or directory could not be found");
}

export async function ensureNotesFilePermission(
  handle: NotesFileHandle,
  mode: "read" | "readwrite",
  allowPrompt: boolean
): Promise<boolean> {
  if (!handle.queryPermission || !handle.requestPermission) return true;
  const query = await handle.queryPermission({ mode });
  if (query === "granted") return true;
  if (!allowPrompt) return false;
  const request = await handle.requestPermission({ mode });
  return request === "granted";
}

export async function pickNewNotesFileHandle(): Promise<NotesFileHandle> {
  const picker = (window as any).showSaveFilePicker as
    | ((options: Record<string, unknown>) => Promise<NotesFileHandle>)
    | undefined;
  if (!picker) {
    return {
      mode: "download",
      name: NOTES_FILE_NAME,
    };
  }
  const handle = await picker({
    suggestedName: NOTES_FILE_NAME,
    types: [{ description: "Encrypted Lethe notes", accept: { "application/json": [".enc", ".json.enc"] } }],
  });
  (handle as NotesFileHandle).mode = "fs-access";
  return handle;
}

async function pickNotesFileViaInput(): Promise<File | null> {
  return await new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".enc,.json.enc,application/json";
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.click();
  });
}

export async function pickExistingNotesFileHandle(): Promise<NotesFileHandle | null> {
  const picker = (window as any).showOpenFilePicker as
    | ((options: Record<string, unknown>) => Promise<NotesFileHandle[]>)
    | undefined;
  if (!picker) {
    const selected = await pickNotesFileViaInput();
    if (!selected) return null;
    return {
      mode: "download",
      name: selected.name,
      getFile: async () => selected,
    };
  }
  const [handle] = await picker({
    multiple: false,
    types: [{ description: "Encrypted Lethe notes", accept: { "application/json": [".enc", ".json.enc"] } }],
  });
  if (!handle) return null;
  (handle as NotesFileHandle).mode = "fs-access";
  return handle;
}

function triggerNotesDownload(content: string, fileName: string): void {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export async function readNotesFromHandle(
  handle: NotesFileHandle,
  password: string,
  allowPromptPermission: boolean
): Promise<{ payload: LetheNotesPayload; fileName: string }> {
  const normalizedPassword = password.trim();
  if (!normalizedPassword) {
    throw new Error("Password is required.");
  }
  const allowed = await ensureNotesFilePermission(handle, "readwrite", allowPromptPermission);
  if (!allowed) {
    throw new Error("No read/write permission for the selected notes file.");
  }
  if (!handle.getFile) {
    throw new Error("Current notes file handle is invalid.");
  }

  const file = await handle.getFile();
  const fileText = await file.text();
  if (!fileText.trim()) {
    return {
      payload: { version: 1, network: getStarknetNetworkName(), notes: [] },
      fileName: handle.name ?? file.name,
    };
  }

  const payload = await decryptNotesContent(fileText, normalizedPassword);
  const currentNetwork = getStarknetNetworkName();
  if (payload.network !== currentNetwork) {
    throw new Error(`Notes network mismatch. File is ${payload.network}, app is ${currentNetwork}.`);
  }

  return { payload, fileName: handle.name ?? file.name };
}

export async function writeNotesToHandle(
  handle: NotesFileHandle,
  password: string,
  nextNotes: LetheNote[],
  allowPromptPermission: boolean
): Promise<{ notes: LetheNote[]; fileName: string }> {
  const normalizedPassword = password.trim();
  if (!normalizedPassword) {
    throw new Error("Password is required.");
  }
  const outputNotes = nextNotes;
  const content = await encryptNotesPayload(
    {
      version: 1,
      network: getStarknetNetworkName(),
      notes: outputNotes,
    },
    normalizedPassword
  );

  if (!handle.createWritable) {
    if (handle.getFile) {
      try {
        await readNotesFromHandle(handle, normalizedPassword, allowPromptPermission);
      } catch (error) {
        if (error instanceof Error && error.message === "Invalid password or corrupted file") {
          throw new Error("Password does not match the existing notes file.");
        }
        if (!isMissingNotesFileError(error)) {
          throw error;
        }
        throw error;
      }
    }
    const fileName = handle.name ?? NOTES_FILE_NAME;
    triggerNotesDownload(content, fileName);
    handle.getFile = async () => new File([content], fileName, { type: "application/json" });
    return { notes: outputNotes, fileName };
  }

  const allowed = await ensureNotesFilePermission(handle, "readwrite", allowPromptPermission);
  if (!allowed) {
    throw new Error("No write permission for linked notes file.");
  }
  if (!handle.getFile) {
    throw new Error("Current notes file handle is invalid.");
  }
  try {
    await readNotesFromHandle(handle, normalizedPassword, allowPromptPermission);
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid password or corrupted file") {
      throw new Error("Password does not match the existing notes file.");
    }
    if (!isMissingNotesFileError(error)) {
      throw error;
    }
    throw error;
  }
  const writable = await handle.createWritable();
  await writable.write(content);
  await writable.close();

  return { notes: outputNotes, fileName: handle.name ?? NOTES_FILE_NAME };
}
