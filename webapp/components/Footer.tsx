import Link from "next/link";

interface FooterProps {
  apiStatus?: "online" | "offline" | "unknown";
}

export function Footer({ apiStatus = "unknown" }: FooterProps) {
  const statusColor =
    apiStatus === "online"
      ? "text-[#f8b84f]"
      : apiStatus === "offline"
        ? "text-[#ff9187]"
        : "text-[#b4b4b4]";

  return (
    <footer className="border-t border-[#3b2a11]/70 bg-[#0d0d0d]/90 px-4 py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 text-center sm:flex-row sm:text-left">
        <div>
          <p className="text-sm text-[#b4b4b4]">
            Lethe, private Bitcoin yield infrastructure on Starknet.
          </p>
          <p className={`mt-1 text-xs ${statusColor}`}>Backend API: {apiStatus}</p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/" className="text-[#b4b4b4] transition hover:text-[#f8b84f]">
            Home
          </Link>
          <Link href="/dashboard" className="text-[#b4b4b4] transition hover:text-[#f8b84f]">
            Dashboard
          </Link>
        </div>
      </div>
    </footer>
  );
}
