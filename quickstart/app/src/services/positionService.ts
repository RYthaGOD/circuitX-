import { RpcProvider, Contract } from 'starknet';
import { CONTRACTS, NETWORK } from '../config/contracts';
import { Position } from '../stores/tradingStore';

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
 * Verify if a position exists on-chain by querying DataStore
 */
export async function verifyPositionOnChain(commitment: string): Promise<boolean> {
  try {
    const provider = new RpcProvider({ nodeUrl: NETWORK.RPC_URL });
    const dataStore = new Contract(DATA_STORE_ABI, CONTRACTS.DATA_STORE, provider);

    // Normalize commitment to lowercase for comparison
    let normalizedCommitment = commitment.toLowerCase().trim();
    if (!normalizedCommitment.startsWith('0x')) {
      normalizedCommitment = '0x' + normalizedCommitment;
    }
    
    // CRITICAL: Extract low 128 bits to match contract behavior
    // Contract uses: commitment_u256.low.into() (takes low 128 bits as felt252)
    const LOW_128_MASK = (1n << 128n) - 1n; // 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF
    let commitmentBigInt: bigint;
    try {
      commitmentBigInt = BigInt(normalizedCommitment);
    } catch {
      commitmentBigInt = BigInt('0x' + normalizedCommitment.replace('0x', ''));
    }
    const commitmentLow = commitmentBigInt & LOW_128_MASK;
    const queryCommitment = '0x' + commitmentLow.toString(16);
    
    console.log('🔍 Querying position with commitment:', {
      original: commitment,
      normalized: normalizedCommitment,
      queryCommitment: queryCommitment,
      originalBigInt: commitmentBigInt.toString(),
      low128BigInt: commitmentLow.toString(),
    });
    
    const result = await dataStore.get_position(queryCommitment);
    
    console.log('🔍 Verification result for position:', {
      queryCommitment: queryCommitment.slice(0, 16) + '...',
      result: result,
      resultCommitment: result.commitment,
      resultCommitmentType: typeof result.commitment,
    });
    
    // Position exists if commitment matches and is not zero
    // Check multiple zero formats
    const resultCommitment = String(result.commitment || '').toLowerCase();
    const isZero = resultCommitment === '0x0' || 
                   resultCommitment === '0' || 
                   resultCommitment === '' ||
                   (resultCommitment.startsWith('0x') && BigInt(resultCommitment || '0x0') === 0n);
    
    // Also check if the returned commitment matches what we queried
    // Normalize both for comparison (extract low 128 bits from result too)
    let resultCommitmentBigInt: bigint;
    try {
      resultCommitmentBigInt = BigInt(resultCommitment);
    } catch {
      resultCommitmentBigInt = 0n;
    }
    const resultCommitmentLow = resultCommitmentBigInt & LOW_128_MASK;
    const normalizedResultCommitment = '0x' + resultCommitmentLow.toString(16);
    
    const matches = normalizedResultCommitment === queryCommitment;
    
    const exists = !isZero && matches;
    
    console.log('✅ Position verification:', {
      queryCommitment: queryCommitment.slice(0, 16) + '...',
      exists,
      isZero,
      matches,
      resultCommitment: normalizedResultCommitment.slice(0, 16) + '...',
      rawResultCommitment: resultCommitment.slice(0, 16) + '...',
    });
    
    return exists;
  } catch (error) {
    console.error(`❌ Error verifying position ${commitment.slice(0, 16)}...:`, error);
    // If there's an error, DON'T assume it doesn't exist - return true to be safe
    // This prevents accidentally removing valid positions due to network/RPC errors
    console.warn('⚠️ Returning true (safe default) due to error - position will be kept');
    return true; // Changed from false to true - safer default
  }
}

/**
 * Sync positions: Load from localStorage and verify each exists on-chain
 * Removes positions that no longer exist on-chain (were closed)
 */
export async function syncPositionsFromBlockchain(
  positions: Position[]
): Promise<Position[]> {
  if (positions.length === 0) {
    return [];
  }

  console.log(`Syncing ${positions.length} positions from blockchain...`);

  const verifiedPositions: Position[] = [];

  // Verify each position exists on-chain
  for (const position of positions) {
    const exists = await verifyPositionOnChain(position.commitment);
    
    if (exists) {
      verifiedPositions.push(position);
      console.log(`✓ Position ${position.commitment.slice(0, 16)}... verified`);
    } else {
      console.log(`✗ Position ${position.commitment.slice(0, 16)}... not found on-chain (removed)`);
    }
  }

  console.log(`Synced positions: ${verifiedPositions.length}/${positions.length} still active`);
  return verifiedPositions;
}

