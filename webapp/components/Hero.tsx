import Link from "next/link";

export interface HeroProps {
  onTryDemo: () => void;
}

export function Hero({ onTryDemo }: HeroProps) {
  return (
    <section className="relative px-4 pb-20 pt-28 sm:pt-36">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="inline-flex items-center rounded-full border border-lethe-line bg-lethe-card/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-lethe-mint">
            Starknet-native private yield
          </p>
          <h1 className="mt-6 font-display text-5xl font-semibold leading-[0.95] text-lethe-text sm:text-6xl md:text-7xl">
            Keep Your Bitcoin Yield
            <span className="block text-lethe-amber">Invisible to Everyone Else</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-lethe-muted sm:text-lg">
            Lethe turns wBTC deposits into private notes. You accrue yield publicly, but positions and spend paths stay hidden behind zero-knowledge proofs.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onTryDemo}
              className="rounded-full bg-lethe-mint px-6 py-3 text-sm font-semibold text-lethe-ink transition hover:-translate-y-0.5 hover:bg-[#93ffd8]"
            >
              Connect Wallet
            </button>
            <Link
              href="/app"
              className="rounded-full border border-lethe-line bg-lethe-card/70 px-6 py-3 text-sm font-semibold text-lethe-text transition hover:border-lethe-amber/70 hover:text-lethe-amber"
            >
              Open Demo App
            </Link>
          </div>
        </div>

        <div className="mx-auto mt-16 grid max-w-4xl gap-4 sm:grid-cols-3">
          <Feature title="Private Notes" body="Commitments represent position units without exposing identity." />
          <Feature title="Share-based Yield" body="Vault math remains public while ownership stays private." />
          <Feature title="One-time Nullifiers" body="Spent notes cannot be replayed or double-withdrawn." />
        </div>
      </div>
    </section>
  );
}

interface FeatureProps {
  title: string;
  body: string;
}

function Feature({ title, body }: FeatureProps) {
  return (
    <article className="animate-float rounded-2xl border border-lethe-line bg-lethe-card/70 p-5 shadow-glow [animation-delay:180ms]">
      <h3 className="font-display text-2xl text-lethe-text">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-lethe-muted">{body}</p>
    </article>
  );
}
