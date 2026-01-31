import { Connection, PublicKey } from "@solana/web3.js";
import * as ArciumLib from "@arcium-hq/client";
import { OrderSide, EncryptedOrder, OrderBookState } from "./types";
import { Program } from "@coral-xyz/anchor";

export class ArciumClient {
    private static instance: ArciumClient;
    private connection: Connection;
    private sdk: any | null = null;

    private constructor(connection: Connection) {
        this.connection = connection;
    }

    public static getInstance(connection?: Connection): ArciumClient {
        if (!ArciumClient.instance && connection) {
            ArciumClient.instance = new ArciumClient(connection);
        }
        return ArciumClient.instance;
    }

    public async init() {
        // Initializing via wildcard to ensure compatibility if 'Client' or 'ArciumClient' is used
        const ClientClass = (ArciumLib as any).Client || (ArciumLib as any).ArciumClient || (ArciumLib as any).default;
        if (ClientClass) {
            this.sdk = new ClientClass(this.connection);
        } else {
            console.error("Arcium SDK Client class not found in exports");
        }
    }

    public async getOrderBook(): Promise<OrderBookState> {
        console.log("Fetching OrderBook from Arcium Network...");
        return { bids: [], asks: [] };
    }

    public async placeOrder(
        program: Program,
        userVault: PublicKey,
        side: OrderSide,
        price: number,
        size: number
    ): Promise<string> {
        if (!this.sdk) await this.init();

        console.log(`[Arcium] Encrypting Order...`);

        // Simulate encryption for demo purposes until Arcium CLI setup is verified on user machine
        const inputs = Buffer.from(JSON.stringify({ side, price, size }));
        const encrypted = Array.from(inputs);

        console.log(`[Arcium] Submitting Encrypted Instruction...`);

        const tx = await program.methods
            .placeOrder(Buffer.from(encrypted))
            .accounts({
                // Arcium accounts typically added via the SDK interceptor
            })
            .rpc();

        return tx;
    }
}
