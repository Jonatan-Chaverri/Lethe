"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { getShareUnitPrice } from "@/lib/api/userPositions";
import { type LetheNote } from "@/lib/notes/secureNotes";
import {
  getStoredNotesFileHandle,
  getStoredNotesPassword,
  readNotesFromHandle,
  setStoredNotesPassword,
} from "@/lib/notes/notesFileManager";

const SATS_PER_BTC = BigInt(100_000_000);

function truncateHex(value: string): string {
  if (value.length <= 30) return value;
  return `${value.slice(0, 14)}...${value.slice(-14)}`;
}

function toBigIntCandidate(value: unknown): bigint | null {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isFinite(value)) return BigInt(Math.trunc(value));
  if (typeof value === "string" && value.trim().length > 0) {
    try {
      return BigInt(value.trim());
    } catch {
      return null;
    }
  }
  return null;
}

function formatBtcFromSats(value: bigint): string {
  const whole = value / SATS_PER_BTC;
  const fraction = value % SATS_PER_BTC;
  const trimmedFraction = fraction.toString().padStart(8, "0").replace(/0+$/, "");
  const wholeFormatted = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return trimmedFraction ? `${wholeFormatted}.${trimmedFraction}` : wholeFormatted;
}

function getNoteValueSats(note: LetheNote, shareUnitPriceSats: bigint | null): bigint | null {
  if (shareUnitPriceSats === null) return null;
  const units = toBigIntCandidate(note.k_units);
  if (units === null) return null;
  return units * shareUnitPriceSats;
}

export default function UserNotesPage() {
  const router = useRouter();
  const { isAuthenticated, isBootstrapping } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<LetheNote[]>([]);
  const [password, setPassword] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [shareUnitPriceSats, setShareUnitPriceSats] = useState<bigint | null>(null);

  const loadNotes = async (passwordToUse: string, allowPromptPermission: boolean) => {
    const normalizedPassword = passwordToUse.trim();
    if (!normalizedPassword) {
      throw new Error("Password is required.");
    }

    const handle = await getStoredNotesFileHandle();
    if (!handle) {
      throw new Error("No linked notes file found. Go back and load/create a notes file first.");
    }
    const { payload, fileName: currentFileName } = await readNotesFromHandle(
      handle,
      normalizedPassword,
      allowPromptPermission
    );

    const unitPriceRaw = await getShareUnitPrice();
    const unitPriceCandidate = toBigIntCandidate(
      (unitPriceRaw as any)?.share_unit_price ??
        (unitPriceRaw as any)?.unit_price ??
        (unitPriceRaw as any)?.price ??
        (unitPriceRaw as any)?.current_balance ??
        unitPriceRaw
    );
    if (unitPriceCandidate === null) {
      throw new Error("Invalid share unit price response.");
    }

    setNotes(payload.notes);
    setFileName(currentFileName);
    setShareUnitPriceSats(unitPriceCandidate);
    setStoredNotesPassword(normalizedPassword);
    setPassword(normalizedPassword);
    setStatus(
      `Loaded ${payload.notes.length} note${payload.notes.length === 1 ? "" : "s"} from ${currentFileName}.`
    );
    setError(null);
  };

  useEffect(() => {
    if (!isBootstrapping && !isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, isBootstrapping, router]);

  useEffect(() => {
    if (isBootstrapping || !isAuthenticated) return;

    let active = true;
    void (async () => {
      setIsLoading(true);
      setError(null);
      setStatus(null);
      const savedPassword = getStoredNotesPassword();
      setPassword(savedPassword);
      if (!savedPassword.trim()) {
        setIsLoading(false);
        setStatus("Enter your notes password to decrypt and view saved notes.");
        return;
      }
      try {
        await loadNotes(savedPassword, false);
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Failed to load notes.");
      } finally {
        if (active) setIsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [isAuthenticated, isBootstrapping]);

  if (isBootstrapping) {
    return (
      <main className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-5 sm:px-6">
        <p className="text-sm text-lethe-muted">Loading notes...</p>
      </main>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <main className="min-h-screen px-5 pb-16 pt-24 sm:px-6 sm:pt-28">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl text-white">Saved Notes</h1>
            <p className="mt-2 text-sm text-[#b4b4b4]">
              Current note file:{" "}
              <span className="font-mono text-white">{fileName ?? "No file linked"}</span>
            </p>
          </div>
          <Link
            href="/dashboard"
            className="rounded-full border border-[#3b2a11] bg-[#121212] px-4 py-2 text-sm text-white transition hover:border-[#f7931a]/60"
          >
            Back to dashboard
          </Link>
        </div>

        <section className="mt-6 rounded-2xl border border-[#3b2a11] bg-[#101010]/95 p-5 shadow-panel">
          <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-[#b4b4b4]">Password</label>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-[#3b2a11] bg-[#171717] px-4 py-3 text-sm text-white placeholder:text-[#7f7f7f] focus:border-[#f7931a] focus:outline-none focus:ring-1 focus:ring-[#f7931a]"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={async () => {
                setError(null);
                setStatus(null);
                setIsLoading(true);
                try {
                  await loadNotes(password, true);
                } catch (loadError) {
                  setError(loadError instanceof Error ? loadError.message : "Failed to load notes.");
                } finally {
                  setIsLoading(false);
                }
              }}
              disabled={isLoading}
              className="rounded-full bg-gradient-to-r from-[#f7931a] to-[#ffb347] px-5 py-3 text-sm font-semibold text-black transition hover:brightness-110 disabled:opacity-60"
            >
              {isLoading ? "Loading..." : "Load notes"}
            </button>
          </div>
          {status && <p className="mt-3 text-xs text-[#b4b4b4]">{status}</p>}
          {error && (
            <p className="mt-3 text-sm text-lethe-rose" role="alert">
              {error}
            </p>
          )}
        </section>

        <section className="mt-6 grid gap-3">
          {notes.length === 0 ? (
            <div className="rounded-2xl border border-[#2c2c2c] bg-[#121212]/80 p-5">
              <p className="text-sm text-[#b4b4b4]">No notes loaded.</p>
            </div>
          ) : (
            notes.map((note) => {
              const noteValueSats = getNoteValueSats(note, shareUnitPriceSats);
              return (
                <article
                  key={note.commitment}
                  className="relative rounded-2xl border border-[#2c2c2c] bg-[#121212]/85 p-4 pb-14 shadow-panel"
                >
                  <div className="grid gap-2 text-xs sm:grid-cols-2">
                    <p className="text-[#b4b4b4]">
                      Commitment: <span className="font-mono text-white">{truncateHex(note.commitment)}</span>
                    </p>
                    <p className="text-[#b4b4b4]">
                      Units: <span className="font-mono text-white">{note.k_units}</span>
                    </p>
                    <p className="text-[#b4b4b4]">
                      Nullifier: <span className="font-mono text-white">{truncateHex(note.nullifier)}</span>
                    </p>
                    <p className="text-[#b4b4b4]">
                      Leaf index: <span className="font-mono text-white">{note.leaf_index}</span>
                    </p>
                    <p className="break-all text-[#b4b4b4]">
                      Secret: <span className="font-mono text-white">{note.secret}</span>
                    </p>
                  </div>
                  <h2 className="absolute bottom-3 right-4 text-right font-display text-xl text-[#f8b84f]">
                    {noteValueSats === null ? "N/A" : `${formatBtcFromSats(noteValueSats)} BTC`}
                  </h2>
                </article>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}
