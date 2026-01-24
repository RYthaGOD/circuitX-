import { RpcProvider, Contract } from 'starknet';
import { CONTRACTS, NETWORK, PRAGMA_ASSET_IDS } from '../config/contracts';
import { Position } from '../stores/tradingStore';

// CollateralVault ABI for get_locked_collateral
const VAULT_ABI = [
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
] as const;

// DataStore ABI for get_position
const DATA_STORE_ABI = [
  {
    type: 'function',
    name: 'get_position',
    inputs: [{ name: 'commitment', type: 'felt252' }],
    outputs: [
      {
        type: 'struct',
        name: 'PositionRecord',
        members: [
          { name: 'commitment', type: 'felt252' },
          { name: 'account', type: 'ContractAddress' },
          { name: 'market_id', type: 'felt252' },
          { name: 'opened_at', type: 'u64' },
        ],
      },
    ],
    state_mutability: 'view',
  },
] as const;

/**
 * Fetch all positions with locked collateral from on-chain
 * Only returns positions that have locked collateral > 0
 */
export async function fetchPositionsFromChain(
  userAddress: string,
  knownCommitments: string[] = []
): Promise<Position[]> {
  try {
    const provider = new RpcProvider({ nodeUrl: NETWORK.RPC_URL });
    const vaultContract = new Contract({ abi: VAULT_ABI, address: CONTRACTS.COLLATERAL_VAULT, providerOrAccount: provider });
    const dataStoreContract = new Contract({ abi: DATA_STORE_ABI, address: CONTRACTS.DATA_STORE, providerOrAccount: provider });

    const positions: Position[] = [];

    // Check locked collateral globally (contract ignores market_id, returns per-user total)
    // We'll check with any market_id - they all return the same value
    const firstMarketId = Object.values(PRAGMA_ASSET_IDS)[0];
    let totalLockedCollateral = 0n;
    
    try {
      console.log(`🔍 Checking total locked collateral...`, {
        userAddress,
        marketIdFelt: firstMarketId,
      });
      
      const lockedCollateral = await vaultContract.get_locked_collateral(
        userAddress,
        firstMarketId
      );
      
      totalLockedCollateral = BigInt(lockedCollateral?.toString() || '0');
      
      console.log(`📊 Total locked collateral:`, {
        raw: lockedCollateral,
        string: lockedCollateral?.toString(),
        bigInt: totalLockedCollateral.toString(),
      });
    } catch (error: any) {
      console.error(`❌ Error checking locked collateral:`, error);
      return []; // Return empty if we can't check locked collateral
    }

    // If there's locked collateral, try to find positions using known commitments
    if (totalLockedCollateral > 0n) {
      console.log(`✅ Found locked collateral: ${totalLockedCollateral.toString()}, searching for positions...`);
      
      // Try to find positions by checking all known commitments
      for (const commitment of knownCommitments) {
        try {
          const LOW_128_MASK = (1n << 128n) - 1n;
          let commitmentBigInt: bigint;
          try {
            commitmentBigInt = BigInt(commitment);
          } catch {
            commitmentBigInt = BigInt('0x' + commitment.replace('0x', ''));
          }
          const commitmentLow = commitmentBigInt & LOW_128_MASK;
          const queryCommitment = '0x' + commitmentLow.toString(16);

          console.log(`🔍 Checking commitment: ${queryCommitment.slice(0, 16)}...`);

          const record = await dataStoreContract.get_position(queryCommitment);
          
          // Check if this position belongs to the user
          const recordAccount = String(record.account || '').toLowerCase();
          const userAddressLower = userAddress.toLowerCase();
          const recordMarketId = String(record.market_id || '').toLowerCase();

          if (recordAccount === userAddressLower) {
            // Find which market this position belongs to
            let matchedMarketId: string | null = null;
            for (const [marketId, marketIdFelt] of Object.entries(PRAGMA_ASSET_IDS)) {
              if (marketIdFelt.toLowerCase() === recordMarketId) {
                matchedMarketId = marketId;
                break;
              }
            }

            if (matchedMarketId) {
              console.log(`✅ Found position for ${matchedMarketId} with commitment ${queryCommitment.slice(0, 16)}...`);
              
              // Get locked collateral for this specific market (for margin calculation)
              let marketLockedCollateral = totalLockedCollateral;
              try {
                const marketLocked = await vaultContract.get_locked_collateral(
                  userAddress,
                  PRAGMA_ASSET_IDS[matchedMarketId]
                );
                marketLockedCollateral = BigInt(marketLocked?.toString() || '0');
              } catch {
                // Use total if market-specific check fails
              }

              const lockedDecimal = (Number(marketLockedCollateral) / 1e18).toFixed(2);
              
              positions.push({
                commitment: queryCommitment,
                marketId: matchedMarketId,
                isLong: true, // We can't determine this from on-chain data, default to true
                margin: lockedDecimal, // Use locked collateral as margin
                timestamp: Number(record.opened_at || Date.now() / 1000) * 1000,
                leverage: 20, // Default leverage, can't determine from on-chain
                // Note: size, entryPrice, pnl, traderSecret are not available on-chain
                // These would need to be stored separately or reconstructed
              });
            }
          }
        } catch (error: any) {
          // Continue to next commitment if this one fails
          console.warn(`⚠️ Failed to check commitment ${commitment.slice(0, 16)}...:`, error?.message);
          continue;
        }
      }

      // If we have locked collateral but no positions found, it means commitments are missing
      if (positions.length === 0 && knownCommitments.length === 0 && totalLockedCollateral > 0n) {
        console.warn(`⚠️ Found locked collateral (${totalLockedCollateral.toString()}) but no commitments in localStorage.`);
        console.warn(`💡 Positions exist on-chain but cannot be displayed without commitments.`);
        console.warn(`💡 Solution: Try refreshing the page, or if you have the position details saved elsewhere, you can manually add them.`);
      } else if (positions.length === 0 && knownCommitments.length > 0 && totalLockedCollateral > 0n) {
        console.warn(`⚠️ Found locked collateral (${totalLockedCollateral.toString()}) but none of the ${knownCommitments.length} commitments matched any positions.`);
        console.warn(`💡 This might mean the commitments are in a different format, or the positions were closed.`);
      }
    } else {
      console.log(`ℹ️ No locked collateral found - no open positions`);
    }


    console.log(`📊 Fetched ${positions.length} positions from on-chain (with locked collateral)`);
    return positions;
  } catch (error: any) {
    console.error('❌ Error fetching positions from chain:', error);
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      userAddress,
      knownCommitmentsCount: knownCommitments.length,
    });
    // Return empty array on error - don't throw, let the UI handle it gracefully
    return [];
  }
}

