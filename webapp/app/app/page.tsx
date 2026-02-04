"use client";

import { useWallet } from "@/hooks/useWallet";
import { useMockContracts } from "@/hooks/useMockContracts";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import Link from "next/link";

export default function AppDashboardPage() {
  const wallet = useWallet();
  const contracts = useMockContracts(wallet.isConnected);
  const auth = useAuth(wallet.isConnected);

  const balance = contracts.getUserBalance();
  const yieldAccrued = contracts.getUserYield();

  return (
    <>
      <Navbar wallet={wallet} />
      <main className="min-h-screen px-4 pt-24 pb-16">
        <div className="mx-auto max-w-2xl">
          <h1 className="font-cinzel text-2xl font-semibold text-white">
            Dashboard
          </h1>

          {/* Wallet status */}
          <section className="mt-8 rounded-lg border border-lethe-black-border bg-lethe-black-soft p-6">
            <h2 className="font-mono text-sm font-medium text-gray-500 uppercase tracking-wider">
              Wallet
            </h2>
            <p className="mt-2 text-gray-400">
              {wallet.isConnected
                ? `Connected (${wallet.walletType ?? "—"})`
                : "Not connected"}
            </p>
            {wallet.address && (
              <p className="mt-1 font-mono text-sm text-lethe-orange">
                {wallet.address}
              </p>
            )}
            {!auth.isAuthenticated && (
              <p className="mt-2 text-sm text-amber-500/90">
                Connect a wallet to see your position and yield.
              </p>
            )}
          </section>

          {/* Mock balance & yield */}
          <section className="mt-6 rounded-lg border border-lethe-black-border bg-lethe-black-soft p-6">
            <h2 className="font-mono text-sm font-medium text-gray-500 uppercase tracking-wider">
              Your position (mocked)
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-gray-500">Balance (wBTC)</p>
                <p className="font-mono text-xl text-lethe-orange">
                  {balance.toFixed(8)} BTC
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Yield accrued</p>
                <p className="font-mono text-xl text-lethe-yellow">
                  {yieldAccrued.toFixed(8)} BTC
                </p>
              </div>
            </div>
          </section>

          {/* Mock actions */}
          <section className="mt-6 rounded-lg border border-lethe-black-border bg-lethe-black-soft p-6">
            <h2 className="font-mono text-sm font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              Buttons are disabled; contract calls are mocked.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                disabled
                className="rounded border border-lethe-black-border bg-lethe-black px-4 py-2 text-sm text-gray-500 cursor-not-allowed"
              >
                Deposit
              </button>
              <button
                type="button"
                disabled
                className="rounded border border-lethe-black-border bg-lethe-black px-4 py-2 text-sm text-gray-500 cursor-not-allowed"
              >
                Withdraw
              </button>
              <button
                type="button"
                disabled
                className="rounded border border-lethe-black-border bg-lethe-black px-4 py-2 text-sm text-gray-500 cursor-not-allowed"
              >
                Claim yield
              </button>
            </div>
          </section>

          <p className="mt-8 text-center">
            <Link
              href="/"
              className="text-sm text-lethe-orange hover:underline"
            >
              ← Back to home
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
