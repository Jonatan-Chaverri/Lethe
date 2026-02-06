"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { Explanation } from "@/components/Explanation";
import { Stats } from "@/components/Stats";
import { Footer } from "@/components/Footer";
import { useMockContracts } from "@/hooks/useMockContracts";
import { useWallet } from "@/hooks/useWallet";
import { health } from "@/lib/api/health";

export default function HomePage() {
  const wallet = useWallet();
  const contracts = useMockContracts(wallet.isConnected);
  const [apiStatus, setApiStatus] = useState<"online" | "offline" | "unknown">("unknown");

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
      wallet.connectWallet("argentx");
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
