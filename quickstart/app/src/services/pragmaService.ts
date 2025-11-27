// Pragma API Configuration
// Use Vite proxy in development to avoid CORS issues
const PRAGMA_API_BASE = import.meta.env.DEV 
  ? '/api/pragma' 
  : 'https://api.devnet.pragma.build/node/v1';


// Market to Pragma API pair mapping
export const PRAGMA_PAIR_IDS = {
  BTC_USD: 'BTC/USD',
  ETH_USD: 'ETH/USD',
  LORDS_USD: 'LORDS/USD',
  STRK_USD: 'STRK/USD',
  EKUBO_USD: 'EKUBO/USD',
  DOG_USD: 'DOG/USD',
  BROTHER_USDPLUS: 'BROTHER/USDPLUS',
} as const;

// Helper to convert pair ID to base/quote for API
function parsePairId(pairId: string): { base: string; quote: string } {
  // Handle both formats: "BTC/USD" or market ID
  if (pairId.includes('/')) {
    const [base, quote] = pairId.split('/');
    return { base, quote };
  }
  
  // Map market IDs to pairs
  const pairMap: Record<string, { base: string; quote: string }> = {
    'BTC/USD': { base: 'BTC', quote: 'USD' },
    'ETH/USD': { base: 'ETH', quote: 'USD' },
    'LORDS/USD': { base: 'LORDS', quote: 'USD' },
    'STRK/USD': { base: 'STRK', quote: 'USD' },
    'EKUBO/USD': { base: 'EKUBO', quote: 'USD' },
    'DOG/USD': { base: 'DOG', quote: 'USD' },
    'BROTHER/USDPLUS': { base: 'BROTHER', quote: 'USDPLUS' },
  };
  
  return pairMap[pairId] || { base: 'BTC', quote: 'USD' };
}

export interface PragmaPriceData {
  price: string;
  decimals: number;
  timestamp: number;
  numSources: number;
}

export interface PragmaHistoricalData {
  prices: string[];
  timestamps: number[];
  decimals: number[];
  // OHLC data from candlestick API
  ohlc?: Array<{
    open: string;
    high: string;
    low: string;
    close: string;
    time: number;
  }>;
}

/**
 * Fetch current price from Pragma API
 */
export async function fetchPragmaPrice(
  pairId: string
): Promise<PragmaPriceData> {
  try {
    const { base, quote } = parsePairId(pairId);
    const url = `${PRAGMA_API_BASE}/prices/latest?pair=${base}-${quote}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: import.meta.env.DEV 
        ? {} // Proxy will add the header
        : {
            'x-api-key': PRAGMA_API_KEY, // Lowercase as per API docs
          },
    });

    if (!response.ok) {
      throw new Error(`Pragma API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      price: data.price || '0',
      decimals: data.decimals || 8,
      timestamp: data.timestamp || Math.floor(Date.now() / 1000),
      numSources: data.num_sources_aggregated || 0,
    };
  } catch (error) {
    console.error(`Error fetching Pragma price for ${pairId}:`, error);
    // Return mock data instead of throwing to prevent UI breakage
    return {
      price: '90000000000', // Mock BTC price (8 decimals)
      decimals: 8,
      timestamp: Math.floor(Date.now() / 1000),
      numSources: 0,
    };
  }
}

/**
 * Fetch historical candlestick data from Pragma API
 * @param pairId - The asset pair ID (e.g., "BTC/USD")
 * @param interval - Time interval (default: "1h")
 * @param numEntries - Number of historical entries to fetch
 */
export async function fetchPragmaHistoricalData(
  pairId: string,
  interval: string = '1h',
  numEntries: number = 100
): Promise<PragmaHistoricalData> {
  try {
    const { base, quote } = parsePairId(pairId);
    const url = `${PRAGMA_API_BASE}/aggregation/candlestick/${base}/${quote}?interval=${interval}&aggregation=median`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: import.meta.env.DEV 
        ? {} // Proxy will add the header
        : {
            'x-api-key': PRAGMA_API_KEY, // Lowercase as per API docs
          },
    });

    if (!response.ok) {
      throw new Error(`Pragma API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.data || !Array.isArray(data.data)) {
      throw new Error('Invalid response format from Pragma API');
    }

    // Convert OHLC data to our format
    // Take the last numEntries candles
    const candles = data.data.slice(-numEntries);
    
    const prices: string[] = [];
    const timestamps: number[] = [];
    const decimals: number[] = [];
    const ohlc: Array<{ open: string; high: string; low: string; close: string; time: number }> = [];
    
    candles.forEach((candle: any) => {
      // API returns integers (int64) according to docs
      // Convert to strings to preserve precision for large numbers
      // Values represent price * 10^decimals
      const open = candle.open != null ? String(candle.open) : '0';
      const high = candle.high != null ? String(candle.high) : '0';
      const low = candle.low != null ? String(candle.low) : '0';
      const close = candle.close != null ? String(candle.close) : '0';
      
      // Use close price for backward compatibility
      prices.push(close);
      
      // Convert ISO 8601 timestamp string to Unix timestamp (seconds)
      // API returns time as "string<date-time>" (ISO 8601 format)
      const timestamp = candle.time 
        ? Math.floor(new Date(candle.time).getTime() / 1000) 
        : Math.floor(Date.now() / 1000);
      timestamps.push(timestamp);
      
      // Assume 8 decimals for BTC/USD (standard for most crypto pairs)
      decimals.push(8);
      
      // Store OHLC data
      ohlc.push({
        open,
        high,
        low,
        close,
        time: timestamp,
      });
    });

    return {
      prices,
      timestamps,
      decimals,
      ohlc,
    };
  } catch (error) {
    console.error(`Error fetching Pragma historical data for ${pairId}:`, error);
    // Return mock data instead of throwing
    const now = Math.floor(Date.now() / 1000);
    const basePrice = 90000000000;
    const mockPrices: string[] = [];
    const mockTimestamps: number[] = [];
    
    for (let i = numEntries; i > 0; i--) {
      mockTimestamps.push(now - i * 3600);
      mockPrices.push(Math.floor(basePrice * (1 + (Math.random() - 0.5) * 0.02)).toString());
    }

    return {
      prices: mockPrices,
      timestamps: mockTimestamps,
      decimals: new Array(numEntries).fill(8),
    };
  }
}

/**
 * Format price with decimals
 */
export function formatPragmaPrice(price: string, decimals: number): number {
  const priceBigInt = BigInt(price);
  const divisor = BigInt(10 ** decimals);
  return Number(priceBigInt) / Number(divisor);
}

