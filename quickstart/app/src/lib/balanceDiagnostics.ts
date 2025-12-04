/**
 * Balance Diagnostics - Helps diagnose INSUFFICIENT_BALANCE errors
 * 
 * This module provides utilities to check on-chain balances using the exact
 * market_id format that will be sent to the contract, ensuring we're checking
 * the same storage key that the contract will use.
 */

import { RpcProvider, Contract } from 'starknet';
import { CONTRACTS, NETWORK, getMarketIdFelt } from '../config/contracts';

/**
 * Get the exact market_id format that will be sent to the contract
 * Uses the shared function to ensure consistency
 */
export function getExactMarketIdForContract(marketId: string): string {
  return getMarketIdFelt(marketId);
}

/**
 * Check on-chain balance using the EXACT market_id format that the contract uses
 * This helps diagnose INSUFFICIENT_BALANCE errors by ensuring we check the same storage key
 */
export async function checkBalanceWithExactMarketId(
  userAddress: string,
  marketId: string
): Promise<{
  marketId: string;
  exactMarketId: string;
  balance: string;
  balanceDecimal: string;
  lockedCollateral: string;
  lockedCollateralDecimal: string;
  availableBalance: string;
  availableBalanceDecimal: string;
}> {
  try {
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
      },
      {
        type: 'function',
        name: 'get_locked_collateral',
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
    
    // CRITICAL: Use hex format directly - same as deposit
    const exactMarketId = getMarketIdFelt(marketId);
    
    console.log('🔍 Checking balance with exact contract market_id:', {
      marketId,
      exactMarketId,
      userAddress,
    });
    
    const [balanceRes, lockedRes] = await Promise.all([
      contract.get_user_balance(userAddress, exactMarketId),
      contract.get_locked_collateral(userAddress, exactMarketId),
    ]);
    
    // Handle u256 response
    let balanceString = '0';
    let lockedString = '0';
    
    try {
      if (balanceRes !== undefined && balanceRes !== null) {
        if (typeof balanceRes === 'object' && 'low' in balanceRes) {
          balanceString = BigInt(balanceRes.low).toString();
        } else {
          balanceString = BigInt(balanceRes).toString();
        }
      }
    } catch (e) {
      console.error('Error parsing balance:', e);
    }
    
    try {
      if (lockedRes !== undefined && lockedRes !== null) {
        if (typeof lockedRes === 'object' && 'low' in lockedRes) {
          lockedString = BigInt(lockedRes.low).toString();
        } else {
          lockedString = BigInt(lockedRes).toString();
        }
      }
    } catch (e) {
      console.error('Error parsing locked collateral:', e);
    }
    
    const balanceBigInt = BigInt(balanceString);
    const lockedBigInt = BigInt(lockedString);
    const availableBigInt = balanceBigInt >= lockedBigInt ? balanceBigInt - lockedBigInt : 0n;
    
    return {
      marketId,
      exactMarketId,
      balance: balanceString,
      balanceDecimal: (Number(balanceBigInt) / 1e18).toFixed(4),
      lockedCollateral: lockedString,
      lockedCollateralDecimal: (Number(lockedBigInt) / 1e18).toFixed(4),
      availableBalance: availableBigInt.toString(),
      availableBalanceDecimal: (Number(availableBigInt) / 1e18).toFixed(4),
    };
  } catch (error) {
    console.error('Error checking balance with exact market_id:', error);
    throw error;
  }
}

/**
 * Check all possible market_id formats to find where the balance is stored
 * This helps diagnose if there's a format mismatch
 */
export async function checkAllMarketIdFormats(
  userAddress: string,
  marketId: string
): Promise<Record<string, any>> {
  const formats: Record<string, string> = {
    'lowercase': PRAGMA_ASSET_IDS[marketId]?.toLowerCase() || marketId.toLowerCase(),
    'uppercase': PRAGMA_ASSET_IDS[marketId]?.toUpperCase() || marketId.toUpperCase(),
    'original': PRAGMA_ASSET_IDS[marketId] || marketId,
  };
  
  const results: Record<string, any> = {};
  
  for (const [formatName, formatValue] of Object.entries(formats)) {
    try {
      const result = await checkBalanceWithExactMarketId(userAddress, marketId);
      results[formatName] = {
        marketId: formatValue,
        balance: result.balance,
        balanceDecimal: result.balanceDecimal,
      };
    } catch (error) {
      results[formatName] = { error: String(error) };
    }
  }
  
  return results;
}

