export function Explanation() {
  return (
    <section className="px-4 py-16 md:py-24">
      <div className="mx-auto max-w-3xl">
        <h2 className="font-cinzel text-2xl font-semibold text-white md:text-3xl">
          What is Lethe?
        </h2>
        <p className="mt-4 text-gray-400 leading-relaxed">
          Lethe is a private yield protocol for Bitcoin on Starknet. You deposit
          wBTC and earn yield without exposing your balance or activity to the
          world. We use zero-knowledge proofs and Starknet’s privacy-friendly
          design so that your position and rewards stay yours alone.
        </p>
        <h3 className="mt-10 font-cinzel text-xl font-semibold text-lethe-orange">
          Why privacy matters for Bitcoin yield
        </h3>
        <p className="mt-3 text-gray-400 leading-relaxed">
          Transparent DeFi leaks your wealth and behavior. Lethe gives you
          Bitcoin-native yield with cypherpunk-grade privacy: no surveillance,
          no front-running, no compromise. Your keys, your coins, your business.
        </p>
      </div>
    </section>
  );
}
