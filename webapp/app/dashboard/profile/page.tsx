"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#2c2c2c] bg-[#141414] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#b4b4b4]">{label}</p>
      <p className="mt-2 break-all font-mono text-sm text-white">{value}</p>
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, isBootstrapping } = useAuth();

  useEffect(() => {
    if (!isBootstrapping && !isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, isBootstrapping, router]);

  if (isBootstrapping) {
    return (
      <main className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-5 sm:px-6">
        <p className="text-sm text-lethe-muted">Loading profile...</p>
      </main>
    );
  }

  if (!isAuthenticated || !user) return null;

  return (
    <main className="min-h-screen px-5 pb-16 pt-24 sm:px-6 sm:pt-28">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-4xl text-white">My Profile</h1>
          <Link
            href="/dashboard"
            className="rounded-full border border-[#3b2a11] bg-[#121212] px-4 py-2 text-sm text-white transition hover:border-[#f7931a]/60"
          >
            Back to dashboard
          </Link>
        </div>

        <div className="mt-8 grid gap-4">
          <Field label="User ID" value={user.id} />
          <Field label="Wallet" value={user.wallet} />
          <Field label="Wallet Provider" value={user.wallet_provider} />
          <Field label="Email" value={user.email ?? "Not set"} />
          <Field label="Name" value={user.name ?? "Not set"} />
          <Field label="Created At" value={new Date(user.created_at).toLocaleString()} />
        </div>
      </div>
    </main>
  );
}
