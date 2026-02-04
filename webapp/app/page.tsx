"use client";

import { useWallet } from "@/hooks/useWallet";
import { useMockContracts } from "@/hooks/useMockContracts";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { Explanation } from "@/components/Explanation";
import { Stats } from "@/components/Stats";
import { Footer } from "@/components/Footer";

export default function HomePage() {
  const wallet = useWallet();
  const contracts = useMockContracts(wallet.isConnected);

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
      <Footer />
    </>
  );
}
