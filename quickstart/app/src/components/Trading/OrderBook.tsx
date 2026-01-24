import { useEffect, useState, useCallback } from 'react';
import { useTradingStore } from '../../stores/tradingStore';
import { fetchPythPrice } from '../../services/pythService';
import { MARKET_INFO } from '../../config/contracts';

interface OrderBookEntry {
  price: number;
  size: number;
  total: number;
}

interface OrderBookData {
  asks: OrderBookEntry[];
  bids: OrderBookEntry[];
  spread: number;
  spreadPercent: number;
}

export function OrderBook() {
  const selectedMarket = useTradingStore((state) => state.selectedMarket);
  const [orderBookData, setOrderBookData] = useState<OrderBookData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);

  const marketInfo = MARKET_INFO[selectedMarket as keyof typeof MARKET_INFO];
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _decimals = marketInfo?.decimals || 8;

  // Generate randomized order book data based on current price
  const generateOrderBook = useCallback((basePrice: number): OrderBookData => {
    const numLevels = 10;
    const priceStep = basePrice * 0.0001; // 0.01% price step
    const asks: OrderBookEntry[] = [];
    const bids: OrderBookEntry[] = [];

    // Generate asks (sell orders) - prices above current price
    let askCumulative = 0;
    for (let i = 1; i <= numLevels; i++) {
      const price = basePrice + (priceStep * i);
      // Randomize size in USDC (value terms) - between 1,000 and 500,000 USDC
      const sizeUSDC = 1000 + Math.random() * 499000;
      askCumulative += sizeUSDC;
      
      asks.push({
        price,
        size: sizeUSDC, // Size in USDC
        total: askCumulative, // Total in USDC
      });
    }

    // Generate bids (buy orders) - prices below current price
    let bidCumulative = 0;
    for (let i = 1; i <= numLevels; i++) {
      const price = basePrice - (priceStep * i);
      // Randomize size in USDC (value terms) - between 1,000 and 500,000 USDC
      const sizeUSDC = 1000 + Math.random() * 499000;
      bidCumulative += sizeUSDC;
      
      bids.push({
        price,
        size: sizeUSDC, // Size in USDC
        total: bidCumulative, // Total in USDC
      });
    }

    // Calculate spread
    const bestAsk = asks[0].price;
    const bestBid = bids[0].price;
    const spread = bestAsk - bestBid;
    const spreadPercent = (spread / basePrice) * 100;

    return {
      asks: asks.reverse(), // Show highest ask first (top to bottom)
      bids,
      spread,
      spreadPercent,
    };
  }, []);

  // Fetch price and generate order book
  const updateOrderBook = useCallback(async () => {
    if (!selectedMarket) return;

    setIsLoading(true);
    try {
      const priceData = await fetchPythPrice(selectedMarket);
      const price = priceData.price;
      setCurrentPrice(price);
      
      const orderBook = generateOrderBook(price);
      setOrderBookData(orderBook);
    } catch (error) {
      console.error('Error fetching price for order book:', error);
      // Use fallback price if fetch fails
      const fallbackPrices: Record<string, number> = {
        'BTC/USD': 91168,
        'ETH/USD': 3000,
        'STRK/USD': 1.5,
        'SOL/USD': 150,
        'BNB/USD': 600,
      };
      const fallbackPrice = fallbackPrices[selectedMarket] || 1000;
      setCurrentPrice(fallbackPrice);
      const orderBook = generateOrderBook(fallbackPrice);
      setOrderBookData(orderBook);
    } finally {
      setIsLoading(false);
    }
  }, [selectedMarket, generateOrderBook]);

  // Update order book when market changes
  useEffect(() => {
    updateOrderBook();
  }, [updateOrderBook]);

  // Update order book periodically (every 2 seconds) to simulate live updates
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentPrice) {
        // Slightly randomize the price to simulate market movement
        const priceVariation = currentPrice * (0.9995 + Math.random() * 0.001); // ±0.05% variation
        const orderBook = generateOrderBook(priceVariation);
        setOrderBookData(orderBook);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [currentPrice, generateOrderBook]);

  const formatPrice = (price: number): string => {
    // Format based on price magnitude
    if (price >= 1000) {
      return price.toLocaleString('en-US', { maximumFractionDigits: 0 });
    } else if (price >= 100) {
      return price.toFixed(2);
    } else if (price >= 1) {
      return price.toFixed(3);
    } else {
      return price.toFixed(5);
    }
  };

  const formatSize = (size: number): string => {
    // Format USDC values (always show as integers or with minimal decimals)
    if (size >= 1000) {
      return size.toLocaleString('en-US', { maximumFractionDigits: 0 });
    } else {
      return size.toFixed(2);
    }
  };

  if (isLoading || !orderBookData) {
    return (
      <div className="orderbook-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ color: '#758696', fontSize: '12px' }}>Loading order book...</div>
      </div>
    );
  }

  const maxTotal = Math.max(
    ...orderBookData.asks.map(a => a.total),
    ...orderBookData.bids.map(b => b.total)
  );

  return (
    <div className="orderbook-body">
      <div className="orderbook-column-headers">
        <span>Price</span>
        <span>Size (USDC)</span>
        <span>Total (USDC)</span>
      </div>
      
      {/* Sell Orders (Asks) */}
      <div className="orderbook-asks">
        {orderBookData.asks.map((ask, i) => {
          const barWidth = (ask.total / maxTotal) * 100;
          return (
            <div key={i} className="orderbook-row orderbook-ask-row" style={{ position: 'relative' }}>
              <div 
                className="orderbook-ask-bar" 
                style={{ 
                  width: `${barWidth}%`,
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(239, 83, 80, 0.15)',
                  zIndex: 0,
                }} 
              />
              <span 
                className="orderbook-price orderbook-price-ask"
                style={{ position: 'relative', zIndex: 1 }}
              >
                {formatPrice(ask.price)}
              </span>
              <span 
                className="orderbook-size"
                style={{ position: 'relative', zIndex: 1 }}
              >
                {formatSize(ask.size)}
              </span>
              <span 
                className="orderbook-total"
                style={{ position: 'relative', zIndex: 1 }}
              >
                {formatSize(ask.total)}
              </span>
            </div>
          );
        })}
      </div>
      
      {/* Spread */}
      <div className="orderbook-spread">
        <span>Spread {formatPrice(orderBookData.spread)} {orderBookData.spreadPercent.toFixed(3)}%</span>
      </div>
      
      {/* Buy Orders (Bids) */}
      <div className="orderbook-bids">
        {orderBookData.bids.map((bid, i) => {
          const barWidth = (bid.total / maxTotal) * 100;
          return (
            <div key={i} className="orderbook-row orderbook-bid-row" style={{ position: 'relative' }}>
              <div 
                className="orderbook-bid-bar" 
                style={{ 
                  width: `${barWidth}%`,
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(38, 166, 154, 0.15)',
                  zIndex: 0,
                }} 
              />
              <span 
                className="orderbook-price orderbook-price-bid"
                style={{ position: 'relative', zIndex: 1 }}
              >
                {formatPrice(bid.price)}
              </span>
              <span 
                className="orderbook-size"
                style={{ position: 'relative', zIndex: 1 }}
              >
                {formatSize(bid.size)}
              </span>
              <span 
                className="orderbook-total"
                style={{ position: 'relative', zIndex: 1 }}
              >
                {formatSize(bid.total)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

