export interface StatsProps {
  totalBtcDeposited: number;
  totalBtcYielded: number;
  activePositions: number;
}

function formatBtc(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

export function Stats({
  totalBtcDeposited,
  totalBtcYielded,
  activePositions,
}: StatsProps) {
  const items = [
    {
      label: "Total BTC deposited",
      value: formatBtc(totalBtcDeposited),
      suffix: "BTC",
      tone: "text-lethe-mint",
    },
    {
      label: "Total BTC yielded",
      value: formatBtc(totalBtcYielded),
      suffix: "BTC",
      tone: "text-lethe-amber",
    },
    {
      label: "Active positions",
      value: activePositions.toLocaleString(),
      suffix: "",
      tone: "text-lethe-rose",
    },
  ] as const;

  return (
    <section className="px-4 py-8 sm:py-10">
      <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-3">
        {items.map(({ label, value, suffix, tone }) => (
          <article
            key={label}
            className="rounded-2xl border border-lethe-line bg-lethe-card/80 p-6 shadow-panel"
          >
            <p className={`font-mono text-2xl font-semibold sm:text-3xl ${tone}`}>
              {value}
              {suffix && (
                <span className="ml-1 text-sm font-medium tracking-wide text-lethe-muted">
                  {suffix}
                </span>
              )}
            </p>
            <p className="mt-2 text-sm text-lethe-muted">{label}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
