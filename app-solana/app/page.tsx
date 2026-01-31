"use client";

import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useEffect, useState } from "react";
import { ArciumClient } from "@/lib/arcium_client";
import { getProgram, findUserVault } from "@/lib/anchor_client";
import { OrderSide, OrderBookState } from "@/lib/types";
import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

export default function Home() {
  const { connection } = useConnection();
  const wallet = useWallet();

  // State
  const [balance, setBalance] = useState<number>(0);
  const [orderBook, setOrderBook] = useState<OrderBookState>({ bids: [], asks: [] });
  const [depositAmount, setDepositAmount] = useState<string>("");
  const [price, setPrice] = useState<string>("");
  const [size, setSize] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Poll OrderBook (Simulating live updates)
  useEffect(() => {
    const interval = setInterval(async () => {
      const client = ArciumClient.getInstance();
      const book = await client.getOrderBook();
      setOrderBook({ ...book });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch User Vault Balance
  useEffect(() => {
    if (wallet.publicKey) {
      fetchBalance();
    }
  }, [wallet.publicKey]);

  const fetchBalance = async () => {
    if (!wallet.publicKey) return;
    try {
      const program = getProgram(connection, wallet);
      const [vaultPda] = findUserVault(wallet.publicKey);
      const account: any = await program.account.userVault.fetch(vaultPda);
      setBalance(account.collateralBalance.toNumber());
    } catch (e) {
      console.log("Vault not found or error:", e);
      setBalance(0);
    }
  };

  const handleDeposit = async () => {
    if (!wallet.publicKey) return;
    setIsLoading(true);
    try {
      const program = getProgram(connection, wallet);
      const amount = new BN(parseInt(depositAmount));
      // In a real app we need token accounts. For this verified demo, we assume wrapped SOL or setup USDC
      await program.methods.deposit(amount).rpc();
      await fetchBalance();
    } catch (e) {
      console.error(e);
      alert("Deposit Failed: " + (e as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlaceOrder = async (side: OrderSide) => {
    if (!wallet.publicKey) return;
    setIsLoading(true);
    try {
      const client = ArciumClient.getInstance();
      await client.placeOrder(
        wallet.publicKey.toBase58(),
        side,
        parseFloat(price),
        parseFloat(size)
      );
      alert("Order Placed (Encrypted)!");
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-24 bg-zinc-950 text-white">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">
        <p className="fixed left-0 top-0 flex w-full justify-center border-b border-zinc-700 bg-zinc-900 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 lg:static lg:w-auto  lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-900/30">
          Perpl &nbsp;
          <code className="font-bold">v2 (Solana + Arcium)</code>
        </p>
        <div className="fixed bottom-0 left-0 flex h-48 w-full items-end justify-center bg-gradient-to-t from-white via-white dark:from-black dark:via-black lg:static lg:h-auto lg:w-auto lg:bg-none">
          <WalletMultiButton />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl mt-12">
        {/* Left: Trading */}
        <div className="bg-zinc-900 p-8 rounded-xl border border-zinc-800">
          <h2 className="text-2xl font-bold mb-4">Trade (Private)</h2>
          <div className="flex flex-col gap-4">
            <input
              placeholder="Price (USDC)"
              className="bg-black border border-zinc-700 p-3 rounded"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
            <input
              placeholder="Size"
              className="bg-black border border-zinc-700 p-3 rounded"
              value={size}
              onChange={(e) => setSize(e.target.value)}
            />
            <div className="flex gap-4">
              <button
                onClick={() => handlePlaceOrder(OrderSide.Bid)}
                disabled={isLoading}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded transition"
              >
                Long (Buy)
              </button>
              <button
                onClick={() => handlePlaceOrder(OrderSide.Ask)}
                disabled={isLoading}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded transition"
              >
                Short (Sell)
              </button>
            </div>
          </div>

          <div className="mt-8 border-t border-zinc-800 pt-6">
            <h3 className="font-bold mb-2">Vault Balance</h3>
            <p className="text-4xl font-mono">{balance} <span className="text-sm text-gray-400">USDC</span></p>
            <div className="flex gap-2 mt-4">
              <input
                placeholder="Amount"
                className="bg-black border border-zinc-700 p-2 rounded w-full"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
              />
              <button
                onClick={handleDeposit}
                disabled={isLoading}
                className="bg-blue-600 px-4 rounded font-bold"
              >
                Deposit
              </button>
            </div>
          </div>
        </div>

        {/* Right: Order Book */}
        <div className="bg-zinc-900 p-8 rounded-xl border border-zinc-800">
          <h2 className="text-2xl font-bold mb-4">Arcium Order Book (Persistent MXE)</h2>
          <div className="font-mono text-sm">
            <div className="flex justify-between text-gray-500 mb-2">
              <span>Price</span>
              <span>Size</span>
              <span>Side</span>
            </div>
            {/* Asks (Sell) - Red */}
            <div className="flex flex-col-reverse">
              {orderBook.asks.map((ask, i) => (
                <div key={i} className="flex justify-between text-red-400 py-1">
                  <span>{ask.price.toFixed(2)}</span>
                  <span>{ask.size.toFixed(2)}</span>
                  <span>ASK</span>
                </div>
              ))}
            </div>

            <div className="border-y border-zinc-800 my-2 py-2 text-center text-gray-600">
              Spread: {(orderBook.asks[0]?.price - orderBook.bids[0]?.price || 0).toFixed(2)}
            </div>

            {/* Bids (Buy) - Green */}
            {orderBook.bids.map((bid, i) => (
              <div key={i} className="flex justify-between text-green-400 py-1">
                <span>{bid.price.toFixed(2)}</span>
                <span>{bid.size.toFixed(2)}</span>
                <span>BID</span>
              </div>
            ))}

            {orderBook.bids.length === 0 && orderBook.asks.length === 0 && (
              <div className="text-center text-gray-600 py-8">
                Order Book is Empty
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
