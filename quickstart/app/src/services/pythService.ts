// Pyth Network API Configuration
// Using Pyth's REST API directly (same approach as uniperp)
const PYTH_API_BASE = 'https://hermes.pyth.network';

// Pyth price feed IDs for all supported markets
export const PYTH_PRICE_FEED_IDS: Record<string, string> = {
  'BTC/USD': '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
  'ETH/USD': '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
  'STRK/USD': '0x6a182399ff70ccf3e06024898942028204125a819e519a335ffa4579e66cd870',
  'SOL/USD': '0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d',
  'BNB/USD': '0x2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f',
};

// Legacy constant for backward compatibility
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _PYTH_PRICE_FEED_ID_BTC_USD = PYTH_PRICE_FEED_IDS['BTC/USD'];

export interface PythPriceData {
  price: number;
  timestamp: number;
  confidence: number;
}

export interface PythHistoricalData {
  prices: number[];
  timestamps: number[];
  ohlc?: Array<{
    open: number;
    high: number;
    low: number;
    close: number;
    time: number;
  }>;
}

/**
 * Fetch current price from Pyth Network for a given market
 * Uses the REST API endpoint (same approach as uniperp)
 * @param marketId - Market identifier (e.g., 'BTC/USD'). Defaults to 'BTC/USD' for backward compatibility
 */
export async function fetchPythPrice(marketId: string = 'BTC/USD'): Promise<PythPriceData> {
  try {
    const priceFeedId = PYTH_PRICE_FEED_IDS[marketId];
    if (!priceFeedId) {
      throw new Error(`Unsupported market: ${marketId}. Supported markets: ${Object.keys(PYTH_PRICE_FEED_IDS).join(', ')}`);
    }

    // Use the REST API endpoint directly (like uniperp does in use-positions.ts)
    const response = await fetch(
      `${PYTH_API_BASE}/api/latest_price_feeds?ids[]=${priceFeedId}`
    );

    if (!response.ok) {
      throw new Error(`Pyth API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data || !Array.isArray(data) || data.length === 0) {
      throw new Error('Invalid response format from Pyth API');
    }

    // Parse price data (same structure as uniperp)
    const priceData = data[0].price;
    if (!priceData) {
      throw new Error('No price data in response');
    }

    // Parse price: price / 10^(-expo) = price * 10^expo (same formula as uniperp)
    // This matches uniperp's parsePriceData function in spot-data/route.ts
    const priceValue = parseFloat(priceData.price);
    const expo = priceData.expo;
    const price = priceValue / Math.pow(10, -expo); // Same as: priceValue * Math.pow(10, expo)
    const confidence = parseFloat(priceData.conf) / Math.pow(10, -expo);
    const publishTime = priceData.publish_time || Math.floor(Date.now() / 1000);

    if (price <= 0 || isNaN(price)) {
      throw new Error('Invalid price value from Pyth');
    }

    return {
      price,
      timestamp: publishTime,
      confidence,
    };
  } catch (error) {
    console.error('Error fetching Pyth price:', error);
    // Return mock data as fallback
    return {
      price: 90000, // Mock BTC price
      timestamp: Math.floor(Date.now() / 1000),
      confidence: 0,
    };
  }
}

/**
 * Fetch historical price data from Pyth Network
 * Note: Pyth's free API may have limited historical data
 * For production, consider using their paid tier or aggregating from multiple sources
 * @param interval - Time interval for candles (e.g., '1h', '5min')
 * @param numEntries - Number of historical entries to generate
 * @param marketId - Market identifier (e.g., 'BTC/USD'). Defaults to 'BTC/USD'
 */
export async function fetchPythHistoricalData(
  interval: string = '1h',
  numEntries: number = 100,
  marketId: string = 'BTC/USD'
): Promise<PythHistoricalData> {
  try {
    // Pyth doesn't have a direct historical OHLC endpoint in their free tier
    // We'll generate synthetic OHLC from current price
    // For production, you might want to use a different data source or Pyth's paid API
    
    // Fetch current price using REST API (same as fetchPythPrice)
    const currentPriceData = await fetchPythPrice(marketId);
    const currentPrice = currentPriceData.price;
    
    // Generate synthetic OHLC data from current price
    // In production, you'd want to fetch actual historical data
    const now = Math.floor(Date.now() / 1000);
    const intervalSeconds = getIntervalSeconds(interval);
    
    // Generate synthetic candlestick data using a random walk approach
    // This creates smoother, more realistic price movements
    const ohlcData: Array<{ open: number; high: number; low: number; close: number; time: number }> = [];
    const pricesData: number[] = [];
    const timestampsData: number[] = [];
    
    // Generate realistic candlestick data with clear up/down movements
    // Start from a price slightly below current and work forward
    let basePrice = currentPrice * 0.98; // Start 2% below current
    
    // Generate candles from oldest to newest
    for (let i = 0; i < numEntries; i++) {
      const timestamp = now - (numEntries - 1 - i) * intervalSeconds;
      
      // Create clear up/down movements (1-3% per candle)
      const direction = Math.random() > 0.5 ? 1 : -1; // Random up or down
      const changePercent = 0.01 + Math.random() * 0.02; // 1-3% change
      
      // Open is previous close (or basePrice for first candle)
      const open = i === 0 ? basePrice : ohlcData[i - 1].close;
      
      // Close with clear movement
      const priceChange = open * changePercent * direction;
      const close = open + priceChange;
      
      // Create visible wicks (high and low extend beyond body)
      const bodySize = Math.abs(close - open);
      const wickPercent = 0.3 + Math.random() * 0.4; // 30-70% of body as wick
      const upperWick = bodySize * wickPercent * Math.random();
      const lowerWick = bodySize * wickPercent * Math.random();
      
      const high = Math.max(open, close) + upperWick;
      const low = Math.min(open, close) - lowerWick;
      
      // Ensure high is always >= max(open, close) and low <= min(open, close)
      const finalHigh = Math.max(high, Math.max(open, close));
      const finalLow = Math.min(low, Math.min(open, close));
      
      pricesData.push(close);
      timestampsData.push(timestamp);
      ohlcData.push({ 
        open, 
        high: finalHigh, 
        low: finalLow, 
        close, 
        time: timestamp 
      });
    }
    
    // Ensure the most recent candle matches current price exactly
    if (ohlcData.length > 0) {
      const lastCandle = ohlcData[ohlcData.length - 1];
      const previousClose = ohlcData.length > 1 ? ohlcData[ohlcData.length - 2].close : lastCandle.open;
      
      // Set close to current price
      lastCandle.close = currentPrice;
      lastCandle.open = previousClose;
      
      // Create realistic high/low based on the movement
      const movement = currentPrice - previousClose;
      const wickSize = Math.abs(movement) * (0.2 + Math.random() * 0.3);
      
      if (movement >= 0) {
        // Bullish candle (green/teal)
        lastCandle.high = currentPrice + wickSize * Math.random();
        lastCandle.low = previousClose - wickSize * Math.random() * 0.5;
      } else {
        // Bearish candle (red)
        lastCandle.high = previousClose + wickSize * Math.random() * 0.5;
        lastCandle.low = currentPrice - wickSize * Math.random();
      }
      
      // Ensure high/low are correct
      lastCandle.high = Math.max(lastCandle.high, Math.max(lastCandle.open, lastCandle.close));
      lastCandle.low = Math.min(lastCandle.low, Math.min(lastCandle.open, lastCandle.close));
      
      // Update prices array
      pricesData[pricesData.length - 1] = currentPrice;
    }

    return {
      prices: pricesData,
      timestamps: timestampsData,
      ohlc: ohlcData,
    };
  } catch (error) {
    console.error('Error fetching Pyth historical data:', error);
    // Return mock data
    const now = Math.floor(Date.now() / 1000);
    const basePrice = 90000;
    const intervalSeconds = getIntervalSeconds(interval);
    const prices: number[] = [];
    const timestamps: number[] = [];
    const ohlc: Array<{ open: number; high: number; low: number; close: number; time: number }> = [];
    
    for (let i = numEntries; i > 0; i--) {
      const timestamp = now - i * intervalSeconds;
      const variation = basePrice * 0.01;
      const open = basePrice + (Math.random() - 0.5) * variation * 0.5;
      const high = open + Math.random() * variation * 0.5;
      const low = open - Math.random() * variation * 0.5;
      const close = open + (Math.random() - 0.5) * variation;
      
      prices.push(close);
      timestamps.push(timestamp);
      ohlc.push({ open, high, low, close, time: timestamp });
    }

    return {
      prices,
      timestamps,
      ohlc,
    };
  }
}

/**
 * Convert interval string to seconds
 */
function getIntervalSeconds(interval: string): number {
  const intervals: Record<string, number> = {
    '1min': 60,
    '5min': 300,
    '15min': 900,
    '1h': 3600,
    '2h': 7200,
    '1d': 86400,
    '1w': 604800,
  };
  return intervals[interval] || 3600;
}

