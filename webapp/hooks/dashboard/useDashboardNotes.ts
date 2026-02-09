"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  decryptNotesContent,
  downloadEncryptedNotes,
  encryptNotesPayload,
  getStarknetNetworkName,
  mergeNotes,
  type LetheNote,
} from "@/lib/notes/secureNotes";

const HANDLE_DB_NAME = "lethe-notes-db";
const HANDLE_STORE_NAME = "settings";
const HANDLE_KEY = "notesFileHandle";

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

async function getStoredHandle(): Promise<any | null> {
  try {
    const db = await openHandleDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(HANDLE_STORE_NAME, "readonly");
      const store = tx.objectStore(HANDLE_STORE_NAME);
      const req = store.get(HANDLE_KEY);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

async function setStoredHandle(handle: any): Promise<void> {
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
    // Ignore persistence failures; runtime state still works.
  }
}

async function clearStoredHandle(): Promise<void> {
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

function isMissingFileError(error: unknown): boolean {
  if (!error) return false;
  const maybeName = (error as { name?: string }).name;
  if (maybeName === "NotFoundError") return true;
  const message = (error as { message?: string }).message?.toLowerCase() ?? "";
  return message.includes("requested file or directory could not be found");
}

async function ensureReadWritePermission(handle: any, allowPrompt: boolean): Promise<boolean> {
  if (!handle?.queryPermission || !handle?.requestPermission) return true;
  const query = await handle.queryPermission({ mode: "readwrite" });
  if (query === "granted") return true;
  if (!allowPrompt) return false;
  const request = await handle.requestPermission({ mode: "readwrite" });
  return request === "granted";
}

function patchLeafIndex(notes: LetheNote[], commitment: string, leafIndex: number): LetheNote[] {
  return notes.map((note) => {
    if (note.commitment !== commitment) return note;
    return { ...note, leaf_index: leafIndex };
  });
}

export function useDashboardNotes() {
  const [notes, setNotes] = useState<LetheNote[]>([]);
  const notesRef = useRef<LetheNote[]>([]);
  const [notesStatus, setNotesStatus] = useState<string | null>(null);
  const [downloadNoteOpen, setDownloadNoteOpen] = useState(false);
  const [downloadPassword, setDownloadPassword] = useState("");
  const [downloadPasswordError, setDownloadPasswordError] = useState<string | null>(null);
  const [notesFile, setNotesFile] = useState<File | null>(null);
  const [notesFileHandle, setNotesFileHandle] = useState<any>(null);
  const [notesPassword, setNotesPassword] = useState<string | null>(null);
  const [needsFileRelink, setNeedsFileRelink] = useState(false);
  const [withdrawPassword, setWithdrawPassword] = useState("");
  const [selectedWithdrawCommitment, setSelectedWithdrawCommitment] = useState("");

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const stored = await getStoredHandle();
      if (!mounted || !stored) return;
      setNotesFileHandle(stored);
      setNeedsFileRelink(false);
      setNotesStatus("Notes file linked. New deposits will update the same file.");
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (notes.length === 0) {
      setSelectedWithdrawCommitment("");
      return;
    }
    const stillExists = notes.some((note) => note.commitment === selectedWithdrawCommitment);
    if (!stillExists) {
      setSelectedWithdrawCommitment(notes[0].commitment);
    }
  }, [notes, selectedWithdrawCommitment]);

  const selectedNote = useMemo(
    () => notes.find((note) => note.commitment === selectedWithdrawCommitment) ?? notes[0],
    [notes, selectedWithdrawCommitment]
  );

  const persistToSameFile = async (
    password: string,
    canPromptPicker: boolean,
    nextNotes: LetheNote[],
    preferredHandle?: any,
    canPromptPermission = canPromptPicker
  ) => {
    let mergedNotes = nextNotes;

    const picker = (window as any).showSaveFilePicker as
      | ((options: Record<string, unknown>) => Promise<any>)
      | undefined;

    let handle = preferredHandle ?? notesFileHandle;
    if (!handle && canPromptPicker && picker) {
      handle = await picker({
        suggestedName: "lethe-notes.json.enc",
        types: [{ description: "Encrypted Lethe notes", accept: { "application/json": [".enc", ".json.enc"] } }],
      });
      setNotesFileHandle(handle);
      setNeedsFileRelink(false);
      await setStoredHandle(handle);
    }

    if (handle) {
      const allowed = await ensureReadWritePermission(handle, canPromptPermission);
      if (!allowed) {
        throw new Error("No write permission for linked notes file. Use 'Descargar nota' to re-authorize.");
      }
      try {
        const existing = await handle.getFile();
        const existingText = await existing.text();
        if (existingText.trim()) {
          const existingPayload = await decryptNotesContent(existingText, password);
          if (existingPayload.network !== getStarknetNetworkName()) {
            throw new Error(
              `Notes network mismatch. File is ${existingPayload.network}, app is ${getStarknetNetworkName()}.`
            );
          }
          mergedNotes = mergeNotes(existingPayload.notes, mergedNotes);
        }
      } catch (error) {
        if (error instanceof Error && error.message === "Invalid password or corrupted file") {
          throw new Error("Password does not match the existing notes file.");
        }
        if (isMissingFileError(error)) {
          setNeedsFileRelink(true);
          setNotesFileHandle(null);
          await clearStoredHandle();
          throw new Error("The notes file was moved or deleted. Create a new file or link the existing one.");
        }
        throw error;
      }

      const content = await encryptNotesPayload(
        {
          version: 1,
          network: getStarknetNetworkName(),
          notes: mergedNotes,
        },
        password
      );
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
      setNeedsFileRelink(false);
      notesRef.current = mergedNotes;
      setNotes(mergedNotes);
      return true;
    }

    if (!canPromptPicker) {
      return false;
    }

    await downloadEncryptedNotes(
      {
        version: 1,
        network: getStarknetNetworkName(),
        notes: mergedNotes,
      },
      password
    );
    notesRef.current = mergedNotes;
    setNotes(mergedNotes);
    return false;
  };

  const handleOpenDownloadNote = () => {
    setDownloadPassword(notesPassword ?? "");
    setDownloadPasswordError(null);
    setDownloadNoteOpen(true);
  };

  const handleCloseDownloadNote = () => {
    setDownloadNoteOpen(false);
    setDownloadPassword("");
    setDownloadPasswordError(null);
  };

  const handleDownloadEncryptedNotes = async () => {
    setDownloadPasswordError(null);
    try {
      const wroteSameFile = await persistToSameFile(downloadPassword, true, notesRef.current);
      setNotesPassword(downloadPassword);
      setNeedsFileRelink(false);
      setNotesStatus(
        wroteSameFile
          ? `Updated lethe-notes.json.enc (${notesRef.current.length} note${notesRef.current.length === 1 ? "" : "s"}).`
          : `Downloaded ${notesRef.current.length} encrypted note${notesRef.current.length === 1 ? "" : "s"}.`
      );
      handleCloseDownloadNote();
    } catch (error) {
      setDownloadPasswordError(error instanceof Error ? error.message : "Failed to encrypt notes");
    }
  };

  const handleSelectNotesFile = (file: File | null) => {
    setNotesFile(file);
  };

  const handleLoadWithdrawNotes = async (): Promise<string | null> => {
    if (!notesFile) {
      return "Upload a .json.enc notes file first";
    }

    try {
      const fileText = await notesFile.text();
      const payload = await decryptNotesContent(fileText, withdrawPassword);
      const currentNetwork = getStarknetNetworkName();
      if (payload.network !== currentNetwork) {
        return `Notes network mismatch. File is ${payload.network}, app is ${currentNetwork}.`;
      }

      const merged = mergeNotes(notesRef.current, payload.notes);
      notesRef.current = merged;
      setNotes(merged);
      setNotesPassword(withdrawPassword);
      setNeedsFileRelink(false);
      setNotesStatus(`Loaded ${payload.notes.length} note${payload.notes.length === 1 ? "" : "s"} from file.`);
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "Failed to load encrypted notes file";
    }
  };

  const addOrUpdateNote = (note: LetheNote) => {
    const merged = mergeNotes(notesRef.current, [note]);
    notesRef.current = merged;
    setNotes(merged);
  };

  const applyLeafIndex = (commitment: string, leafIndex: number) => {
    const patched = patchLeafIndex(notesRef.current, commitment, leafIndex);
    notesRef.current = patched;
    setNotes(patched);
  };

  const clearNotesStatus = () => setNotesStatus(null);

  const persistUsingCurrentPassword = async () => {
    if (!notesPassword) return;
    try {
      const wroteSameFile = await persistToSameFile(notesPassword, false, notesRef.current);
      if (wroteSameFile) {
        setNotesStatus(
          `Updated lethe-notes.json.enc (${notesRef.current.length} note${notesRef.current.length === 1 ? "" : "s"}).`
        );
      }
    } catch (error) {
      setNotesStatus(error instanceof Error ? error.message : "Failed to update linked notes file.");
    }
  };

  const handleCreateNewNotesFile = async () => {
    setDownloadPasswordError(null);
    try {
      const picker = (window as any).showSaveFilePicker as
        | ((options: Record<string, unknown>) => Promise<any>)
        | undefined;
      if (!picker) {
        throw new Error("Your browser does not support selecting a persistent file.");
      }
      const handle = await picker({
        suggestedName: "lethe-notes.json.enc",
        types: [{ description: "Encrypted Lethe notes", accept: { "application/json": [".enc", ".json.enc"] } }],
      });
      setNotesFileHandle(handle);
      await setStoredHandle(handle);
      setNeedsFileRelink(false);
      await persistToSameFile(downloadPassword, false, notesRef.current, handle, true);
      setNotesPassword(downloadPassword);
      setNotesStatus("New notes file linked and saved.");
      handleCloseDownloadNote();
    } catch (error) {
      setDownloadPasswordError(error instanceof Error ? error.message : "Failed to create notes file");
    }
  };

  const handleLinkExistingNotesFile = async () => {
    setDownloadPasswordError(null);
    try {
      const picker = (window as any).showOpenFilePicker as
        | ((options: Record<string, unknown>) => Promise<any[]>)
        | undefined;
      if (!picker) {
        throw new Error("Your browser does not support linking an existing file.");
      }
      const [handle] = await picker({
        multiple: false,
        types: [{ description: "Encrypted Lethe notes", accept: { "application/json": [".enc", ".json.enc"] } }],
      });
      if (!handle) return;
      setNotesFileHandle(handle);
      await setStoredHandle(handle);
      setNeedsFileRelink(false);
      await persistToSameFile(downloadPassword, false, notesRef.current, handle, true);
      setNotesPassword(downloadPassword);
      setNotesStatus("Existing notes file linked and updated.");
      handleCloseDownloadNote();
    } catch (error) {
      setDownloadPasswordError(error instanceof Error ? error.message : "Failed to link notes file");
    }
  };

  return {
    notes,
    notesStatus,
    clearNotesStatus,
    addOrUpdateNote,
    applyLeafIndex,
    persistUsingCurrentPassword,
    selectedNote,
    selectedWithdrawCommitment,
    setSelectedWithdrawCommitment,
    hasNotesPassword: Boolean(notesPassword),
    needsFileRelink,
    downloadNoteOpen,
    downloadPassword,
    setDownloadPassword,
    downloadPasswordError,
    handleOpenDownloadNote,
    handleCloseDownloadNote,
    handleDownloadEncryptedNotes,
    handleCreateNewNotesFile,
    handleLinkExistingNotesFile,
    setWithdrawPassword,
    withdrawPassword,
    handleSelectNotesFile,
    handleLoadWithdrawNotes,
  };
}
