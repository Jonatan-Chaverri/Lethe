"use client";

import Link from "next/link";
import { useDashboard, MIN_DEPOSIT_BTC, MIN_WITHDRAW_BTC } from "@/hooks/useDashboard";

function truncateAddress(value: string): string {
  if (value.length <= 14) return value;
  return `${value.slice(0, 6)}...${value.slice(-6)}`;
}

function truncateProof(value: string): string {
  if (value.length <= 30) return value;
  return `${value.slice(0, 14)}...${value.slice(-14)}`;
}

export default function DashboardPage() {
  const {
    user,
    isAuthenticated,
    isBootstrapping,
    router,
    disconnectWallet,
    walletAddress,
    currentPositionValue,
    allTimeYieldValue,
    positionError,
    menuOpen,
    setMenuOpen,
    menuRef,
    depositProof,
    withdrawProof,
    proofError,
    activeProof,
    depositAmountOpen,
    depositAmountInput,
    setDepositAmountInput,
    depositAmountError,
    wbtcBalanceDisplay,
    isLoadingWBTC,
    refetchWBTCBalance,
    mintTestnetWBTC,
    isMinting,
    wbtcBalanceError,
    wbtcMintError,
    handleOpenDepositAmount,
    handleCloseDepositAmount,
    handleConfirmDepositAmount,
    handleGenerateWithdrawProof,
  } = useDashboard();

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

        <section className="mt-8 rounded-3xl border border-lethe-line bg-gradient-to-b from-lethe-card to-lethe-steel/60 p-6 shadow-panel sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-lethe-muted">Current Position</p>
          <p className="mt-3 font-display text-6xl leading-none text-lethe-text sm:text-7xl">
            {currentPositionValue}
          </p>
          <p className="mt-4 text-sm text-lethe-muted">All-time yield: {allTimeYieldValue}</p>
        </section>
        {positionError && (
          <p className="mt-4 text-sm text-lethe-rose" role="alert">
            {positionError}
          </p>
        )}

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-lethe-line bg-lethe-card/90 p-6 shadow-panel">
            <h2 className="font-display text-3xl text-lethe-text">Deposit</h2>
            <p className="mt-2 text-sm text-lethe-muted">
              Add BTC to your private vault notes and start accruing yield.
            </p>
            <p className="mt-4 text-xs uppercase tracking-[0.12em] text-lethe-muted">
              Minimum unit: {MIN_DEPOSIT_BTC.toFixed(3)} BTC
            </p>
            <button
              type="button"
              onClick={handleOpenDepositAmount}
              disabled={activeProof !== null}
              className="mt-6 w-full rounded-full bg-lethe-amber px-5 py-3 text-base font-semibold text-lethe-ink transition hover:-translate-y-0.5 hover:bg-[#ffc455]"
            >
              {activeProof === "deposit" ? "Generating proof..." : "Deposit"}
            </button>
            {depositAmountOpen && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-lethe-ink/60 px-4"
                aria-modal="true"
                role="dialog"
                onClick={handleCloseDepositAmount}
              >
                <div
                  className="w-full max-w-sm rounded-2xl border border-lethe-line bg-lethe-card p-6 shadow-panel"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 className="font-display text-xl text-lethe-text">Deposit WBTC</h3>
                  <p className="mt-2 text-sm text-lethe-muted">
                    Enter the amount in BTC (e.g. 0.001 or 1.5).
                  </p>
                  <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-lethe-muted">
                    Amount (BTC)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.001"
                    value={depositAmountInput}
                    onChange={(e) => setDepositAmountInput(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-lethe-line bg-lethe-steel/50 px-4 py-3 font-mono text-lethe-text placeholder:text-lethe-muted focus:border-lethe-mint focus:outline-none focus:ring-1 focus:ring-lethe-mint"
                    autoFocus
                  />
                  <p className="mt-2 text-xs text-lethe-muted">Min: {MIN_DEPOSIT_BTC.toFixed(3)} BTC</p>
                  {depositAmountError && (
                    <p className="mt-2 text-sm text-lethe-rose" role="alert">
                      {depositAmountError}
                    </p>
                  )}
                  <div className="mt-6 flex gap-3">
                    <button
                      type="button"
                      onClick={handleCloseDepositAmount}
                      className="flex-1 rounded-full border border-lethe-line px-4 py-2.5 text-sm font-semibold text-lethe-text transition hover:bg-lethe-steel/50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmDepositAmount}
                      className="flex-1 rounded-full bg-lethe-amber px-4 py-2.5 text-sm font-semibold text-lethe-ink transition hover:bg-[#ffc455]"
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div className="mt-4 rounded-xl border border-lethe-line bg-lethe-steel/35 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-lethe-muted">
                  Wallet Balance
                </p>
                <button
                  type="button"
                  onClick={() => refetchWBTCBalance()}
                  disabled={isLoadingWBTC}
                  aria-label="Reload balance"
                  className="rounded-full p-1.5 text-lethe-muted transition hover:bg-lethe-card/70 hover:text-lethe-text disabled:opacity-50"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={isLoadingWBTC ? "animate-spin" : ""}
                  >
                    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                    <path d="M16 21h5v-5" />
                  </svg>
                </button>
              </div>
              <p className="mt-2 font-mono text-lg text-lethe-text">
                {isLoadingWBTC ? "…" : `${wbtcBalanceDisplay} WBTC`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => mintTestnetWBTC()}
              disabled={isMinting || isLoadingWBTC}
              className="mt-3 rounded-full border border-lethe-mint bg-lethe-card px-4 py-2 text-sm font-semibold text-lethe-mint transition hover:bg-lethe-mint/10 disabled:opacity-50"
            >
              {isMinting ? "Minting…" : "Mint testnet WBTC"}
            </button>
            {wbtcBalanceError && (
              <p className="mt-2 text-sm text-lethe-rose" role="alert">
                {wbtcBalanceError}
              </p>
            )}
            {wbtcMintError && (
              <p className="mt-2 text-sm text-lethe-rose" role="alert">
                {wbtcMintError}
              </p>
            )}
            {depositProof && (
              <div className="mt-4 rounded-xl border border-lethe-line bg-lethe-steel/30 p-3 text-xs text-lethe-muted">
                <p className="font-semibold text-lethe-text">Proof generated</p>
                <p className="mt-1 font-mono">proof: {truncateProof(depositProof.proofHex)}</p>
                <p className="mt-1">verified: {depositProof.verified ? "true" : "false"}</p>
              </div>
            )}
          </article>

          <article className="rounded-2xl border border-lethe-line bg-lethe-card/90 p-6 shadow-panel">
            <h2 className="font-display text-3xl text-lethe-text">Withdraw</h2>
            <p className="mt-2 text-sm text-lethe-muted">
              Burn spent notes and withdraw BTC while preserving privacy guarantees.
            </p>
            <p className="mt-4 text-xs uppercase tracking-[0.12em] text-lethe-muted">
              Minimum unit: {MIN_WITHDRAW_BTC.toFixed(3)} BTC
            </p>
            <button
              type="button"
              onClick={handleGenerateWithdrawProof}
              disabled={activeProof !== null}
              className="mt-6 w-full rounded-full bg-lethe-line px-5 py-3 text-base font-semibold text-lethe-text transition hover:-translate-y-0.5 hover:bg-lethe-steel"
            >
              {activeProof === "withdraw" ? "Generating proof..." : "Withdraw"}
            </button>
            {withdrawProof && (
              <div className="mt-4 rounded-xl border border-lethe-line bg-lethe-steel/30 p-3 text-xs text-lethe-muted">
                <p className="font-semibold text-lethe-text">Proof generated</p>
                <p className="mt-1 font-mono">proof: {truncateProof(withdrawProof.proofHex)}</p>
                <p className="mt-1">verified: {withdrawProof.verified ? "true" : "false"}</p>
              </div>
            )}
          </article>
        </section>
        {proofError && (
          <p className="mt-4 text-sm text-lethe-rose" role="alert">
            {proofError}
          </p>
        )}
      </div>
    </main>
  );
}
