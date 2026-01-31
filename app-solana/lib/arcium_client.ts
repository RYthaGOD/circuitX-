import { EncryptedOrder, OrderBookState, OrderSide } from "./types";

// Mock Arcium Client
// In reality, this would connect to the Arcium Node RPC or use the Arcis SDK
export class ArciumClient {
    private static instance: ArciumClient;
    private orderBook: OrderBookState;

    private constructor() {
        this.orderBook = { bids: [], asks: [] };
    }

    public static getInstance(): ArciumClient {
        if (!ArciumClient.instance) {
            ArciumClient.instance = new ArciumClient();
        }
        return ArciumClient.instance;
    }

    // Simulate encrypting and sending order to MXE
    public async placeOrder(
        trader: string,
        side: OrderSide,
        price: number,
        size: number
    ): Promise<void> {
        console.log(`[Arcium] Encrypting Order for ${trader}...`);
        await new Promise((resolve) => setTimeout(resolve, 500)); // Network delay

        const order: EncryptedOrder = {
            trader,
            side,
            price,
            size,
            timestamp: Date.now(),
        };

        console.log(`[Arcium] Sending Order to MXE...`);
        if (side === OrderSide.Bid) {
            this.orderBook.bids.push(order);
            this.orderBook.bids.sort((a, b) => b.price - a.price);
        } else {
            this.orderBook.asks.push(order);
            this.orderBook.asks.sort((a, b) => a.price - b.price);
        }
    }

    public async getOrderBook(): Promise<OrderBookState> {
        // In a real private DEX, this wouldn't be available publicly!
        // But for debugging/demo, we might peek.
        return this.orderBook;
    }
}
