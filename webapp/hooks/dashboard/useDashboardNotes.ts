"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  mergeNotes,
  type LetheNote,
} from "@/lib/notes/secureNotes";
import {
  clearStoredNotesFileHandle,
  getStoredNotesFileHandle,
  getStoredNotesPassword,
  isMissingNotesFileError,
  pickExistingNotesFileHandle,
  pickNewNotesFileHandle,
  readNotesFromHandle,
  setStoredNotesFileHandle,
  setStoredNotesPassword,
  writeNotesToHandle,
  type NotesFileHandle,
} from "@/lib/notes/notesFileManager";

type NotesFileAction = "view-current" | "load-different" | "create-new";

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
  const [notesFileHandle, setNotesFileHandle] = useState<NotesFileHandle | null>(null);
  const [notesPassword, setNotesPassword] = useState<string | null>(null);
  const [needsFileRelink, setNeedsFileRelink] = useState(false);
  const [notesAction, setNotesAction] = useState<NotesFileAction>("view-current");
  const linkedNotesFileName = notesFileHandle?.name ?? null;
  const isNotesSetupRequired = !notesFileHandle || !notesPassword;

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const stored = await getStoredNotesFileHandle();
      if (!mounted) return;

      if (!stored) {
        setNeedsFileRelink(true);
        setNotesStatus("No linked notes file found. Load one or create a new file to continue.");
        setNotesAction("load-different");
        setDownloadPassword("");
        setDownloadPasswordError(null);
        setDownloadNoteOpen(true);
        return;
      }

      try {
        if (!stored.getFile) {
          throw new Error("Linked notes file handle is invalid.");
        }
        await stored.getFile();
        setNotesFileHandle(stored);
        setNeedsFileRelink(false);
        const savedPassword = getStoredNotesPassword();
        if (savedPassword.trim()) {
          try {
            await loadNotesFromHandle(stored, savedPassword, false);
            setDownloadPassword(savedPassword);
            setDownloadPasswordError(null);
            return;
          } catch (error) {
            setNotesStatus(error instanceof Error ? error.message : "Failed to load notes automatically.");
          }
        } else {
          setNotesStatus("Notes file detected. Enter password to load saved notes.");
        }
        setNotesAction("view-current");
      } catch (error) {
        setNeedsFileRelink(true);
        setNotesFileHandle(null);
        await clearStoredNotesFileHandle();
        setNotesStatus(
          isMissingNotesFileError(error)
            ? "Linked notes file was moved or deleted. Locate it manually or create a new one."
            : "Linked notes file cannot be opened. Locate it manually or create a new one."
        );
        setNotesAction("load-different");
      }

      setDownloadPassword(getStoredNotesPassword());
      setDownloadPasswordError(null);
      setDownloadNoteOpen(true);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const withdrawableNotes = useMemo(
    () => notes.filter((note) => Number.isInteger(note.leaf_index) && note.leaf_index >= 0),
    [notes]
  );

  const persistToSameFile = async (
    password: string,
    canPromptPicker: boolean,
    nextNotes: LetheNote[],
    preferredHandle?: NotesFileHandle,
    canPromptPermission = canPromptPicker
  ) => {
    let mergedNotes = nextNotes;

    let handle = preferredHandle ?? notesFileHandle;
    if (!handle && canPromptPicker) {
      handle = await pickNewNotesFileHandle();
      setNotesFileHandle(handle);
      setNeedsFileRelink(false);
      await setStoredNotesFileHandle(handle);
    }

    if (handle) {
      try {
        const result = await writeNotesToHandle(handle, password, mergedNotes, canPromptPermission);
        mergedNotes = result.notes;
      } catch (error) {
        if (isMissingNotesFileError(error)) {
          setNeedsFileRelink(true);
          setNotesFileHandle(null);
          await clearStoredNotesFileHandle();
          throw new Error("The notes file was moved or deleted. Create a new file or link the existing one.");
        }
        throw error;
      }
      setNeedsFileRelink(false);
      notesRef.current = mergedNotes;
      setNotes(mergedNotes);
      return true;
    }

    if (!canPromptPicker) {
      return false;
    }

    throw new Error("No linked notes file. Create or load a notes file first.");
  };

  const closeNotesDialog = (force = false) => {
    if (!force && isNotesSetupRequired) return;
    setDownloadNoteOpen(false);
    setDownloadPassword("");
    setDownloadPasswordError(null);
  };

  const handleOpenDownloadNote = (action: NotesFileAction = "view-current") => {
    setNotesAction(action);
    setDownloadPassword(notesPassword ?? getStoredNotesPassword());
    setDownloadPasswordError(null);
    setDownloadNoteOpen(true);
  };

  const handleCloseDownloadNote = () => {
    closeNotesDialog(false);
  };

  async function loadNotesFromHandle(handle: NotesFileHandle, password: string, canPromptPermission: boolean) {
    const normalizedPassword = password.trim();
    try {
      const { payload, fileName } = await readNotesFromHandle(handle, normalizedPassword, canPromptPermission);

      notesRef.current = payload.notes;
      setNotes(payload.notes);
      setNotesPassword(normalizedPassword);
      setStoredNotesPassword(normalizedPassword);
      setNeedsFileRelink(false);
      setNotesStatus(
        `Loaded ${payload.notes.length} note${payload.notes.length === 1 ? "" : "s"} from ${fileName}.`
      );
      closeNotesDialog(true);
    } catch (error) {
      if (error instanceof Error && error.message === "Invalid password or corrupted file") {
        throw new Error("Password does not match the selected notes file.");
      }
      if (isMissingNotesFileError(error)) {
        setNeedsFileRelink(true);
        setNotesFileHandle(null);
        await clearStoredNotesFileHandle();
        throw new Error("The notes file was moved or deleted. Load another file or create a new one.");
      }
      throw error;
    }
  }

  const handleViewCurrentNotesFile = async (): Promise<string | null> => {
    if (!notesFileHandle) {
      return "No linked notes file. Load one manually or create a new file.";
    }
    try {
      await loadNotesFromHandle(notesFileHandle, downloadPassword, true);
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

  const applyWithdrawTransition = (spentCommitment: string, newChangeNote?: LetheNote) => {
    const remaining = notesRef.current.filter((note) => note.commitment !== spentCommitment);
    const merged = newChangeNote ? mergeNotes(remaining, [newChangeNote]) : remaining;
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
    const password = notesPassword ?? getStoredNotesPassword();
    if (!password.trim()) {
      const message = "Notes password is required to persist deposit notes. Create or load a notes file.";
      setNotesStatus(message);
      setNotesAction("create-new");
      setDownloadPassword("");
      setDownloadPasswordError(message);
      setDownloadNoteOpen(true);
      return;
    }
    try {
      const wroteSameFile = await persistToSameFile(password, false, notesRef.current);
      setNotesPassword(password);
      setStoredNotesPassword(password);
      if (wroteSameFile) {
        setNotesStatus(
          `Updated lethe-notes.json.enc (${notesRef.current.length} note${notesRef.current.length === 1 ? "" : "s"}).`
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update linked notes file.";
      setNotesStatus(message);
      setNotesAction("create-new");
      setDownloadPassword(password);
      setDownloadPasswordError(message);
      setDownloadNoteOpen(true);
    }
  };

  const handleCreateNewNotesFile = async () => {
    setDownloadPasswordError(null);
    try {
      const normalizedPassword = downloadPassword.trim();
      if (!normalizedPassword) {
        throw new Error("Password is required.");
      }
      const handle = await pickNewNotesFileHandle();
      setNotesFileHandle(handle);
      await setStoredNotesFileHandle(handle);
      setNeedsFileRelink(false);
      await persistToSameFile(normalizedPassword, false, notesRef.current, handle, true);
      setNotesPassword(normalizedPassword);
      setStoredNotesPassword(normalizedPassword);
      setNotesStatus(`New notes file created: ${handle.name}.`);
      closeNotesDialog(true);
    } catch (error) {
      setDownloadPasswordError(error instanceof Error ? error.message : "Failed to create notes file");
    }
  };

  const handleLinkExistingNotesFile = async () => {
    setDownloadPasswordError(null);
    try {
      const normalizedPassword = downloadPassword.trim();
      if (!normalizedPassword) {
        throw new Error("Password is required.");
      }
      const handle = await pickExistingNotesFileHandle();
      if (!handle) return;
      setNotesFileHandle(handle);
      await setStoredNotesFileHandle(handle);
      setNeedsFileRelink(false);
      await loadNotesFromHandle(handle, normalizedPassword, true);
    } catch (error) {
      setDownloadPasswordError(error instanceof Error ? error.message : "Failed to link notes file");
    }
  };

  const handleRunSelectedNotesAction = async () => {
    setDownloadPasswordError(null);
    if (notesAction === "view-current") {
      const error = await handleViewCurrentNotesFile();
      if (error) setDownloadPasswordError(error);
      return;
    }
    if (notesAction === "load-different") {
      await handleLinkExistingNotesFile();
      return;
    }
    await handleCreateNewNotesFile();
  };

  return {
    notes,
    notesStatus,
    clearNotesStatus,
    addOrUpdateNote,
    applyWithdrawTransition,
    applyLeafIndex,
    persistUsingCurrentPassword,
    withdrawableNotes,
    hasNotesPassword: Boolean(notesPassword),
    isNotesSetupRequired,
    needsFileRelink,
    linkedNotesFileName,
    notesAction,
    setNotesAction,
    downloadNoteOpen,
    downloadPassword,
    setDownloadPassword,
    downloadPasswordError,
    handleOpenDownloadNote,
    handleCloseDownloadNote,
    handleRunSelectedNotesAction,
    handleViewCurrentNotesFile,
    handleCreateNewNotesFile,
    handleLinkExistingNotesFile,
  };
}
