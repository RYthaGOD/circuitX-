/**
 * Market ID Normalizer - PERMANENT SOLUTION
 * 
 * This module ensures market_id is ALWAYS in the exact same format
 * regardless of how it's passed to Starknet.js, preventing INSUFFICIENT_BALANCE errors.
 * 
 * The root cause: felt252 is a number, and Starknet.js might serialize hex strings
 * differently in different contexts (deposit vs public_inputs). This normalizer
 * ensures we always use the exact same format by normalizing through BigInt.
 */

import { PRAGMA_ASSET_IDS } from '../config/contracts';

/**
 * Normalize market_id to ensure exact format consistency
 * Converts hex -> BigInt -> hex to ensure the exact same felt252 value
 * regardless of input format variations (case, leading zeros, etc.)
 * 
 * @param marketId - Market identifier (e.g., "BTC/USD") or hex string
 * @returns Normalized hex string that will always serialize to the same felt252
 */
export function normalizeMarketId(marketId: string): string {
  // If it's a market name, get the Pragma asset ID
  let hexString: string;
  if (PRAGMA_ASSET_IDS[marketId]) {
    hexString = PRAGMA_ASSET_IDS[marketId];
  } else if (marketId.startsWith('0x') || marketId.startsWith('0X')) {
    hexString = marketId;
  } else {
    throw new Error(`Invalid market_id format: ${marketId}. Must be a market name or hex string.`);
  }
  
  // CRITICAL: Normalize by converting to BigInt and back
  // BigInt normalizes hex strings (removes leading zeros, handles case)
  // This ensures the exact same felt252 value regardless of input format
  const normalized = BigInt(hexString);
  const normalizedHex = '0x' + normalized.toString(16).toLowerCase();
  
  return normalizedHex;
}

/**
 * Check what market_id format the balance is actually stored under
 * This diagnostic function helps identify format mismatches
 * 
 * @param userAddress - User's contract address
 * @param marketId - Market identifier (e.g., "BTC/USD")
 * @returns Object with balance info for different market_id formats
 */
export async function diagnoseMarketIdFormat(
  userAddress: string,
  marketId: string
): Promise<{
  normalized: { format: string; balance: string };
  hexLowercase: { format: string; balance: string };
  hexUppercase: { format: string; balance: string };
  decimal: { format: string; balance: string };
}> {
  const { Contract, RpcProvider } = await import('starknet');
  const { CONTRACTS, NETWORK } = await import('../config/contracts');
  
  const provider = new RpcProvider({ nodeUrl: NETWORK.RPC_URL });
  const VAULT_ABI = [
    {
      type: 'function',
      name: 'get_user_balance',
      inputs: [
        { name: 'user', type: 'core::starknet::contract_address::ContractAddress' },
        { name: 'market_id', type: 'core::felt252' }
      ],
      outputs: [{ type: 'core::integer::u256' }],
      state_mutability: 'view'
    }
  ];
  
  const contract = new Contract({
    abi: VAULT_ABI,
    address: CONTRACTS.COLLATERAL_VAULT,
    providerOrAccount: provider,
  });
  
  const normalized = normalizeMarketId(marketId);
  const normalizedBigInt = BigInt(normalized);
  
  const formats = {
    normalized: normalized,
    hexLowercase: normalized.toLowerCase(),
    hexUppercase: normalized.toUpperCase(),
    decimal: normalizedBigInt.toString(),
  };
  
  const results: any = {};
  
  for (const [key, formatValue] of Object.entries(formats)) {
    try {
      const balanceRes = await contract.get_user_balance(userAddress, formatValue);
      let balanceString = '0';
      if (balanceRes !== undefined && balanceRes !== null) {
        if (typeof balanceRes === 'object' && 'low' in balanceRes) {
          balanceString = BigInt(balanceRes.low).toString();
        } else {
          balanceString = BigInt(balanceRes).toString();
        }
      }
      results[key] = {
        format: formatValue,
        balance: balanceString,
        balanceDecimal: (Number(balanceString) / 1e18).toFixed(4),
      };
    } catch (error) {
      results[key] = {
        format: formatValue,
        balance: '0',
        error: String(error),
      };
    }
  }
  
  return results;
}

