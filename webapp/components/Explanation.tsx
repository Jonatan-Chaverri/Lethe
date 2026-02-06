const principles = [
  {
    title: "Commitments over balances",
    body: "User state is represented as commitments in a Merkle tree instead of public wallet balances.",
  },
  {
    title: "Proofs at withdrawal",
    body: "Users prove ownership and note validity without revealing which deposit funded the withdrawal.",
  },
  {
    title: "Public solvency math",
    body: "Vault share accounting stays auditable while individual ownership trails stay private.",
  },
] as const;

export function Explanation() {
  return (
    <section className="px-4 pb-20 pt-10">
      <div className="mx-auto grid max-w-5xl gap-8 rounded-3xl border border-lethe-line bg-lethe-card/70 p-6 shadow-panel sm:p-10 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-4xl text-lethe-text sm:text-5xl">
            How Lethe stays private
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-lethe-muted">
            The vault keeps global accounting transparent while unlinking deposits from withdrawals. This gives users Bitcoin yield exposure with less on-chain behavioral leakage.
          </p>
        </div>

        <div className="space-y-4">
          {principles.map((item, index) => (
            <article
              key={item.title}
              className="rounded-2xl border border-lethe-line bg-lethe-steel/30 p-5"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-lethe-mint">
                0{index + 1}
              </p>
              <h3 className="mt-2 font-display text-2xl text-lethe-text">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-lethe-muted">
                {item.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
