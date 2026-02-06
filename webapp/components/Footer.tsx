import Link from "next/link";

interface FooterProps {
  apiStatus?: "online" | "offline" | "unknown";
}

export function Footer({ apiStatus = "unknown" }: FooterProps) {
  const statusColor =
    apiStatus === "online"
      ? "text-lethe-mint"
      : apiStatus === "offline"
        ? "text-lethe-rose"
        : "text-lethe-muted";

  return (
    <footer className="border-t border-lethe-line/80 bg-lethe-ink/90 px-4 py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 text-center sm:flex-row sm:text-left">
        <div>
          <p className="text-sm text-lethe-muted">
            Lethe, private Bitcoin yield infrastructure on Starknet.
          </p>
          <p className={`mt-1 text-xs ${statusColor}`}>Backend API: {apiStatus}</p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/" className="text-lethe-muted transition hover:text-lethe-mint">
            Home
          </Link>
          <Link href="/app" className="text-lethe-muted transition hover:text-lethe-amber">
            App
          </Link>
        </div>
      </div>
    </footer>
  );
}
