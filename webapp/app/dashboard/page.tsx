"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useDashboard, MIN_DEPOSIT_BTC, MIN_WITHDRAW_BTC } from "@/hooks/useDashboard";
import type { ChartRange } from "@/lib/api/sharePrice";

function truncateAddress(value: string): string {
  if (value.length <= 14) return value;
  return `${value.slice(0, 6)}...${value.slice(-6)}`;
}

function truncateProof(value: string): string {
  if (value.length <= 30) return value;
  return `${value.slice(0, 14)}...${value.slice(-14)}`;
}

function timestampToMs(value: number): number {
  return value < 1_000_000_000_000 ? value * 1000 : value;
}

function formatTick(ts: number, range: ChartRange): string {
  const date = new Date(timestampToMs(ts));
  if (range === "1h") {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (range === "1d") {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatPriceTick(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1) return `${value.toFixed(2)} BTC`;
  if (abs >= 0.01) return `${value.toFixed(4)} BTC`;
  return `${value.toFixed(6)} BTC`;
}

export default function DashboardPage() {
  const [expandedPanel, setExpandedPanel] = useState<"deposit" | "withdraw" | null>(null);
  const {
    user,
    isAuthenticated,
    isBootstrapping,
    router,
    disconnectWallet,
    walletAddress,
    currentPositionValue,
    allTimeYieldValue,
    shareUnitPriceBtcValue,
    chartRange,
    setChartRange,
    chartData,
    isLoadingChart,
    chartError,
    positionError,
    menuOpen,
    setMenuOpen,
    menuRef,
    notesMenuOpen,
    setNotesMenuOpen,
    notesMenuRef,
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
    handleConfirmWithdrawAmount,
    handleOpenWithdrawAmount,
    handleCloseWithdrawAmount,
    depositModalStatus,
    withdrawModalStatus,
    withdrawModalProgress,
    notes,
    notesStatus,
    linkedNotesFileName,
    notesAction,
    setNotesAction,
    isNotesSetupRequired,
    needsFileRelink,
    downloadNoteOpen,
    downloadPassword,
    setDownloadPassword,
    downloadPasswordError,
    handleOpenDownloadNote,
    handleCloseDownloadNote,
    handleRunSelectedNotesAction,
    withdrawAmountOpen,
    withdrawAmountInput,
    setWithdrawAmountInput,
    withdrawAmountError,
  } = useDashboard();

  const chartGeometry = useMemo(() => {
    const width = 760;
    const height = 220;
    const padLeft = 96;
    const padRight = 18;
    const padY = 18;

    if (chartData.length < 2) {
      return {
        path: "",
        areaPath: "",
        xTicks: [] as Array<{ x: number; label: string }>,
        yTicks: [] as Array<{ y: number; label: string }>,
      };
    }

    const sorted = [...chartData].sort((a, b) => a.timestamp - b.timestamp);
    const minX = sorted[0].timestamp;
    const maxX = sorted[sorted.length - 1].timestamp;
    const minY = Math.min(...sorted.map((point) => point.price));
    const maxY = Math.max(...sorted.map((point) => point.price));
    const spreadY = maxY - minY || 1;
    const spreadX = maxX - minX || 1;
    const innerW = width - padLeft - padRight;
    const innerH = height - padY * 2;

    const points = sorted.map((point) => {
      const x = padLeft + ((point.timestamp - minX) / spreadX) * innerW;
      const y = padY + innerH - ((point.price - minY) / spreadY) * innerH;
      return { x, y, timestamp: point.timestamp };
    });

    const path = points
      .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
      .join(" ");
    const areaPath = `${path} L ${points[points.length - 1].x.toFixed(2)} ${(height - padY).toFixed(
      2
    )} L ${padLeft.toFixed(2)} ${(height - padY).toFixed(2)} Z`;
    const mid = points[Math.floor(points.length / 2)];
    const xTicks = [
      { x: points[0].x, label: formatTick(points[0].timestamp, chartRange) },
      { x: mid.x, label: formatTick(mid.timestamp, chartRange) },
      { x: points[points.length - 1].x, label: formatTick(points[points.length - 1].timestamp, chartRange) },
    ];
    const yTicks = [0, 0.5, 1].map((ratio) => {
      const y = padY + innerH - ratio * innerH;
      const value = minY + ratio * spreadY;
      return { y, label: formatPriceTick(value) };
    });

    return { path, areaPath, xTicks, yTicks };
  }, [chartData, chartRange]);

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
    <main className="relative min-h-screen overflow-hidden bg-[#070707] px-5 pb-16 pt-6 sm:px-6 sm:pt-8">
      <div className="pointer-events-none absolute -left-20 top-16 h-64 w-64 rounded-full bg-[#f7931a]/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 top-40 h-72 w-72 rounded-full bg-[#ffb347]/10 blur-3xl" />
      <div className="mx-auto max-w-6xl">
        <nav className="sticky top-0 z-40 -mx-2 rounded-2xl border border-[#3b2a11]/70 bg-[#0d0d0d]/90 px-2 backdrop-blur-xl sm:mx-0 sm:px-4">
          <div className="flex h-16 items-center justify-between">
            <Link
              href="/"
              aria-label="Lethe home"
              className="inline-flex items-center rounded-full border border-transparent px-1 py-1 transition hover:border-[#3b2a11] hover:bg-[#151515]"
            >
              <Image
                src="/logo/logo2.png"
                alt="Lethe"
                width={122}
                height={32}
                className="h-8 w-auto"
                priority
              />
            </Link>

            <div className="flex items-center gap-3">
            <div className="relative" ref={notesMenuRef}>
              <button
                type="button"
                onClick={() => setNotesMenuOpen((open) => !open)}
                aria-expanded={notesMenuOpen}
                aria-haspopup="menu"
                className="inline-flex h-11 items-center gap-2 rounded-full border border-[#3b2a11] bg-[#121212] px-4 text-sm text-white transition hover:border-[#f7931a]/60"
              >
                <span className="font-semibold">Notes</span>
                <span className="max-w-36 truncate font-mono text-xs text-[#b7b7b7]">
                  {linkedNotesFileName ?? "No file linked"}
                </span>
              </button>
              {notesMenuOpen && (
                <div className="absolute right-0 top-full z-20 mt-2 w-72 rounded-xl border border-[#2c2c2c] bg-[#111111] py-1 shadow-panel">
                  <button
                    type="button"
                    onClick={() => {
                      setNotesMenuOpen(false);
                      router.push("/dashboard/user/notes");
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-white transition hover:bg-[#1f1f1f]"
                  >
                    See saved notes on current file
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNotesMenuOpen(false);
                      handleOpenDownloadNote("load-different");
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-white transition hover:bg-[#1f1f1f]"
                  >
                    Load notes from a different file
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNotesMenuOpen(false);
                      handleOpenDownloadNote("create-new");
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-white transition hover:bg-[#1f1f1f]"
                  >
                    Create a new notes file
                  </button>
                </div>
              )}
            </div>

            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#3b2a11] bg-[#121212] text-white transition hover:border-[#f7931a]/60"
              >
                <span className="text-sm font-semibold">{(user.name ?? "U").slice(0, 1).toUpperCase()}</span>
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full z-20 mt-2 w-44 rounded-xl border border-[#2c2c2c] bg-[#111111] py-1 shadow-panel">
                  {walletAddress && (
                    <p className="px-3 py-2 font-mono text-xs text-[#b7b7b7]">
                      {truncateAddress(walletAddress)}
                    </p>
                  )}
                  <Link
                    href="/dashboard/profile"
                    className="block px-3 py-2 text-sm text-white transition hover:bg-[#1f1f1f]"
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
                    className="w-full px-3 py-2 text-left text-sm text-[#ff9187] transition hover:bg-[#1f1f1f]"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
          </div>
        </nav>

        <section className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f8b84f]">Net Position</p>
          <p className="mt-3 font-display text-6xl leading-none text-white sm:text-7xl md:text-8xl">
            {currentPositionValue}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-2 text-sm text-[#c9c9c9]">
            <p>
              Owned shares: <span className="font-mono text-white">{allTimeYieldValue}</span>
            </p>
            <p>
              Share unit price: <span className="font-mono text-white">{shareUnitPriceBtcValue} BTC</span>
            </p>
          </div>
          <div className="mt-6 rounded-2xl border border-[#2c2c2c] bg-[#101010]/85 p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#b4b4b4]">Price History</p>
              <div className="inline-flex rounded-full border border-[#3b2a11] bg-[#161616] p-1">
                {(["1h", "1d", "7d"] as const).map((range) => (
                  <button
                    key={range}
                    type="button"
                    onClick={() => setChartRange(range)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                      chartRange === range
                        ? "bg-gradient-to-r from-[#f7931a] to-[#ffb347] text-black"
                        : "text-[#d1d1d1] hover:bg-[#232323]"
                    }`}
                  >
                    {range.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-56">
              {isLoadingChart ? (
                <div className="flex h-full items-center justify-center text-sm text-[#b4b4b4]">Loading chart...</div>
              ) : chartError ? (
                <div className="flex h-full items-center justify-center text-sm text-lethe-rose">{chartError}</div>
              ) : chartData.length < 2 ? (
                <div className="flex h-full items-center justify-center text-sm text-[#b4b4b4]">Not enough data.</div>
              ) : (
                <svg viewBox="0 0 760 220" className="h-full w-full">
                  <defs>
                    <linearGradient id="chartAreaFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f7931a" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#f7931a" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>
                  <rect x="0" y="0" width="760" height="220" fill="transparent" />
                  {chartGeometry.yTicks.map((tick) => (
                    <g key={`${tick.y}-${tick.label}`}>
                      <line x1={96} y1={tick.y} x2={742} y2={tick.y} stroke="#252525" strokeWidth="1" />
                      <text x={88} y={tick.y + 4} fill="#9f9f9f" fontSize="11" textAnchor="end">
                        {tick.label}
                      </text>
                    </g>
                  ))}
                  <path d={chartGeometry.areaPath} fill="url(#chartAreaFill)" />
                  <path d={chartGeometry.path} fill="none" stroke="#f8b84f" strokeWidth="3" strokeLinecap="round" />
                  {chartGeometry.xTicks.map((tick) => (
                    <g key={`${tick.x}-${tick.label}`}>
                      <line x1={tick.x} y1={198} x2={tick.x} y2={205} stroke="#5a5a5a" strokeWidth="1" />
                      <text x={tick.x} y={216} fill="#9f9f9f" fontSize="11" textAnchor="middle">
                        {tick.label}
                      </text>
                    </g>
                  ))}
                </svg>
              )}
            </div>
          </div>
        </section>
        {positionError && (
          <p className="mt-4 text-sm text-lethe-rose" role="alert">
            {positionError}
          </p>
        )}

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-[#3b2a11] bg-[#101010]/95 p-6 shadow-panel">
            <button
              type="button"
              onClick={() => setExpandedPanel((panel) => (panel === "deposit" ? null : "deposit"))}
              className="flex w-full items-center justify-between gap-4"
              aria-expanded={expandedPanel === "deposit"}
            >
              <div className="text-left">
                <h2 className="font-display text-3xl text-white">Deposit</h2>
                <p className="mt-1 text-sm text-[#c9c9c9]">Add capital and mint private notes.</p>
              </div>
              <span className="text-xl text-[#f8b84f]">{expandedPanel === "deposit" ? "−" : "+"}</span>
            </button>
            {expandedPanel === "deposit" && (
              <>
                <p className="mt-4 text-xs uppercase tracking-[0.14em] text-[#b4b4b4]">
                  Minimum unit: {MIN_DEPOSIT_BTC.toFixed(3)} BTC
                </p>
                <button
                  type="button"
                  onClick={handleOpenDepositAmount}
                  disabled={activeProof !== null}
                  className="mt-6 w-full rounded-full bg-gradient-to-r from-[#f7931a] to-[#ffb347] px-5 py-3 text-base font-semibold text-black transition hover:-translate-y-0.5 hover:brightness-110"
                >
                  {activeProof === "deposit" ? "Generating proof..." : "Deposit"}
                </button>
                <div className="mt-4 rounded-xl border border-[#2c2c2c] bg-[#141414] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#b4b4b4]">
                      Wallet Balance
                    </p>
                    <button
                      type="button"
                      onClick={() => refetchWBTCBalance()}
                      disabled={isLoadingWBTC}
                      aria-label="Reload balance"
                      className="rounded-full p-1.5 text-[#9a9a9a] transition hover:bg-[#222] hover:text-white disabled:opacity-50"
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
                  <p className="mt-2 font-mono text-lg text-white">
                    {isLoadingWBTC ? "…" : `${wbtcBalanceDisplay} WBTC`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => mintTestnetWBTC()}
                  disabled={isMinting || isLoadingWBTC}
                  className="mt-3 rounded-full border border-[#f7931a] bg-[#121212] px-4 py-2 text-sm font-semibold text-[#f8b84f] transition hover:bg-[#201507] disabled:opacity-50"
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
                  <div className="mt-4 rounded-xl border border-[#2c2c2c] bg-[#151515] p-3 text-xs text-[#b4b4b4]">
                    <p className="font-semibold text-white">Proof generated</p>
                    <p className="mt-1 font-mono">proof: {truncateProof(depositProof.proofHex)}</p>
                    <p className="mt-1">verified: {depositProof.verified ? "true" : "false"}</p>
                  </div>
                )}
                {notesStatus && <p className="mt-2 text-xs text-[#b4b4b4]">{notesStatus}</p>}
              </>
            )}
            {depositAmountOpen && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
                aria-modal="true"
                role="dialog"
                onClick={handleCloseDepositAmount}
              >
                <div
                  className="w-full max-w-sm rounded-2xl border border-[#3b2a11] bg-[#101010] p-6 shadow-panel"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 className="font-display text-xl text-white">Deposit WBTC</h3>
                  <p className="mt-2 text-sm text-[#c9c9c9]">
                    Enter the amount in BTC (e.g. 0.001 or 1.5).
                  </p>
                  <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-[#b4b4b4]">
                    Amount (BTC)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.001"
                    value={depositAmountInput}
                    onChange={(e) => setDepositAmountInput(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-[#3b2a11] bg-[#171717] px-4 py-3 font-mono text-white placeholder:text-[#7f7f7f] focus:border-[#f7931a] focus:outline-none focus:ring-1 focus:ring-[#f7931a]"
                    autoFocus
                  />
                  <p className="mt-2 text-xs text-[#b4b4b4]">Min: {MIN_DEPOSIT_BTC.toFixed(3)} BTC</p>
                  {depositAmountError && (
                    <p className="mt-2 text-sm text-lethe-rose" role="alert">
                      {depositAmountError}
                    </p>
                  )}
                  <div className="mt-6 flex gap-3">
                    <button
                      type="button"
                      onClick={handleCloseDepositAmount}
                      className="flex-1 rounded-full border border-[#3b2a11] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1c1c1c]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmDepositAmount}
                      className="flex-1 rounded-full bg-gradient-to-r from-[#f7931a] to-[#ffb347] px-4 py-2.5 text-sm font-semibold text-black transition hover:brightness-110"
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              </div>
            )}
            {depositModalStatus && (
              <div
                className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 px-4"
                aria-modal="true"
                role="dialog"
                aria-live="polite"
              >
                <div className="w-full max-w-sm rounded-2xl border border-[#3b2a11] bg-[#101010] p-8 shadow-panel text-center">
                  {depositModalStatus === "pending" ? (
                    <>
                      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border-2 border-lethe-amber border-t-transparent animate-spin" />
                      <h3 className="font-display text-xl text-white">Processing deposit</h3>
                      <p className="mt-2 text-sm text-[#c9c9c9]">
                        Confirm in your wallet and wait for the transaction to be mined.
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-lethe-mint/20 text-lethe-mint">
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                      <h3 className="font-display text-xl text-white">Deposit successful</h3>
                      <p className="mt-2 text-sm text-[#c9c9c9]">Your position balance will update shortly.</p>
                    </>
                  )}
                </div>
              </div>
            )}
          </article>

          <article className="rounded-2xl border border-[#3b2a11] bg-[#101010]/95 p-6 shadow-panel">
            <button
              type="button"
              onClick={() => setExpandedPanel((panel) => (panel === "withdraw" ? null : "withdraw"))}
              className="flex w-full items-center justify-between gap-4"
              aria-expanded={expandedPanel === "withdraw"}
            >
              <div className="text-left">
                <h2 className="font-display text-3xl text-white">Withdraw</h2>
                <p className="mt-1 text-sm text-[#c9c9c9]">Spend notes and exit privately.</p>
              </div>
              <span className="text-xl text-[#f8b84f]">{expandedPanel === "withdraw" ? "−" : "+"}</span>
            </button>
            {expandedPanel === "withdraw" && (
              <>
                <div className="mt-4 rounded-xl border border-[#2c2c2c] bg-[#141414] p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#b4b4b4]">Encrypted Notes</p>
                  <p className="mt-3 text-xs text-[#b4b4b4]">
                    Use the <span className="font-semibold text-white">Notes</span> menu in the header bar to load
                    or create your notes file.
                  </p>
                  <p className="mt-2 text-xs text-[#b4b4b4]">
                    Spendable notes loaded: <span className="font-semibold text-white">{notes.length}</span>
                  </p>
                </div>
                <p className="mt-4 text-xs uppercase tracking-[0.12em] text-[#b4b4b4]">
                  Minimum unit: {MIN_WITHDRAW_BTC.toFixed(3)} BTC
                </p>
                <button
                  type="button"
                  onClick={handleOpenWithdrawAmount}
                  disabled={activeProof !== null}
                  className="mt-6 w-full rounded-full border border-[#f7931a] bg-[#17120a] px-5 py-3 text-base font-semibold text-[#f8b84f] transition hover:-translate-y-0.5 hover:bg-[#261808]"
                >
                  {activeProof === "withdraw" ? "Generating proof..." : "Withdraw"}
                </button>
                {withdrawProof && (
                  <div className="mt-4 rounded-xl border border-[#2c2c2c] bg-[#151515] p-3 text-xs text-[#b4b4b4]">
                    <p className="font-semibold text-white">Proof generated</p>
                    <p className="mt-1 font-mono">proof: {truncateProof(withdrawProof.proofHex)}</p>
                    <p className="mt-1">verified: {withdrawProof.verified ? "true" : "false"}</p>
                  </div>
                )}
              </>
            )}
            {withdrawAmountOpen && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
                aria-modal="true"
                role="dialog"
                onClick={handleCloseWithdrawAmount}
              >
                <div
                  className="w-full max-w-sm rounded-2xl border border-[#3b2a11] bg-[#101010] p-6 shadow-panel"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 className="font-display text-xl text-white">Withdraw WBTC</h3>
                  <p className="mt-2 text-sm text-[#c9c9c9]">
                    Enter the amount in BTC (e.g. 0.001 or 0.5).
                  </p>
                  <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-[#b4b4b4]">
                    Amount (BTC)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.001"
                    value={withdrawAmountInput}
                    onChange={(e) => setWithdrawAmountInput(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-[#3b2a11] bg-[#171717] px-4 py-3 font-mono text-white placeholder:text-[#7f7f7f] focus:border-[#f7931a] focus:outline-none focus:ring-1 focus:ring-[#f7931a]"
                    autoFocus
                  />
                  <p className="mt-2 text-xs text-[#b4b4b4]">Min: {MIN_WITHDRAW_BTC.toFixed(3)} BTC</p>
                  {withdrawAmountError && (
                    <p className="mt-2 text-sm text-lethe-rose" role="alert">
                      {withdrawAmountError}
                    </p>
                  )}
                  <div className="mt-6 flex gap-3">
                    <button
                      type="button"
                      onClick={handleCloseWithdrawAmount}
                      className="flex-1 rounded-full border border-[#3b2a11] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1c1c1c]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmWithdrawAmount}
                      className="flex-1 rounded-full border border-[#f7931a] bg-[#17120a] px-4 py-2.5 text-sm font-semibold text-[#f8b84f] transition hover:bg-[#261808]"
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              </div>
            )}
            {withdrawModalStatus && (
              <div
                className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 px-4"
                aria-modal="true"
                role="dialog"
                aria-live="polite"
              >
                <div className="w-full max-w-sm rounded-2xl border border-[#3b2a11] bg-[#101010] p-8 shadow-panel text-center">
                  {withdrawModalStatus === "pending" ? (
                    <>
                      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border-2 border-lethe-line border-t-transparent animate-spin" />
                      <h3 className="font-display text-xl text-white">Processing withdraw</h3>
                      <p className="mt-2 text-sm text-[#c9c9c9]">
                        {withdrawModalProgress ?? "Confirm in your wallet and wait for transaction finalization."}
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-lethe-mint/20 text-lethe-mint">
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                      <h3 className="font-display text-xl text-white">Withdraw successful</h3>
                      <p className="mt-2 text-sm text-[#c9c9c9]">
                        {withdrawModalProgress ?? "Your notes and balance were updated."}
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}
          </article>
        </section>
        {downloadNoteOpen && (
          <div
            className="fixed inset-0 z-[65] flex items-center justify-center bg-black/75 px-4"
            aria-modal="true"
            role="dialog"
            onClick={handleCloseDownloadNote}
          >
            <div
              className="w-full max-w-sm rounded-2xl border border-[#3b2a11] bg-[#101010] p-6 shadow-panel"
              onClick={(event) => event.stopPropagation()}
            >
              <h3 className="font-display text-xl text-white">Notes file manager</h3>
              {linkedNotesFileName && notesAction === "view-current" ? (
                <>
                  <p className="mt-2 text-sm text-[#c9c9c9]">
                    Current note file: <span className="font-mono text-white">{linkedNotesFileName}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => setNotesAction("load-different")}
                    className="mt-3 text-xs font-semibold text-[#f8b84f] transition hover:underline"
                  >
                    Load/create a different file
                  </button>
                </>
              ) : (
                <>
                  <p className="mt-2 text-sm text-[#c9c9c9]">
                    {isNotesSetupRequired
                      ? "Loading a notes file is required before using the dashboard."
                      : "Choose how to continue with notes."}
                  </p>
                  <div className="mt-4 grid gap-2">
                    <button
                      type="button"
                      onClick={() => setNotesAction("load-different")}
                      className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                        notesAction === "load-different"
                          ? "border-[#f7931a] bg-[#2a1b09] text-white"
                          : "border-[#2c2c2c] text-white hover:bg-[#1d1d1d]"
                      }`}
                    >
                      Load notes from a different file
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotesAction("create-new")}
                      className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                        notesAction === "create-new"
                          ? "border-[#f7931a] bg-[#2a1b09] text-white"
                          : "border-[#2c2c2c] text-white hover:bg-[#1d1d1d]"
                      }`}
                    >
                      Create a new notes file
                    </button>
                    {linkedNotesFileName && (
                      <button
                        type="button"
                        onClick={() => setNotesAction("view-current")}
                        className="w-full rounded-xl border border-[#2c2c2c] px-3 py-2 text-left text-sm text-white transition hover:bg-[#1d1d1d]"
                      >
                        Back to current file ({linkedNotesFileName})
                      </button>
                    )}
                  </div>
                </>
              )}
              <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-[#b4b4b4]">
                Password
              </label>
              <input
                type="password"
                value={downloadPassword}
                onChange={(event) => setDownloadPassword(event.target.value)}
                className="mt-2 w-full rounded-xl border border-[#3b2a11] bg-[#171717] px-4 py-3 text-white placeholder:text-[#7f7f7f] focus:border-[#f7931a] focus:outline-none focus:ring-1 focus:ring-[#f7931a]"
                placeholder="••••••••"
                autoFocus
              />
              {downloadPasswordError && (
                <p className="mt-2 text-sm text-lethe-rose" role="alert">
                  {downloadPasswordError}
                </p>
              )}
              {needsFileRelink && (
                <p className="mt-2 text-xs text-[#b4b4b4]">
                  The previous linked path is no longer available. Load another file or create a new one.
                </p>
              )}
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={handleCloseDownloadNote}
                  disabled={isNotesSetupRequired}
                  className="flex-1 rounded-full border border-[#3b2a11] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1c1c1c]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRunSelectedNotesAction}
                  className="flex-1 rounded-full bg-gradient-to-r from-[#f7931a] to-[#ffb347] px-4 py-2.5 text-sm font-semibold text-black transition hover:brightness-110"
                >
                  {notesAction === "view-current"
                    ? "Load current file"
                    : notesAction === "load-different"
                      ? "Load selected file"
                      : "Create file"}
                </button>
              </div>
            </div>
          </div>
        )}
        {proofError && (
          <p className="mt-4 text-sm text-lethe-rose" role="alert">
            {proofError}
          </p>
        )}
      </div>
    </main>
  );
}
