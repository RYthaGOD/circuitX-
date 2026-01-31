import { PublicKey } from "@solana/web3.js";

// --- Arcium Types ---
export enum OrderSide {
    Bid = "Bid",
    Ask = "Ask",
}

export interface EncryptedOrder {
    // In a real app, these fields would be encrypted blobs.
    // For simulation, we keep them plain but label them "Encrypted"
    trader: string; // Pubkey string
    side: OrderSide;
    price: number;
    size: number;
    timestamp: number;
}

export interface OrderBookState {
    bids: EncryptedOrder[];
    asks: EncryptedOrder[];
}

// --- Solana Types ---
export interface UserVaultState {
    collateralBalance: number; // u64 in rust, num here
}

export interface UserPosition {
    marketId: string;
    size: number;
    collateral: number;
    entryPrice: number;
}
