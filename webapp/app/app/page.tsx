"use client";

import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { useMockContracts } from "@/hooks/useMockContracts";
import { useWallet } from "@/hooks/useWallet";

interface SummaryItem {
  label: string;
  value: string;
  tone: string;
}

export default function AppDashboardPage() {
  const wallet = useWallet();
  const contracts = useMockContracts(wallet.isConnected);
  const auth = useAuth(wallet.isConnected);

  const balance = contracts.getUserBalance();
  const yieldAccrued = contracts.getUserYield();

  const summaryItems: SummaryItem[] = [
    {
      label: "Balance (wBTC)",
      value: `${balance.toFixed(8)} BTC`,
      tone: "text-lethe-mint",
    },
    {
      label: "Yield accrued",
      value: `${yieldAccrued.toFixed(8)} BTC`,
      tone: "text-lethe-amber",
    },
  ];

  return (
    <>
      <Navbar wallet={wallet} />
      <main className="min-h-screen px-4 pb-16 pt-24">
        <div className="mx-auto max-w-3xl">
          <header>
            <h1 className="font-display text-5xl text-lethe-text">Dashboard</h1>
            <p className="mt-2 text-sm text-lethe-muted">
              Connected to backend auth endpoint (`/api/auth/me`) when a token exists.
            </p>
          </header>

          <section className="mt-8 rounded-2xl border border-lethe-line bg-lethe-card/80 p-6 shadow-panel">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-lethe-muted">
              Wallet
            </h2>
            <p className="mt-3 text-lethe-text">
              {wallet.isConnected
                ? `Connected (${wallet.walletType ?? "unknown"})`
                : "Not connected"}
            </p>
            {wallet.address && (
              <p className="mt-1 break-all font-mono text-sm text-lethe-mint">
                {wallet.address}
              </p>
            )}
          </section>

          <section className="mt-5 rounded-2xl border border-lethe-line bg-lethe-card/80 p-6 shadow-panel">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-lethe-muted">
              Backend user
            </h2>
            {auth.isLoading ? (
              <p className="mt-2 text-sm text-lethe-muted">Loading user...</p>
            ) : auth.user ? (
              <div className="mt-2 space-y-1 text-sm text-lethe-text">
                <p>ID: {auth.user.id}</p>
                <p>Wallet: {auth.user.wallet}</p>
                <p>Provider: {auth.user.wallet_provider}</p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-lethe-muted">
                No backend session token found. Call `/api/auth/register_wallet` from the client flow to create a session.
              </p>
            )}
            {auth.error && <p className="mt-2 text-sm text-lethe-rose">{auth.error}</p>}
          </section>

          <section className="mt-5 rounded-2xl border border-lethe-line bg-lethe-card/80 p-6 shadow-panel">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-lethe-muted">
              Your position (mocked)
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {summaryItems.map((item) => (
                <article key={item.label} className="rounded-xl border border-lethe-line bg-lethe-steel/25 p-4">
                  <p className="text-sm text-lethe-muted">{item.label}</p>
                  <p className={`mt-2 font-mono text-xl ${item.tone}`}>{item.value}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-5 rounded-2xl border border-lethe-line bg-lethe-card/80 p-6 shadow-panel">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-lethe-muted">
              Actions
            </h2>
            <p className="mt-2 text-sm text-lethe-muted">
              Contract calls are mocked in this version.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <ActionButton label="Deposit" />
              <ActionButton label="Withdraw" />
              <ActionButton label="Claim yield" />
            </div>
          </section>

          <p className="mt-8 text-center">
            <Link href="/" className="text-sm text-lethe-mint transition hover:text-lethe-amber">
              Back to home
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}

function ActionButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      disabled
      className="rounded-full border border-lethe-line bg-lethe-ink px-4 py-2 text-sm text-lethe-muted opacity-70"
    >
      {label}
    </button>
  );
}
