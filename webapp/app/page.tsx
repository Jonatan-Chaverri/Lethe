"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { Explanation } from "@/components/Explanation";
import { Stats } from "@/components/Stats";
import { Footer } from "@/components/Footer";
import { useMockContracts } from "@/hooks/useMockContracts";
import { useWalletLogin } from "@/hooks/useWalletLogin";
import { useAuth } from "@/hooks/useAuth";
import { health } from "@/lib/api/health";

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isBootstrapping } = useAuth();
  const {
    address,
    isRegistered,
    isConnecting,
    error,
    connectWallet,
    disconnectWallet,
  } = useWalletLogin();

  const wallet = {
    isConnected: isRegistered,
    address,
    isConnecting,
    error,
    connectWallet,
    disconnectWallet,
  };

  const contracts = useMockContracts(wallet.isConnected);
  const [apiStatus, setApiStatus] = useState<"online" | "offline" | "unknown">("unknown");

  useEffect(() => {
    if (!isBootstrapping && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, isBootstrapping, router]);

  useEffect(() => {
    let mounted = true;

    health()
      .then(() => {
        if (mounted) setApiStatus("online");
      })
      .catch(() => {
        if (mounted) setApiStatus("offline");
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleTryDemo = () => {
    if (!wallet.isConnected) {
      connectWallet();
    }
  };

  return (
    <>
      <Navbar wallet={wallet} />
      <main>
        <Hero onTryDemo={handleTryDemo} />
        <Stats
          totalBtcDeposited={contracts.getTotalDepositedBtc()}
          totalBtcYielded={contracts.getTotalYieldedBtc()}
          activePositions={contracts.getActivePositions()}
        />
        <Explanation />
      </main>
      <Footer apiStatus={apiStatus} />
    </>
  );
}
