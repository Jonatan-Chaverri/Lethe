"use client";

import Image from "next/image";
import Link from "next/link";
import type { WalletState } from "@/hooks/useWallet";
import { WalletButton } from "./WalletButton";

export interface NavbarProps {
  wallet: WalletState & {
    connectWallet: (type: "argentx" | "braavos") => void;
    disconnectWallet: () => void;
  };
}

export function Navbar({ wallet }: NavbarProps) {
  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-lethe-line/70 bg-lethe-ink/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-6">
        <Link
          href="/"
          aria-label="Lethe home"
          className="group inline-flex items-center gap-3 rounded-full border border-transparent px-2 py-1 transition hover:border-lethe-line hover:bg-lethe-card/60"
        >
          <Image
            src="/logo/logo2.png"
            alt="Lethe"
            width={122}
            height={32}
            className="h-8 w-auto"
            priority
          />
          <span className="hidden text-[11px] font-semibold uppercase tracking-[0.18em] text-lethe-muted transition group-hover:text-lethe-mint sm:block">
            Zero-Knowledge Vault
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/app"
            className="rounded-full border border-lethe-line bg-lethe-card/75 px-4 py-2 text-sm font-semibold text-lethe-text transition hover:border-lethe-mint/70 hover:text-lethe-mint"
          >
            App
          </Link>
          <WalletButton
            isConnected={wallet.isConnected}
            walletType={wallet.walletType}
            address={wallet.address}
            onConnect={wallet.connectWallet}
            onDisconnect={wallet.disconnectWallet}
          />
        </div>
      </div>
    </nav>
  );
}
