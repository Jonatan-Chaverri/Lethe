"use client";

import { useEffect, useRef, useState } from "react";
import type { WalletType } from "@/hooks/useWallet";

export interface WalletButtonProps {
  isConnected: boolean;
  walletType: WalletType;
  address: string | null;
  onConnect: (type: "argentx" | "braavos") => void;
  onDisconnect: () => void;
}

function truncateAddress(value: string): string {
  if (value.length <= 14) return value;
  return `${value.slice(0, 6)}...${value.slice(-6)}`;
}

export function WalletButton({
  isConnected,
  walletType,
  address,
  onConnect,
  onDisconnect,
}: WalletButtonProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  if (isConnected && address) {
    return (
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex items-center gap-2 rounded-full border border-lethe-line bg-lethe-card/90 px-3 py-2 text-sm font-semibold text-lethe-mint transition hover:border-lethe-mint/50"
          aria-expanded={open}
          aria-haspopup="menu"
        >
          <span className="font-mono text-xs">{truncateAddress(address)}</span>
          <span className="text-[10px] uppercase tracking-[0.14em] text-lethe-muted">
            {walletType}
          </span>
        </button>

        {open && (
          <div
            className="absolute right-0 top-full z-10 mt-2 w-44 rounded-xl border border-lethe-line bg-lethe-card py-1 shadow-panel"
            role="menu"
          >
            <button
              type="button"
              onClick={() => {
                onDisconnect();
                setOpen(false);
              }}
              className="w-full px-3 py-2 text-left text-sm text-lethe-rose transition hover:bg-lethe-steel/40"
              role="menuitem"
            >
              Disconnect
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="rounded-full bg-lethe-amber px-4 py-2 text-sm font-semibold text-lethe-ink transition hover:-translate-y-0.5 hover:bg-[#ffc455]"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        Connect Wallet
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-10 mt-2 w-44 rounded-xl border border-lethe-line bg-lethe-card py-1 shadow-panel"
          role="menu"
        >
          <button
            type="button"
            onClick={() => {
              onConnect("argentx");
              setOpen(false);
            }}
            className="w-full px-3 py-2 text-left text-sm text-lethe-text transition hover:bg-lethe-steel/40"
            role="menuitem"
          >
            Argent X
          </button>
          <button
            type="button"
            onClick={() => {
              onConnect("braavos");
              setOpen(false);
            }}
            className="w-full px-3 py-2 text-left text-sm text-lethe-text transition hover:bg-lethe-steel/40"
            role="menuitem"
          >
            Braavos
          </button>
        </div>
      )}
    </div>
  );
}
