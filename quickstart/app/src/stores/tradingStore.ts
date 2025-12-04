import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Account } from 'starknet';
import { MARKETS } from '../config/contracts';

// Types
export interface Position {
  commitment: string; // Commitment hash (public)
  marketId: string;
  isLong: boolean;
  // Private data (only visible to user locally)
  size?: string;
  entryPrice?: string;
  margin?: string;
  pnl?: string;
  timestamp: number;
  traderSecret?: string; // Secret used for commitment (needed for closing)
  leverage?: number; // Leverage used (needed for PnL calculation)
}

export interface Order {
  id: string;
  marketId: string;
  isLong: boolean;
  size: string;
  price: string;
  orderType: 'market' | 'limit' | 'twap';
  status: 'pending' | 'filled' | 'cancelled';
  timestamp: number;
}

export interface MarketData {
  marketId: string;
  symbol: string;
  currentPrice: string;
  priceChange24h: string;
  volume24h: string;
  openInterest: string;
}

interface TradingState {
  // Wallets
  sepoliaAccount: Account | null; // Sepolia wallet for identity
  ztarknetAccount: Account | null; // Ztarknet wallet for trading
  isSepoliaConnected: boolean;
  isZtarknetReady: boolean;
  availableBalance: string; // yUSD balance (wei string)
  
  // Trading State
  selectedMarket: string;
  positions: Position[];
  orders: Order[];
  markets: MarketData[];
  
  // UI State
  orderType: 'market' | 'limit' | 'twap';
  orderSide: 'long' | 'short';
  orderSize: string;
  orderPrice: string;
  collateral: string;
  
  // Actions
  setSepoliaAccount: (account: Account | null) => void;
  setZtarknetAccount: (account: Account | null) => void;
  setSelectedMarket: (marketId: string) => void;
  setAvailableBalance: (balance: string) => void;
  addPosition: (position: Position) => void;
  updatePosition: (commitment: string, updates: Partial<Position>) => void;
  removePosition: (commitment: string) => void;
  setPositions: (positions: Position[]) => void; // For syncing from blockchain
  addOrder: (order: Order) => void;
  updateOrder: (id: string, updates: Partial<Order>) => void;
  setMarkets: (markets: MarketData[]) => void;
  updateMarketPrice: (marketId: string, price: string) => void;
  setOrderType: (type: 'market' | 'limit' | 'twap') => void;
  setOrderSide: (side: 'long' | 'short') => void;
  setOrderSize: (size: string) => void;
  setOrderPrice: (price: string) => void;
  setCollateral: (amount: string) => void;
  resetOrderForm: () => void;
}

export const useTradingStore = create<TradingState>()(
  persist(
    (set, get) => ({
      // Initial State
      sepoliaAccount: null,
      ztarknetAccount: null,
      isSepoliaConnected: false,
      isZtarknetReady: false,
      availableBalance: '0',
      selectedMarket: MARKETS.BTC_USD, // BTC/USD default
      positions: [],
      orders: [],
      markets: [],
      orderType: 'market',
      orderSide: 'long',
      orderSize: '',
      orderPrice: '',
      collateral: '',
      
      // Actions
      setSepoliaAccount: (account) => set({ sepoliaAccount: account, isSepoliaConnected: !!account }),
      setZtarknetAccount: (account) => set({ ztarknetAccount: account, isZtarknetReady: !!account }),
      setAvailableBalance: (balance) => set({ availableBalance: balance }),
      
      setSelectedMarket: (marketId) => set({ selectedMarket: marketId }),
      
      addPosition: (position) => {
        console.log('➕ Adding position to store:', {
          commitment: position.commitment.slice(0, 16) + '...',
          marketId: position.marketId,
          hasMargin: !!position.margin,
          hasEntryPrice: !!position.entryPrice,
        });
        set((state) => {
          const newPositions = [...state.positions, position];
          console.log('📝 Updated positions count:', newPositions.length);
          return { positions: newPositions };
        });
      },
      
      updatePosition: (commitment, updates) =>
        set((state) => ({
          positions: state.positions.map((p) =>
            p.commitment === commitment ? { ...p, ...updates } : p
          ),
        })),
      
      removePosition: (commitment) =>
        set((state) => ({
          positions: state.positions.filter((p) => p.commitment !== commitment),
        })),
      
      setPositions: (positions) => set({ positions }),
  
  addOrder: (order) =>
    set((state) => ({ orders: [...state.orders, order] })),
  
  updateOrder: (id, updates) =>
    set((state) => ({
      orders: state.orders.map((o) =>
        o.id === id ? { ...o, ...updates } : o
      ),
    })),
  
  setMarkets: (markets) => set({ markets }),
  
  updateMarketPrice: (marketId, price) =>
    set((state) => ({
      markets: state.markets.map((m) =>
        m.marketId === marketId ? { ...m, currentPrice: price } : m
      ),
    })),
  
  setOrderType: (type) => set({ orderType: type }),
  setOrderSide: (side) => set({ orderSide: side }),
  setOrderSize: (size) => set({ orderSize: size }),
  setOrderPrice: (price) => set({ orderPrice: price }),
  setCollateral: (amount) => set({ collateral: amount }),
  
  resetOrderForm: () =>
    set({
      orderSize: '',
      orderPrice: '',
      collateral: '',
      orderType: 'market',
    }),
    }),
    {
      name: 'ztarknet-trading-store',
      storage: createJSONStorage(() => localStorage),
      // Only persist orders and selected market - NOT positions
      // Positions are fetched from on-chain based on locked collateral
      // Don't persist account objects (they can't be serialized)
      partialize: (state) => {
        const partial = {
          // positions: state.positions, // REMOVED: Positions are now fetched from on-chain
          orders: state.orders,
          selectedMarket: state.selectedMarket,
          orderType: state.orderType,
          orderSide: state.orderSide,
        };
        console.log('💾 Persisting to localStorage:', {
          ordersCount: partial.orders.length,
          note: 'Positions are NOT persisted - fetched from on-chain',
        });
        return partial;
      },
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('❌ Error rehydrating from localStorage:', error);
        } else if (state) {
          console.log('✅ Rehydrated from localStorage:', {
            ordersCount: state.orders.length,
            note: 'Positions will be loaded from on-chain based on locked collateral',
          });
          // Initialize positions as empty - they will be loaded from on-chain
          state.positions = [];
        }
      },
    }
  )
);

