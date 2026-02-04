"use client";

import { useState, useRef, useEffect } from "react";
import type { WalletType } from "@/hooks/useWallet";

export interface WalletButtonProps {
  isConnected: boolean;
  walletType: WalletType;
  address: string | null;
  onConnect: (type: "argentx" | "braavos") => void;
  onDisconnect: () => void;
}

function truncateAddress(addr: string): string {
  if (addr.length <= 14) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-6)}`;
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
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (isConnected && address) {
    return (
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 rounded border border-lethe-black-border bg-lethe-black-soft px-3 py-2 font-mono text-sm text-lethe-orange transition hover:border-lethe-orange/50"
        >
          <span>{truncateAddress(address)}</span>
          <span className="text-gray-500 text-xs capitalize">
            {walletType ?? ""}
          </span>
        </button>
        {open && (
          <div className="absolute right-0 top-full mt-1 w-48 rounded border border-lethe-black-border bg-lethe-black-soft py-1 shadow-lg">
            <button
              type="button"
              onClick={() => {
                onDisconnect();
                setOpen(false);
              }}
              className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-white/5"
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
        onClick={() => setOpen((o) => !o)}
        className="rounded bg-lethe-orange px-4 py-2 text-sm font-medium text-black transition hover:bg-lethe-orange-glow"
      >
        Connect Wallet
      </button>
      {open && (
        <div className="absolute right-0 top-full z-10 mt-1 w-48 rounded border border-lethe-black-border bg-lethe-black-soft py-1 shadow-lg">
          <button
            type="button"
            onClick={() => {
              onConnect("argentx");
              setOpen(false);
            }}
            className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-white/5"
          >
            Argent X
          </button>
          <button
            type="button"
            onClick={() => {
              onConnect("braavos");
              setOpen(false);
            }}
            className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-white/5"
          >
            Braavos
          </button>
        </div>
      )}
    </div>
  );
}
