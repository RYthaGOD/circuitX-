import { Contract, Account, RpcProvider, cairo } from 'starknet';
import { CONTRACTS, NETWORK, MARKETS, MARKET_INFO, getMarketIdFelt } from '../config/contracts';
import { fetchPythPrice } from './pythService';

/**
 * Convert a string to its felt252 numeric representation
 * Uses shared getMarketIdFelt function to ensure market_id matches what's stored in DataStore
 * This is CRITICAL for avoiding MARKET_DISABLED errors
 */
function stringToFelt252(str: string): string {
  try {
    // Use shared function for known markets - this ensures consistency
    return getMarketIdFelt(str);
  } catch {
    // Fallback to cairo.felt() for other strings
    return cairo.felt(str);
  }
}

const MOCK_ORACLE_ABI = [
  {
    type: 'function',
    name: 'set_price',
    inputs: [
      { name: 'market_id', type: 'felt252' },
      { name: 'value', type: 'u128' },
      { name: 'decimals', type: 'u32' },
      { name: 'num_sources', type: 'u32' },
    ],
    outputs: [],
    state_mutability: 'external',
  },
] as const;

// MockOracle address (from DEPLOYED_ADDRESSES.md)
const MOCK_ORACLE_ADDRESS = '0x00e2c5d520b31762df17b54f339c665a7c4c9fa9e81fd05c40c2e0fce3de47b9';

// Cache for oracle price timestamps (to avoid unnecessary updates)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _oraclePriceCache: Map<string, { price: number; timestamp: number }> = new Map();
const ORACLE_PRICE_STALE_THRESHOLD = 30; // Update if price is older than 30 seconds

/**
 * Check if oracle price needs updating
 */
async function shouldUpdateOraclePrice(marketId: string): Promise<boolean> {
  try {
    const provider = new RpcProvider({ nodeUrl: NETWORK.RPC_URL });
    // Convert market_id string to felt252 for contract call
    const marketIdFelt = stringToFelt252(marketId);
    const result = await provider.callContract({
      contractAddress: CONTRACTS.ORACLE,
      entrypoint: 'get_price',
      calldata: [marketIdFelt], // Convert string to felt252 numeric value
    });

    // Oracle returns: [price_value, timestamp, decimals, num_sources]
    const timestamp = Number(result[1] || '0');
    const now = Math.floor(Date.now() / 1000);
    const age = now - timestamp;

    // Only update if price is stale (>30 seconds old)
    return age > ORACLE_PRICE_STALE_THRESHOLD;
  } catch (error) {
    // If we can't check, assume we need to update
    console.warn('Could not check oracle price age, will update:', error);
    return true;
  }
}

/**
 * Update price in MockOracle
 * Note: Requires oracle_admin account (or any account that has permission)
 */
export async function updateOraclePrice(
  account: Account,
  marketId: string,
  price: number,
  decimals: number = 8,
  numSources: number = 3
) {
  const contract = new Contract({
    abi: MOCK_ORACLE_ABI,
    address: MOCK_ORACLE_ADDRESS,
    providerOrAccount: account,
  });

  const priceValue = BigInt(Math.floor(price * 10 ** decimals));
  
  // Convert market_id string to felt252 for contract call
  const marketIdFelt = stringToFelt252(marketId);
  
  console.log('Updating oracle price:', { marketId, marketIdFelt, price, priceValue });
  
  const tx = await contract.set_price(
    marketIdFelt, // Convert string to felt252 numeric value
    priceValue,
    decimals,
    numSources
  );
  
  await account.waitForTransaction(tx.transaction_hash);
  return tx;
}

/**
 * Fetch price from Pyth Network (same as trading chart)
 */
export async function fetchPriceFromPyth(marketId: string): Promise<number> {
  try {
    // Fetch price for the specified market
    const priceData = await fetchPythPrice(marketId);
    return priceData.price;
  } catch (error) {
    console.error(`Error fetching price from Pyth for ${marketId}:`, error);
    // Return fallback prices
    const fallbackPrices: Record<string, number> = {
      [MARKETS.BTC_USD]: 91168,
      [MARKETS.ETH_USD]: 3000,
      [MARKETS.STRK_USD]: 1.5,
      [MARKETS.SOL_USD]: 150,
      [MARKETS.BNB_USD]: 600,
    };
    return fallbackPrices[marketId] || 0;
  }
}

/**
 * Update oracle price for a specific market from Pyth Network
 * Only updates if price is stale (>30 seconds old)
 */
export async function updateOraclePriceFromPyth(
  account: Account,
  marketId: string,
  forceUpdate: boolean = false
) {
  try {
    // Check if update is needed (unless forced)
    if (!forceUpdate) {
      const needsUpdate = await shouldUpdateOraclePrice(marketId);
      if (!needsUpdate) {
        console.log('Oracle price is fresh, skipping update');
        // Return current price from oracle
        const provider = new RpcProvider({ nodeUrl: NETWORK.RPC_URL });
        // Convert market_id string to felt252 for contract call
        const marketIdFelt = stringToFelt252(marketId);
        const result = await provider.callContract({
          contractAddress: CONTRACTS.ORACLE,
          entrypoint: 'get_price',
          calldata: [marketIdFelt], // Convert string to felt252 numeric value
        });
        const priceValue = Number(result[0] || '0');
        const decimals = Number(result[2] || '8');
        const price = priceValue / (10 ** decimals);
        
        return {
          marketId,
          price,
          txHash: null, // No transaction needed
          skipped: true,
        };
      }
    }

    // Fetch fresh price from Pyth
    const price = await fetchPriceFromPyth(marketId);
    
    if (price <= 0) {
      throw new Error(`Invalid price from Pyth: ${price}`);
    }

    const marketInfo = MARKET_INFO[marketId as keyof typeof MARKET_INFO];
    const decimals = marketInfo?.decimals || 8;
    
    // Pyth typically has multiple sources, use 3 as default
    const numSources = 3;
    
    const tx = await updateOraclePrice(account, marketId, price, decimals, numSources);
    
    return {
      marketId,
      price,
      txHash: tx.transaction_hash,
      skipped: false,
    };
  } catch (error) {
    console.error(`Failed to update oracle price for market ${marketId}:`, error);
    throw error;
  }
}

/**
 * Update oracle prices for all markets from Pyth Network
 */
export async function updateOraclePricesFromFeed(account: Account) {
  const markets = [
    { id: MARKETS.BTC_USD },
    { id: MARKETS.ETH_USD },
    { id: MARKETS.STRK_USD },
    { id: MARKETS.SOL_USD },
    { id: MARKETS.BNB_USD },
  ];

  const results = [];

  for (const market of markets) {
    try {
      const result = await updateOraclePriceFromPyth(account, market.id);
      results.push(result);
      if (!result.skipped) {
        console.log(`Updated ${market.id} price: $${result.price}`);
      }
    } catch (error) {
      console.error(`Failed to update ${market.id}:`, error);
      results.push({
        marketId: market.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return results;
}
