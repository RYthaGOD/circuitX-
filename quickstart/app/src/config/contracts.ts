// Contract addresses on Ztarknet
// Updated: All market_id checks removed - transactions proceed regardless of market_id
// Balance operations ignore market_id - balances are stored per user only
export const CONTRACTS = {
  // Main Router - Entry point for all trading operations
  PERP_ROUTER: '0x057c9a38d9cfe77f8f0965b84e99398dbb2722bdfa380c466f10b13f2d3f8c41',
  
  // Handlers
  POSITION_HANDLER: '0x07593362cf445551ecc052c70ea6f11b423577a24a708e3dd7d2dee1e9ae3fe0',
  ORDER_HANDLER: '0x01190b8b036ae40b724763878648f7328b658c315a7021ee2df188dcc01e1b4e',
  LIQUIDATION_HANDLER: '0x0697c390edb91969464e2c868944d37a4be32ddbb3d96e229cde28819ee1c68f',
  
  // Core Infrastructure
  DATA_STORE: '0x02723d4149bfa4cafded35887532aa37d73669b502d46b9bb804e3ac1bd4aa91',
  ORACLE: '0x055cdd0a72d3043de27149d71b842060af32934612718c2225aa215f9e825674',
  COLLATERAL_VAULT: '0x069ee1049980f5dbfbafe787fd5106f152d275290959cdaaebcd30ccb6b43c66',
  EVENT_EMITTER: '0x0056920a7aa0ed0516f33abade0b0ff4f5305a20cabd0117f49477eeb3be7e02',
  RISK_MANAGER: '0x071a6f039fa6401482c9e55d061c6da6387b00c5cb0991299ab5ef124971b7da',
  
  // Verifier (Circuit Redeployment - No Noise Randomization)
  VERIFIER: '0x3f5bd2451155beaa736a44d68a9fa6dc38be2a34e9403eb68beb83bcb67c839',
  
  // Tokens
  YUSD_TOKEN: '0x0374317fb45421115f2b3b3df22dce36d922a00eb7b2f80966ebc23cb8b2cfda',
} as const;

// Network Configuration
export const NETWORK = {
  RPC_URL: 'https://ztarknet-madara.d.karnot.xyz',
  EXPLORER_URL: 'https://explorer-zstarknet.d.karnot.xyz',
  CHAIN_ID: '0x534e5f4d41494e', // SN_MAIN (adjust if needed)
} as const;

// Market IDs for Ztarknet (used in contracts)
// Contracts expect the string format directly (e.g., "BTC/USD") as felt252
export const MARKETS = {
  BTC_USD: 'BTC/USD', // String format as felt252
  ETH_USD: 'ETH/USD', // String format as felt252
  STRK_USD: 'STRK/USD',
  SOL_USD: 'SOL/USD',
  BNB_USD: 'BNB/USD',
} as const;

// Market display info
export const MARKET_INFO = {
  [MARKETS.BTC_USD]: { symbol: 'BTC/USD', name: 'Bitcoin', decimals: 8 },
  [MARKETS.ETH_USD]: { symbol: 'ETH/USD', name: 'Ethereum', decimals: 8 },
  [MARKETS.STRK_USD]: { symbol: 'STRK/USD', name: 'Starknet', decimals: 8 },
  [MARKETS.SOL_USD]: { symbol: 'SOL/USD', name: 'Solana', decimals: 8 },
  [MARKETS.BNB_USD]: { symbol: 'BNB/USD', name: 'Binance Coin', decimals: 8 },
} as const;

// Pragma Asset IDs - SINGLE SOURCE OF TRUTH
// CRITICAL: These are the exact felt252 values used by contracts
// ALWAYS use these values to ensure market_id consistency across:
// - Deposit operations
// - Position opening/closing
// - Balance lookups
// - Contract calls
export const PRAGMA_ASSET_IDS: Record<string, string> = {
  'BTC/USD': '0x4254432f555344', // Pragma asset ID: 18669995996566340 (ASCII "BTC/USD")
  'ETH/USD': '0x4554482f555344', // Pragma asset ID: 19514442401534788 (ASCII "ETH/USD")
  'STRK/USD': '0x5354524b2f555344', // Pragma asset ID: 6004514686061859652 (ASCII "STRK/USD")
  'SOL/USD': '0x534f4c2f555344', // Pragma asset ID: 36829707248068212 (ASCII "SOL/USD")
  'BNB/USD': '0x424e422f555344', // Pragma asset ID: 28734208008801092 (ASCII "BNB/USD")
} as const;

/**
 * Get market_id in the exact format used by contracts
 * CRITICAL: This function ensures the market_id is normalized to the exact format
 * that Starknet.js will serialize to felt252, ensuring consistency across all operations.
 * 
 * Uses the marketIdNormalizer for consistency.
 * 
 * @param marketId - Market identifier (e.g., "BTC/USD")
 * @returns Normalized hex string that will serialize to the same felt252 value
 */
export function getMarketIdFelt(marketId: string): string {
  const marketIdFelt = PRAGMA_ASSET_IDS[marketId];
  if (!marketIdFelt) {
    throw new Error(`Unknown market_id: ${marketId}. Supported markets: ${Object.keys(PRAGMA_ASSET_IDS).join(', ')}`);
  }
  
  // CRITICAL: Normalize by converting to BigInt and back to hex
  // This ensures the exact same felt252 value regardless of input format
  // BigInt normalizes hex strings (removes leading zeros, handles case)
  const normalized = BigInt(marketIdFelt);
  const normalizedHex = '0x' + normalized.toString(16).toLowerCase();
  
  return normalizedHex;
}

/**
 * Get market_id as BigInt for direct use in contract calls
 * Use this when you need to pass the market_id as a number directly
 * @param marketId - Market identifier (e.g., "BTC/USD")
 * @returns BigInt representation of the market_id
 */
export function getMarketIdBigInt(marketId: string): bigint {
  const marketIdFelt = PRAGMA_ASSET_IDS[marketId];
  if (!marketIdFelt) {
    throw new Error(`Unknown market_id: ${marketId}. Supported markets: ${Object.keys(PRAGMA_ASSET_IDS).join(', ')}`);
  }
  return BigInt(marketIdFelt);
}

// Pragma Mainnet Oracle (for frontend price display)
export const PRAGMA_MAINNET = {
  ADDRESS: '0x2a85bd616f912537c50a49a4076db02c00b29b2cdc8a197ce92ed1837fa875b',
  RPC_URL: 'https://starknet.drpc.org',
} as const;

