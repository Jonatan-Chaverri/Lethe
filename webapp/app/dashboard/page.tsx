"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useWalletLogin } from "@/hooks/useWalletLogin";
import { useMockContracts } from "@/hooks/useMockContracts";

const MIN_DEPOSIT_BTC = 0.001;
const MIN_WITHDRAW_BTC = 0.001;

function truncateAddress(value: string): string {
  if (value.length <= 14) return value;
  return `${value.slice(0, 6)}...${value.slice(-6)}`;
}

function StatCard({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <article className="rounded-2xl border border-lethe-line bg-lethe-card/80 p-5 shadow-panel">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-lethe-muted">{title}</p>
      <p className="mt-3 font-display text-4xl text-lethe-text">{value}</p>
      <p className="mt-2 text-sm text-lethe-muted">{hint}</p>
    </article>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);

  const { user, isAuthenticated, isBootstrapping } = useAuth();
  const { address, disconnectWallet } = useWalletLogin();
  const contracts = useMockContracts(isAuthenticated);
  const [menuOpen, setMenuOpen] = useState(false);

  const walletAddress = address ?? user?.wallet ?? null;
  const currentBalance = contracts.getUserBalance();
  const allTimeYield = contracts.getUserYield();

  const stats = useMemo(
    () => [
      {
        title: "Current Balance",
        value: `${currentBalance.toFixed(4)} BTC`,
        hint: "Private note balance available for future withdrawals.",
      },
      {
        title: "All-time Yield",
        value: `${allTimeYield.toFixed(4)} BTC`,
        hint: "Total yield earned across all positions.",
      }
    ],
    [allTimeYield, currentBalance]
  );

  useEffect(() => {
    if (!isBootstrapping && !isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, isBootstrapping, router]);

  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  if (isBootstrapping) {
    return (
      <main className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-5 sm:px-6">
        <p className="text-sm text-lethe-muted">Loading dashboard...</p>
      </main>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <main className="min-h-screen px-5 pb-16 pt-24 sm:px-6 sm:pt-28">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-lethe-mint">Private Vault Dashboard</p>
            <h1 className="mt-2 font-display text-4xl text-lethe-text sm:text-5xl">Welcome back</h1>
            <p className="mt-3 max-w-2xl text-sm text-lethe-muted">
              Manage your private BTC positions, monitor yield performance, and execute deposits or withdrawals.
            </p>
          </div>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-lethe-line bg-lethe-card text-lethe-text transition hover:border-lethe-mint/50"
            >
              <span className="text-sm font-semibold">{(user.name ?? "U").slice(0, 1).toUpperCase()}</span>
            </button>
            {walletAddress && (
              <p className="mt-2 text-right font-mono text-xs text-lethe-muted">{truncateAddress(walletAddress)}</p>
            )}

            {menuOpen && (
              <div className="absolute right-0 top-full z-20 mt-2 w-44 rounded-xl border border-lethe-line bg-lethe-card py-1 shadow-panel">
                <Link
                  href="/dashboard/profile"
                  className="block px-3 py-2 text-sm text-lethe-text transition hover:bg-lethe-steel/50"
                  onClick={() => setMenuOpen(false)}
                >
                  View my profile
                </Link>
                <button
                  type="button"
                  onClick={async () => {
                    setMenuOpen(false);
                    await disconnectWallet();
                    router.replace("/");
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-lethe-rose transition hover:bg-lethe-steel/50"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </header>

        <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
          {stats.map((item) => (
            <StatCard key={item.title} title={item.title} value={item.value} hint={item.hint} />
          ))}
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-lethe-line bg-lethe-card/80 p-6 shadow-panel">
            <h2 className="font-display text-3xl text-lethe-text">Deposit</h2>
            <p className="mt-2 text-sm text-lethe-muted">
              Add BTC to your private vault notes and start accruing yield.
            </p>
            <p className="mt-4 text-xs uppercase tracking-[0.12em] text-lethe-muted">
              Minimum unit: {MIN_DEPOSIT_BTC.toFixed(3)} BTC
            </p>
            <button
              type="button"
              className="mt-6 rounded-full bg-lethe-mint px-5 py-2.5 text-sm font-semibold text-lethe-ink transition hover:-translate-y-0.5 hover:bg-[#93ffd8]"
            >
              Start deposit
            </button>
          </article>

          <article className="rounded-2xl border border-lethe-line bg-lethe-card/80 p-6 shadow-panel">
            <h2 className="font-display text-3xl text-lethe-text">Withdraw</h2>
            <p className="mt-2 text-sm text-lethe-muted">
              Burn spent notes and withdraw BTC while preserving privacy guarantees.
            </p>
            <p className="mt-4 text-xs uppercase tracking-[0.12em] text-lethe-muted">
              Minimum unit: {MIN_WITHDRAW_BTC.toFixed(3)} BTC
            </p>
            <button
              type="button"
              className="mt-6 rounded-full bg-lethe-amber px-5 py-2.5 text-sm font-semibold text-lethe-ink transition hover:-translate-y-0.5 hover:bg-[#ffc455]"
            >
              Start withdraw
            </button>
          </article>
        </section>
      </div>
    </main>
  );
}
