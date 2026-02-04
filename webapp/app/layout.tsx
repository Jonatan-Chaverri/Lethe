import type { Metadata } from "next";
import { Cinzel, Inter } from "next/font/google";
import "./globals.css";

const cinzel = Cinzel({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-cinzel",
});

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Lethe — Private Bitcoin Yield on Starknet",
  description:
    "Private Bitcoin Yield. No surveillance. No compromises. Built on Starknet with wBTC.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${cinzel.variable} ${inter.variable} bg-lethe-black text-gray-200`}>
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
