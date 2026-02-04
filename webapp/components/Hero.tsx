import Link from "next/link";
import Image from "next/image";

export interface HeroProps {
  onTryDemo: () => void;
}

export function Hero({ onTryDemo }: HeroProps) {
  return (
    <section className="relative overflow-hidden px-4 pt-24 pb-16 md:pt-32 md:pb-24">
      <div className="mx-auto max-w-4xl text-center">
        <Image
          src="/logo/logo2.png"
          alt="Lethe"
          width={200}
          height={80}
          className="mx-auto h-16 w-auto md:h-20"
          priority
        />
        <h1 className="mt-4 font-cinzel text-4xl font-bold tracking-tight text-white md:text-5xl lg:text-6xl">
          Lethe
        </h1>
        <p className="mt-4 text-xl text-lethe-orange md:text-2xl">
          Private Bitcoin Yield. No surveillance. No compromises.
        </p>
        <p className="mt-6 max-w-2xl mx-auto text-gray-400 text-lg">
          Earn yield on your Bitcoin with full privacy. Built on Starknet with
          wBTC — your keys, your coins, zero leakage.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            onClick={onTryDemo}
            className="rounded bg-lethe-orange px-6 py-3 font-medium text-black transition hover:bg-lethe-orange-glow focus:outline-none focus:ring-2 focus:ring-lethe-orange"
          >
            Connect Wallet
          </button>
          <Link
            href="/app"
            className="rounded border border-lethe-black-border bg-transparent px-6 py-3 font-medium text-gray-300 transition hover:border-lethe-orange/50 hover:text-white"
          >
            Try the demo
          </Link>
        </div>
      </div>
    </section>
  );
}
