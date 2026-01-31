import type { Metadata } from "next";
import { Inter } from "next/font/google"; // Using proper import for built-in fonts
import "./globals.css";
import { WalletContextProvider } from "@/components/WalletContextProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Perpl - Private Perp DEX",
  description: "Private Order Book on Solana",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <WalletContextProvider>
          {children}
        </WalletContextProvider>
      </body>
    </html>
  );
}
