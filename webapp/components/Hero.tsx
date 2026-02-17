import Link from "next/link";

export interface HeroProps {
  onTryDemo: () => void;
}

export function Hero({ onTryDemo }: HeroProps) {
  return (
    <section className="relative px-4 pb-20 pt-28 sm:pt-36">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="inline-flex items-center rounded-full border border-[#3b2a11] bg-[#121212]/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#f8b84f]">
            Starknet-native private yield
          </p>
          <h1 className="mt-6 font-display text-5xl font-semibold leading-[0.95] text-white sm:text-6xl md:text-7xl">
            Keep Your Bitcoin Yield
            <span className="block text-[#f8b84f]">Invisible to Everyone Else</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-[#c9c9c9] sm:text-lg">
            Lethe turns wBTC deposits into private notes. You accrue yield publicly, but positions and spend paths stay hidden behind zero-knowledge proofs.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onTryDemo}
              className="rounded-full bg-gradient-to-r from-[#f7931a] to-[#ffb347] px-6 py-3 text-sm font-semibold text-black transition hover:-translate-y-0.5 hover:brightness-110"
            >
              Connect Wallet
            </button>
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
    <article className="animate-float rounded-2xl border border-[#3b2a11] bg-[#121212]/80 p-5 shadow-panel [animation-delay:180ms]">
      <h3 className="font-display text-2xl text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-[#c9c9c9]">{body}</p>
    </article>
  );
}
