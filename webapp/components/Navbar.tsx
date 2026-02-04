"use client";

import Link from "next/link";
import Image from "next/image";
import { WalletButton } from "./WalletButton";
import type { WalletState } from "@/hooks/useWallet";

export interface NavbarProps {
  wallet: WalletState & {
    connectWallet: (type: "argentx" | "braavos") => void;
    disconnectWallet: () => void;
  };
}

export function Navbar({ wallet }: NavbarProps) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-lethe-black-border bg-lethe-black/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 rounded-md px-2 py-1 transition hover:bg-white/5"
          aria-label="Lethe home"
        >
          <Image
            src="/logo/logo2.png"
            alt="Lethe"
            width={120}
            height={32}
            className="h-8 w-auto"
            priority
          />
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <Link
            href="/app"
            className="
              rounded-md
              border border-white/10
              px-4 py-2
              text-sm font-medium text-gray-300
              transition
              hover:border-lethe-orange/60
              hover:bg-lethe-orange/10
              hover:text-white
              active:scale-[0.98]
            "
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
