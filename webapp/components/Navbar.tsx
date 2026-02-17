"use client";

import Image from "next/image";
import Link from "next/link";
import { WalletButton } from "./WalletButton";

export interface NavbarProps {
  wallet: {
    isConnected: boolean;
    address: string | null;
    isConnecting?: boolean;
    error?: string | null;
    connectWallet: () => void;
    disconnectWallet: () => void;
  };
}

export function Navbar({ wallet }: NavbarProps) {
  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-[#3b2a11]/70 bg-[#0d0d0d]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-6">
        <Link
          href="/"
          aria-label="Lethe home"
          className="group inline-flex items-center gap-3 rounded-full border border-transparent px-2 py-1 transition hover:border-[#3b2a11] hover:bg-[#151515]"
        >
          <Image
            src="/logo/logo2.png"
            alt="Lethe"
            width={122}
            height={32}
            className="h-8 w-auto"
            priority
          />
          <span className="hidden text-[11px] font-semibold uppercase tracking-[0.18em] text-[#b7b7b7] transition group-hover:text-[#f8b84f] sm:block">
            Zero-Knowledge Vault
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <WalletButton
            isConnected={wallet.isConnected}
            address={wallet.address}
            isConnecting={wallet.isConnecting}
            error={wallet.error}
            onConnect={wallet.connectWallet}
            onDisconnect={wallet.disconnectWallet}
          />
        </div>
      </div>
    </nav>
  );
}
