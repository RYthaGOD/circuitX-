import { Account } from 'starknet';
import { CONTRACTS, MARKET_INFO } from '../config/contracts';
import { Position } from '../stores/tradingStore';
import { generateClosePositionProof } from './proofService';
import { updateOraclePriceFromPyth } from './oracleService';
import { fetchLockedCollateral } from '../lib/balanceUtils';
import { verifyPositionOnChain } from './positionService';

/**
 * Client-side service for closing positions
 * Directly calls contract functions from the frontend
 */
export interface ClosePositionResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

/**
 * Close a position by directly calling the contract
 * Handles all steps: oracle update, proof generation, and contract call
 */
export async function closePositionClient(
  account: Account,
  position: Position,
  currentPrice?: number
): Promise<ClosePositionResult> {
  try {
    // Validate inputs
    if (!account) {
      throw new Error('Account not provided');
    }

    if (!position.traderSecret) {
      throw new Error('Position data incomplete. Missing traderSecret.');
    }

    // Step 1: Update oracle price if needed
    let updatedPrice: number = currentPrice || 0;
    let priceInOracleFormat = '0';

    try {
      const oracleUpdateResult = await updateOraclePriceFromPyth(account, position.marketId);
      const priceDecimals = MARKET_INFO[position.marketId as keyof typeof MARKET_INFO]?.decimals || 8;
      updatedPrice = oracleUpdateResult.price || (currentPrice || 0);
      priceInOracleFormat = Math.floor(updatedPrice * (10 ** priceDecimals)).toString();
    } catch (oracleError: any) {
      console.warn('Failed to update oracle, using current price:', oracleError);
      const priceDecimals = MARKET_INFO[position.marketId as keyof typeof MARKET_INFO]?.decimals || 8;
      const currentPriceNum = currentPrice || 0;
      if (currentPriceNum > 0) {
        priceInOracleFormat = Math.floor(currentPriceNum * (10 ** priceDecimals)).toString();
      } else {
        throw new Error('Unable to get current price for closing position');
      }
    }

    // Step 2: Convert position data to wei format
    const marginValue = parseFloat(position.margin || '0');
    const marginWei = marginValue > 1e10 
      ? BigInt(Math.floor(marginValue))
      : BigInt(Math.floor(marginValue * 1e18));

    // Calculate position size
    const entryPriceValue = parseFloat(position.entryPrice || '0');
    const leverage = position.leverage || 20;
    const size = (marginValue * leverage) / entryPriceValue;
    const positionSizeWei = BigInt(Math.floor(size * 1e18));

    const priceDecimals = MARKET_INFO[position.marketId as keyof typeof MARKET_INFO]?.decimals || 8;
    const entryPriceWei = BigInt(Math.floor(entryPriceValue * (10 ** priceDecimals)));

    // Step 3: Query locked collateral (needed for proof generation)
    const lockedCollateral = await fetchLockedCollateral(account.address, position.marketId);

    // Step 4: Generate ZK proof FIRST - this will generate the commitment in the correct format
    const now = Math.floor(Date.now() / 1000);
    const proofResult = await generateClosePositionProof({
      privateMargin: marginWei.toString(),
      privatePositionSize: positionSizeWei.toString(),
      privateEntryPrice: entryPriceWei.toString(),
      privateTraderSecret: position.traderSecret,
      isLong: position.isLong,
      marketId: position.marketId,
      currentPrice: priceInOracleFormat,
      closingSize: positionSizeWei.toString(),
      currentTime: now,
      priceTimestamp: now,
      numSources: 3,
      minSources: 2,
      maxPriceAge: 60,
      tradingFeeBps: 10,
      lockedCollateral: lockedCollateral,
    });

    // Step 5: Extract commitment from proof's public inputs (CRITICAL: must match what's in the proof)
    // publicInputs format: [market_id, commitment, outcome_code, ...]
    if (proofResult.publicInputs.length < 2) {
      throw new Error(`Invalid public inputs: expected at least 2 elements, got ${proofResult.publicInputs.length}`);
    }
    
    // Use the commitment from the proof's public inputs - this ensures it matches what the proof expects
    const commitmentFromProof = proofResult.publicInputs[1].toLowerCase().trim();
    console.log('📝 Using commitment from proof public inputs:', {
      commitment: commitmentFromProof.slice(0, 20) + '...',
      positionCommitment: position.commitment.slice(0, 20) + '...',
      match: commitmentFromProof.toLowerCase() === position.commitment.toLowerCase(),
    });

    // Step 6: Verify position exists on-chain using the commitment from proof
    const positionExists = await verifyPositionOnChain(commitmentFromProof);
    if (!positionExists) {
      // Fallback: try with position.commitment (normalized)
      let normalizedCommitment = position.commitment.toLowerCase().trim();
      if (!normalizedCommitment.startsWith('0x')) {
        normalizedCommitment = '0x' + normalizedCommitment;
      }
      const LOW_128_MASK = (1n << 128n) - 1n;
      let commitmentBigInt: bigint;
      try {
        commitmentBigInt = BigInt(normalizedCommitment);
      } catch {
        commitmentBigInt = BigInt('0x' + normalizedCommitment.replace('0x', ''));
      }
      const commitmentLow = commitmentBigInt & LOW_128_MASK;
      const fallbackCommitment = '0x' + commitmentLow.toString(16);
      
      const fallbackExists = await verifyPositionOnChain(fallbackCommitment);
      if (!fallbackExists) {
        throw new Error(`Position not found on-chain. Commitment from proof: ${commitmentFromProof.slice(0, 20)}...`);
      }
      console.warn('⚠️ Position found with fallback commitment format, but proof uses different format');
    }

    // Step 7: Call contract directly - use commitment from proof to ensure match
    const tx = await callClosePositionContract(
      account,
      proofResult.proof,
      proofResult.publicInputs,
      commitmentFromProof  // Use commitment from proof, not from position
    );

    // Step 8: Wait for confirmation
    await account.waitForTransaction(tx.transaction_hash);

    return {
      success: true,
      txHash: tx.transaction_hash,
    };
  } catch (error: any) {
    console.error('Error closing position:', error);
    return {
      success: false,
      error: error?.message || 'Unknown error occurred',
    };
  }
}

/**
 * Direct contract call to close_position function
 * This is the client-side function that directly interacts with the contract
 */
async function callClosePositionContract(
  account: Account,
  proof: string[],
  publicInputs: string[],
  commitment: string
) {
  // Validate and format inputs (matching usePerpRouter pattern)
  const validateHexArray = (arr: any[], name: string) => {
    arr.forEach((v, i) => {
      if (typeof v !== 'string') {
        throw new Error(`${name}[${i}] must be a string, got ${typeof v}`);
      }
      if (!v.startsWith('0x') && !v.startsWith('0X')) {
        throw new Error(`${name}[${i}] must start with 0x, got: "${v}"`);
      }
    });
  };

  validateHexArray(proof, 'proof');
  validateHexArray(publicInputs, 'publicInputs');

  if (typeof commitment !== 'string' || (!commitment.startsWith('0x') && !commitment.startsWith('0X'))) {
    throw new Error(`commitment must be a string starting with 0x, got: "${commitment}"`);
  }

  // Format inputs (normalize to lowercase)
  const proofFormatted = proof.map(v => v.toLowerCase());
  const publicInputsFormatted = publicInputs.map(v => v.toLowerCase());
  const commitmentFormatted = commitment.toLowerCase();

  // Extract minimal public inputs (first 3: market_id, commitment, outcome_code)
  const minimalPublicInputs = publicInputsFormatted.slice(0, 3);

  // Format as Span<felt252> for contract call
  // Span format: [length, ...elements]
  const proofLenHex = '0x' + BigInt(proofFormatted.length).toString(16);
  const publicInputsLenHex = '0x' + BigInt(minimalPublicInputs.length).toString(16);

  // Build calldata array matching usePerpRouter format
  const calldata = [
    proofLenHex,
    ...proofFormatted,
    publicInputsLenHex,
    ...minimalPublicInputs,
    commitmentFormatted,
  ];

  console.log('📤 Calling close_position contract function directly:', {
    routerAddress: CONTRACTS.PERP_ROUTER,
    proofLength: proofFormatted.length,
    publicInputsLength: minimalPublicInputs.length,
    commitment: commitmentFormatted.slice(0, 16) + '...',
    calldataLength: calldata.length,
  });

  // Call the contract function directly using account.execute()
  const tx = await account.execute({
    contractAddress: CONTRACTS.PERP_ROUTER,
    entrypoint: 'close_position',
    calldata: calldata,
  });

  return tx;
}

/**
 * Get position PnL (client-side calculation)
 * This calculates PnL client-side for display purposes
 */
export async function getPositionPnLFromContract(
  position: Position,
  currentPrice: number
): Promise<{ pnl: number; pnlPercent: number }> {
  // Calculate PnL client-side (contract doesn't expose this directly)
  // This is a helper function for display purposes
  const marginValue = parseFloat(position.margin || '0');
  const marginInYUSD = marginValue > 1e10 ? marginValue / 1e18 : marginValue;
  const entryPriceValue = parseFloat(position.entryPrice || '0');
  const leverage = position.leverage || 20;
  const size = (marginInYUSD * leverage) / entryPriceValue;

  let pnl: number;
  if (position.isLong) {
    pnl = (currentPrice - entryPriceValue) * size;
  } else {
    pnl = (entryPriceValue - currentPrice) * size;
  }

  const pnlPercent = entryPriceValue > 0 ? (pnl / marginInYUSD) * 100 : 0;

  return { pnl, pnlPercent };
}

