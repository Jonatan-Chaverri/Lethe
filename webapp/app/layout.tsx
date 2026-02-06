import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lethe | Private Bitcoin Yield on Starknet",
  description:
    "Private Bitcoin Yield. No surveillance. No compromises. Built on Starknet with wBTC.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-lethe-ink text-lethe-text antialiased">
        {children}
      </body>
    </html>
  );
}
