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
    { label: "Total BTC deposited", value: formatBtc(totalBtcDeposited), unit: "BTC" },
    { label: "Total BTC yielded", value: formatBtc(totalBtcYielded), unit: "BTC" },
    { label: "Active positions", value: activePositions.toLocaleString(), unit: "" },
  ];

  return (
    <section className="border-y border-lethe-black-border bg-lethe-black-soft px-4 py-12">
      <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
        {items.map(({ label, value, unit }) => (
          <div key={label} className="text-center">
            <p className="font-sans text-2xl font-semibold text-lethe-orange md:text-3xl">
              {value}
              {unit && <span className="ml-1 text-lg text-gray-500">{unit}</span>}
            </p>
            <p className="mt-1 text-sm text-gray-500">{label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
