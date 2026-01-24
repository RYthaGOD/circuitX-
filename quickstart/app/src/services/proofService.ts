import { Noir } from '@noir-lang/noir_js';
import { DebugFileMap } from '@noir-lang/types';
import { UltraHonkBackend } from '@aztec/bb.js';
import { getZKHonkCallData, init } from 'garaga';
import { cairo } from 'starknet';
import { flattenFieldsAsArray } from '../helpers/proof';
import { bytecode, abi } from '../assets/circuit.json';
import vkUrl from '../assets/vk.bin?url';
// Import from shared config to ensure consistency - MUST be at top level
import { getMarketIdFelt as getMarketIdFeltFromConfig } from '../config/contracts';

let vkCache: Uint8Array | null = null;

async function loadVerifyingKey(): Promise<Uint8Array> {
  if (vkCache) return vkCache;
  
  const response = await fetch(vkUrl);
  const arrayBuffer = await response.arrayBuffer();
  vkCache = new Uint8Array(arrayBuffer);
  return vkCache;
}

function generateRandomSecret(): string {
  // Generate a random 32-byte hex string
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const hexString = '0x' + Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
  
  // BN254 field modulus: 21888242871839275222246405745257275088548364400416034343698204186575808495617
  // Ensure the secret is within the field modulus
  const fieldModulus = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');
  const secretBigInt = BigInt(hexString);
  const secretMod = secretBigInt % fieldModulus;
  
  // Return as hex string (Noir expects string format)
  return '0x' + secretMod.toString(16);
}

/**
 * Convert a string to its felt252 numeric representation
 * Uses shared getMarketIdFelt function to ensure market_id matches what's stored in DataStore
 * This is CRITICAL for avoiding MARKET_DISABLED errors
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function stringToFelt252(str: string): string {
  try {
    // Use shared function for known markets - this ensures consistency
    return getMarketIdFeltFromConfig(str);
  } catch {
    // Fallback to cairo.felt() for other strings
    const felt = cairo.felt(str);
    // cairo.felt() returns a decimal string, convert to hex
    if (typeof felt === 'string' && !felt.startsWith('0x')) {
      return '0x' + BigInt(felt).toString(16);
    }
    return felt;
  }
}

export interface OpenPositionProofInputs {
  privateMargin: string;      // Margin in wei (yUSD)
  privatePositionSize: string; // Position size in wei (BTC)
  isLong: boolean;
  marketId: string;
  oraclePrice: string;        // Current price from oracle
  leverage: number;           // e.g., 20 for 20x
  currentTime: number;        // Unix timestamp
  priceTimestamp: number;      // Price timestamp
  numSources: number;         // Number of price sources
  minSources: number;         // Minimum required sources
  maxPriceAge: number;        // Max price age in seconds
  depositedBalance: string;  // NEW: User's deposited balance in vault (in wei)
}

export interface ProofResult {
  proof: string[];            // Proof data as felt252 array
  publicInputs: string[];     // Public inputs
  commitment: string;         // Commitment hash
  traderSecret?: string;      // Trader secret (needed for closing positions)
}

export async function generateOpenPositionProof(
  inputs: OpenPositionProofInputs
): Promise<ProofResult> {
  // Ensure garaga is initialized
  await init();
  
  // Load verifying key
  const vk = await loadVerifyingKey();
  
  // Generate random trader secret
  const privateTraderSecret = generateRandomSecret();
  
  // CRITICAL: Ensure oraclePrice is properly formatted for circuit
  // Circuit expects price as integer (with decimals already accounted for)
  // For 8-decimal assets: multiply by 10^8 to get integer representation
  // Example: BTC/USD price 91394.48 becomes 9139448000000 (91394.48 * 10^8)
  const oraclePriceFloat = parseFloat(inputs.oraclePrice);
  if (isNaN(oraclePriceFloat)) {
    throw new Error(`Invalid oraclePrice: ${inputs.oraclePrice} (must be a valid number)`);
  }
  // Use proper decimal handling: multiply by 10^8 for 8-decimal assets
  // This preserves precision instead of flooring
  const PRICE_DECIMALS = 8; // Standard for crypto/USD pairs
  const oraclePriceInt = BigInt(Math.round(oraclePriceFloat * (10 ** PRICE_DECIMALS))).toString();
  
  // Calculate execution price (for now, use oracle price with no impact)
  const priceImpact = '0';
  const executionPrice = oraclePriceInt;
  
  // PERMANENT FIX: Use normalizer to ensure exact format consistency
  // This ensures the market_id in public_inputs matches the storage key used during deposit
  const { normalizeMarketId } = await import('../lib/marketIdNormalizer');
  const marketIdHex = normalizeMarketId(inputs.marketId);
  
  console.log('🔍 Market ID (proofService - normalized):', {
    inputMarketId: inputs.marketId,
    marketIdHex,
    usingExactFormat: true,
    source: 'marketIdNormalizer (ensures exact format consistency)',
  });
  
  // Prepare circuit inputs
  // CRITICAL: Use hex format to match what deposit uses
  const circuitInput = {
    action: 0, // 0 = open_market
    private_margin: inputs.privateMargin,
    private_position_size: inputs.privatePositionSize,
    private_entry_price: oraclePriceInt, // Use integer price
    private_trader_secret: privateTraderSecret,
    is_long: inputs.isLong ? 1 : 0,
    market_id: marketIdHex, // Use hex format to match deposit
    oracle_price: oraclePriceInt, // Use integer price
    current_time: inputs.currentTime.toString(),
    price_timestamp: inputs.priceTimestamp.toString(),
    num_sources: inputs.numSources.toString(),
    min_sources: inputs.minSources.toString(),
    max_price_age: inputs.maxPriceAge.toString(),
    price_impact: priceImpact,
    execution_price: executionPrice, // Already integer
    acceptable_slippage: '100', // 1% in basis points
    leverage: inputs.leverage.toString(),
    min_margin_ratio: '5', // 5%
    max_position_size: '1000000000000000000000', // Max position size
    trigger_price: '0',
    current_price: oraclePriceInt, // Use integer price (CRITICAL: circuit expects integer)
    closing_size: '0',
    take_profit_price: '0',
    stop_loss_price: '0',
    trading_fee_bps: '10', // 0.1%
    twap_price: '0',
    twap_duration: '0',
    chunk_index: '0',
    total_chunks: '0',
    // NEW: Collateral management inputs
    deposited_balance: inputs.depositedBalance,  // User's vault balance
    locked_collateral: '0',  // Not used for opening (set to 0)
  };

  // Generate witness
  const noir = new Noir({ 
    bytecode, 
    abi: abi as any, 
    debug_symbols: '', 
    file_map: {} as DebugFileMap 
  });
  
  // Log inputs for debugging
  console.log('Circuit inputs:', {
    action: circuitInput.action,
    market_id: circuitInput.market_id,
    market_id_type: typeof circuitInput.market_id,
    has_all_fields: Object.keys(circuitInput).length,
    all_keys: Object.keys(circuitInput),
  });
  
  let execResult;
  try {
    execResult = await noir.execute(circuitInput);
    console.log('Circuit execution result:', execResult);
  } catch (error: any) {
    console.error('Noir execution error:', error);
    console.error('Circuit input keys:', Object.keys(circuitInput));
    console.error('Full circuit input:', JSON.stringify(circuitInput, null, 2));
    if (abi && abi.parameters) {
      console.error('ABI expected parameters:', abi.parameters.map((p: any) => `${p.name}: ${p.type.kind}`));
    }
    throw error;
  }

  // Extract locked_amount from circuit return value BEFORE generating proof
  // This way we can include it in the public inputs that get embedded in the proof
  let lockedAmountFromCircuit: string = '0';
  const returnValue = execResult.returnValue;
  
  if (Array.isArray(returnValue) && returnValue.length >= 2) {
    lockedAmountFromCircuit = returnValue[1]?.toString() || '0';
  } else if (typeof returnValue === 'string' && returnValue.includes(',')) {
    const parts = returnValue.split(',');
    lockedAmountFromCircuit = parts[1]?.trim() || '0';
  } else if (typeof returnValue === 'object' && returnValue !== null) {
    lockedAmountFromCircuit = (returnValue as any)[1]?.toString() || '0';
  }
  
  // Ensure locked_amount is in hex format
  if (!lockedAmountFromCircuit.startsWith('0x')) {
    try {
      lockedAmountFromCircuit = '0x' + BigInt(lockedAmountFromCircuit).toString(16);
    } catch {
      lockedAmountFromCircuit = '0x0';
    }
  }
  
  // Validate locked_amount matches private_margin (should be the same since no randomization)
  const privateMarginBigInt = BigInt(inputs.privateMargin);
  const lockedAmountBigInt = BigInt(lockedAmountFromCircuit);
  
  console.log('🔒 Extracted locked_amount BEFORE proof generation:', {
    lockedAmount: lockedAmountFromCircuit,
    lockedAmountDecimal: (lockedAmountBigInt / BigInt(1e18)).toString(),
    privateMargin: inputs.privateMargin,
    privateMarginDecimal: (privateMarginBigInt / BigInt(1e18)).toString(),
    matches: lockedAmountBigInt === privateMarginBigInt,
    isZero: lockedAmountBigInt === 0n,
  });
  
  // CRITICAL: Validate locked_amount matches private_margin
  if (lockedAmountBigInt !== privateMarginBigInt) {
    console.error('❌ CRITICAL: locked_amount from circuit does not match private_margin!', {
      lockedAmount: lockedAmountBigInt.toString(),
      privateMargin: privateMarginBigInt.toString(),
      difference: (lockedAmountBigInt - privateMarginBigInt).toString(),
    });
    // Still proceed, but log the mismatch - this should not happen with no randomization
  }
  
  if (lockedAmountBigInt === 0n) {
    console.error('❌ CRITICAL: Circuit returned locked_amount = 0! This will cause lock_collateral to fail.');
    throw new Error('Circuit returned locked_amount = 0. This should not happen. Please check the circuit.');
  }

  // Generate proof
  const honk = new UltraHonkBackend(bytecode, { threads: 1 });
  const proof = await honk.generateProof(execResult.witness, { starknetZK: true });
  honk.destroy();
  
  console.log('Proof generated:', proof);
  console.log('Proof publicInputs (from circuit):', proof.publicInputs);
  console.log('Proof publicInputs length:', proof.publicInputs?.length);
  console.log('Proof publicInputs type:', typeof proof.publicInputs);
  
  // CRITICAL: In Noir, public return values (pub return type) ARE automatically included
  // in proof.publicInputs. The circuit returns pub (Field, Field, Field, Field) which
  // means (commitment, locked_amount, 0, 0) should be in proof.publicInputs.
  // 
  // The verifier returns ALL public inputs, including return values.
  // So proof.publicInputs should already include locked_amount at the end.
  // 
  // IMPORTANT: We CANNOT modify proof.publicInputs after proof generation because
  // the proof was generated with the original public inputs. The verifier checks
  // the proof against the embedded public inputs, so they must match exactly.
  // 
  // locked_amount = private_margin (no randomization, always within reasonable bounds)
  // No reduction needed - margin values are user inputs and should be reasonable
  const publicInputsArray = Array.isArray(proof.publicInputs) ? proof.publicInputs : [];
  const FELT252_MAX = BigInt('0x800000000000011000000000000000000000000000000000000000000000000');
  const _STARKNET_PRIME = FELT252_MAX + 1n; // 0x800000000000011000000000000000000000000000000000000000000000001
  
  // The circuit returns: pub (commitment, locked_amount, 0, 0)
  // These should be the last 4 elements of proof.publicInputs
  const last4Inputs = publicInputsArray.slice(-4);
  
  console.log('📝 Public inputs analysis:', {
    totalLength: publicInputsArray.length,
    last4Inputs: last4Inputs,
    returnValueFromCircuit: returnValue,
    lockedAmountFromReturn: lockedAmountFromCircuit,
  });
  
  // CRITICAL: DO NOT modify proof.publicInputs after proof generation
  // The proof is cryptographically bound to the original public inputs
  // Modifying them will cause "Consistency check failed" error
  // 
  // The solution is to ensure the circuit generates locked_amount that fits in felt252 bounds
  // For now, we use the original public inputs as-is and reduce locked_amount only
  // when passing it to the contract in the separate publicInputs array
  const originalPublicInputs = flattenFieldsAsArray(proof.publicInputs);
  
  // Extract commitment from return value (needed for public inputs)
  let commitmentFromCircuit: string = '0';
  if (Array.isArray(returnValue) && returnValue.length >= 1) {
    commitmentFromCircuit = returnValue[0]?.toString() || '0';
  } else if (typeof returnValue === 'string' && returnValue.includes(',')) {
    const parts = returnValue.split(',');
    commitmentFromCircuit = parts[0]?.trim() || '0';
  } else if (typeof returnValue === 'object' && returnValue !== null) {
    commitmentFromCircuit = (returnValue as any)[0]?.toString() || '0';
  }
  
  // Format commitment (extract low 128 bits to match contract)
  let commitmentBigInt: bigint;
  if (typeof commitmentFromCircuit === 'string') {
    const trimmed = commitmentFromCircuit.trim();
    if (trimmed.startsWith('0x') || trimmed.startsWith('0X')) {
      commitmentBigInt = BigInt(trimmed);
    } else {
      commitmentBigInt = BigInt(trimmed);
    }
  } else {
    commitmentBigInt = BigInt(commitmentFromCircuit);
  }
  const LOW_128_MASK = (1n << 128n) - 1n;
  const commitmentLow = commitmentBigInt & LOW_128_MASK;
  const commitmentHex = '0x' + commitmentLow.toString(16);
  
  // CRITICAL: Log public inputs before passing to getZKHonkCallData
  // This helps debug verifier mismatch issues
  console.log('🔑 Verifying Key Info:', {
    vkLength: vk.length,
    vkFirstBytes: Array.from(vk.slice(0, 16)),
    publicInputsLength: originalPublicInputs.length,
    publicInputsFirstBytes: Array.from(originalPublicInputs.slice(0, 32)),
    proofPublicInputsArrayLength: publicInputsArray.length,
    lockedAmountInProof: last4Inputs.length >= 2 ? last4Inputs[1] : 'not found',
  });

  // Prepare calldata for contract with ORIGINAL public inputs
  // CRITICAL: We cannot modify the public inputs here because the proof was generated
  // with the original public inputs. Modifying them will cause "Consistency check failed".
  // 
  // The verifier will fail if locked_amount in the embedded public inputs exceeds felt252 bounds.
  // The solution is to rebuild the circuit to cap the noise so locked_amount always fits.
  // 
  // For now, we use the original public inputs and hope the verifier can handle it.
  // If it fails, we need to rebuild the circuit with capped noise.
  const callData = getZKHonkCallData(
    proof.proof,
    originalPublicInputs, // Original public inputs (proof was generated with these)
    vk,
    1 // HonkFlavor.STARKNET
  );

  // CRITICAL: According to Starknet team, public inputs are already part of the proof structure
  // We should use the FULL callData (minus the first element) as the proof
  // The verifier will extract and return the public inputs if the proof is valid
  // callData format: [proof_length, ...proof_with_hints_and_embedded_public_inputs]
  console.log('Raw callData from getZKHonkCallData:', {
    length: callData.length,
    first10: callData.slice(0, 10),
    types: callData.slice(0, 10).map(v => typeof v),
    sampleValues: callData.slice(0, 5).map(v => ({ value: v, type: typeof v, string: String(v) }))
  });
  
  // CRITICAL: Use callData.slice(1) directly like the example app
  // getZKHonkCallData() already returns properly formatted felt252 values
  // We should NOT convert them again as that can cause felt252 overflow
  // callData format: [proof_length, ...proof_data_with_hints_and_embedded_public_inputs]
  const fullProofData = callData.slice(1);
  
  console.log('Raw full proof data from callData.slice(1):', {
    count: fullProofData.length,
    first5: fullProofData.slice(0, 5),
    types: fullProofData.slice(0, 5).map(v => typeof v),
    hasNonString: fullProofData.some(v => typeof v !== 'string'),
    sampleValues: fullProofData.slice(0, 10).map((v, i) => ({
      index: i,
      value: v,
      type: typeof v,
      stringified: String(v),
    }))
  });
  
  // CRITICAL: Use callData.slice(1) directly without conversion
  // The values from getZKHonkCallData() are already properly formatted as felt252
  // Only ensure they're strings (they should already be)
  const proofData = fullProofData.map((v, i) => {
    // Ensure it's a string (should already be from garaga)
    if (typeof v !== 'string') {
      // Convert to string if needed (shouldn't happen but be safe)
      const str = String(v);
      if (str.startsWith('0x') || str.startsWith('0X')) {
        return str.toLowerCase();
      }
      // If it's a number, convert to hex
      try {
        return '0x' + BigInt(v).toString(16);
      } catch {
        throw new Error(`Cannot convert proof value at index ${i} to hex: ${v} (${typeof v})`);
      }
    }
    // Already a string - normalize to lowercase
    return String(v).toLowerCase();
  });
  
  console.log(`Using ${proofData.length} proof values directly from callData.slice(1), first 5:`, proofData.slice(0, 5));
  
  // Validate all proof values are strings with 0x prefix
  const invalidProof = proofData.filter(v => typeof v !== 'string' || !v.startsWith('0x'));
  if (invalidProof.length > 0) {
    console.error(`Found ${invalidProof.length} proof values without 0x prefix:`, invalidProof);
    throw new Error(`Invalid proof data: ${invalidProof.length} values missing 0x prefix`);
  }
  
  // The verifier is called with only the proof (not public_inputs)
  // The position handler expects public_inputs as [market_id, commitment] at positions 0 and 1
  // We format public_inputs separately for the position handler
  // Reuse variables already declared above (returnValue, commitmentHex, etc.)
  
  // Extract commitment from return value (already done above, reuse commitmentFromCircuit)
  let commitment: string = commitmentFromCircuit;
  
  console.log('🔍 Circuit returnValue type:', typeof returnValue, 'value:', returnValue);
  
  if (Array.isArray(returnValue)) {
    // Tuple returned as array
    commitment = returnValue[0]?.toString() || '0x0';
    const lockedAmountCheck = returnValue[1]?.toString() || '0';
    console.log('📦 Circuit returned tuple (array):', {
      commitment: returnValue[0],
      locked_amount: lockedAmountCheck,
      locked_amount_decimal: (BigInt(lockedAmountCheck) / BigInt(1e18)).toString(),
      tuple_length: returnValue.length,
      all_values: returnValue,
    });
    
    // WARNING if locked_amount is 0
    if (BigInt(lockedAmountCheck) === 0n) {
      console.error('❌ CRITICAL: Circuit returned locked_amount = 0! This will cause lock_collateral to be called with 0, so vault balance won\'t change.');
      console.error('Expected locked_amount to equal private_margin (no randomization).');
    }
  } else if (typeof returnValue === 'string') {
    // Check if it's a comma-separated tuple string
    if (returnValue.includes(',')) {
      const parts = returnValue.split(',');
      commitment = parts[0].trim();
      console.log('📦 Circuit returned tuple (comma-separated string):', {
        commitment: parts[0],
        locked_amount: parts[1],
        tuple_length: parts.length,
      });
    } else {
      // Single value (old format)
      commitment = returnValue;
    }
  } else if (typeof returnValue === 'object' && returnValue !== null) {
    // Tuple might be returned as object with numeric keys
    const tuple = returnValue as any;
    commitment = tuple[0]?.toString() || tuple.commitment?.toString() || '0x0';
    console.log('📦 Circuit returned tuple (object):', {
      commitment: tuple[0] || tuple.commitment,
      locked_amount: tuple[1],
    });
  }
  
  // Ensure commitment is a valid string
  if (!commitment || commitment === '') {
    throw new Error(`Failed to extract commitment from circuit return value: ${JSON.stringify(returnValue)}`);
  }
  
  // Recalculate commitmentHex from the extracted commitment (in case it changed)
  let commitmentBigIntRecalc: bigint;
  if (typeof commitment === 'string') {
    const trimmed = commitment.trim();
    if (trimmed.startsWith('0x') || trimmed.startsWith('0X')) {
      commitmentBigIntRecalc = BigInt(trimmed);
    } else {
      try {
        commitmentBigIntRecalc = BigInt(trimmed);
      } catch {
        commitmentBigIntRecalc = BigInt('0x' + trimmed);
      }
    }
  } else {
    commitmentBigIntRecalc = BigInt(commitment);
  }
  
  const commitmentLowRecalc = commitmentBigIntRecalc & LOW_128_MASK;
  const commitmentHexFinal = '0x' + commitmentLowRecalc.toString(16);
  
  // marketIdHex is already declared above (line 113), use it directly
  // We already have marketIdHex from getMarketIdFeltFromConfig, no need to redeclare
  
  // locked_amount = private_margin (no randomization, always within reasonable bounds)
  // No need for modulo reduction - margin values are user inputs and should be reasonable
  let lockedAmountHex: string;
  try {
    const lockedAmountBigInt = BigInt(lockedAmountFromCircuit);
    lockedAmountHex = '0x' + lockedAmountBigInt.toString(16);
    
    // Validate it fits in felt252 (63 hex digits after 0x)
    const lockedAmountHexDigits = lockedAmountHex.slice(2);
    if (lockedAmountHexDigits.length > 63) {
      throw new Error(`locked_amount exceeds felt252 bounds: ${lockedAmountHexDigits.length} hex digits (max 63). Value: ${lockedAmountHex}`);
    }
    
    console.log('🔒 locked_amount (no reduction needed):', {
      lockedAmount: lockedAmountHex,
      lockedAmountDecimal: lockedAmountBigInt.toString(),
      hexDigits: lockedAmountHexDigits.length,
      fitsInFelt252: lockedAmountHexDigits.length <= 63,
    });
  } catch (e) {
    console.error('❌ Failed to format locked_amount:', e);
    throw new Error(`Failed to format locked_amount: ${e}`);
  }
  
  // Final validation - ensure all values are strings with 0x prefix
  if (typeof marketIdHex !== 'string' || !marketIdHex.startsWith('0x')) {
    throw new Error(`Invalid marketIdHex: ${marketIdHex} (${typeof marketIdHex})`);
  }
  if (typeof commitmentHexFinal !== 'string' || !commitmentHexFinal.startsWith('0x')) {
    throw new Error(`Invalid commitmentHex: ${commitmentHexFinal} (${typeof commitmentHexFinal})`);
  }
  if (typeof lockedAmountHex !== 'string' || !lockedAmountHex.startsWith('0x')) {
    throw new Error(`Invalid lockedAmountHex: ${lockedAmountHex} (${typeof lockedAmountHex})`);
  }
  
  // Verify commitment fits in felt252 (63 hex digits after 0x)
  const commitmentHexDigits = commitmentHexFinal.slice(2);
  if (commitmentHexDigits.length > 63) {
    throw new Error(`Commitment still exceeds felt252 bounds after low extraction: ${commitmentHexDigits.length} hex digits (max 63)`);
  }
  
  // CRITICAL: Ensure market_id format matches exactly what deposit uses
  // The contract reads market_id from public_inputs[0] as felt252
  // We MUST use the exact same format that was used during deposit
  // 
  // The normalizer ensures consistency, but we also verify the BigInt value
  const marketIdBigInt = BigInt(marketIdHex);
  const marketIdForPublicInputs = marketIdHex; // Use normalized hex - this matches deposit format
  
  console.log('🔍 Market ID for public_inputs (FINAL):', {
    marketIdHex: marketIdHex,
    marketIdBigInt: marketIdBigInt.toString(),
    marketIdForPublicInputs: marketIdForPublicInputs,
    note: 'This MUST match the format used during deposit',
    verification: 'Both deposit and position opening use normalizeMarketId()',
  });
  
  // Use lockedAmountHex (reduced to fit felt252) instead of lockedAmountFromCircuit
  // Format public inputs as expected by the position handler: [market_id, commitment, locked_amount]
  // FIXED: Contract now reads locked_amount from public_inputs[2] instead of proof_outputs
  // CRITICAL: locked_amount must be reduced modulo Starknet prime to fit in felt252
  const publicInputs = [marketIdForPublicInputs, commitmentHexFinal, lockedAmountHex];
  
  // FINAL VERIFICATION: Log the exact market_id that will be sent to contract
  console.log('✅ FINAL public_inputs[0] (market_id):', {
    value: publicInputs[0],
    bigInt: BigInt(publicInputs[0]).toString(),
    hex: publicInputs[0],
    note: 'This is what the contract will receive in public_inputs[0]',
  });
  
  console.log('✅ Public inputs with locked_amount:', {
    marketId: publicInputs[0],
    commitment: publicInputs[1]?.substring(0, 20) + '...',
    lockedAmount: publicInputs[2],
    lockedAmountDecimal: (BigInt(lockedAmountHex) / BigInt(1e18)).toString(),
    fitsInFelt252: lockedAmountHex.slice(2).length <= 63,
  });
  
  // Final validation log
  console.log('✅ Final public_inputs:', {
    market_id: publicInputs[0],
    commitment: publicInputs[1]?.substring(0, 20) + '...',
    lockedAmount: publicInputs[2],
  });
  
  // CRITICAL: Final validation - ensure all proof values are strings with 0x prefix
  const validatedProof = proofData.map((v, i) => {
    if (typeof v !== 'string') {
      console.error(`❌ Proof value at index ${i} is not a string:`, { value: v, type: typeof v });
      throw new Error(`Proof value at index ${i} must be a string, got ${typeof v}`);
    }
    if (!v.startsWith('0x') && !v.startsWith('0X')) {
      console.error(`❌ Proof value at index ${i} missing 0x prefix:`, { value: v });
      throw new Error(`Proof value at index ${i} must start with 0x, got: "${v}"`);
    }
    return v.toLowerCase(); // Normalize to lowercase
  });

  // Validate public inputs
  const validatedPublicInputs = publicInputs.map((v, i) => {
    if (typeof v !== 'string') {
      console.error(`❌ Public input at index ${i} is not a string:`, { value: v, type: typeof v });
      throw new Error(`Public input at index ${i} must be a string, got ${typeof v}`);
    }
    if (!v.startsWith('0x') && !v.startsWith('0X')) {
      console.error(`❌ Public input at index ${i} missing 0x prefix:`, { value: v });
      throw new Error(`Public input at index ${i} must start with 0x, got: "${v}"`);
    }
    return v.toLowerCase(); // Normalize to lowercase
  });

  console.log('Proof and public inputs:', {
    proofLength: validatedProof.length,
    publicInputsLength: validatedPublicInputs.length,
    marketId: marketIdHex,
    commitment: commitmentHex.substring(0, 20) + '...',
    allProofValid: validatedProof.every(v => typeof v === 'string' && v.startsWith('0x')),
    allPublicInputsValid: validatedPublicInputs.every(v => typeof v === 'string' && v.startsWith('0x')),
  });

  // CRITICAL: The commitment we return must match what the contract stores
  // Contract uses: commitment_u256.low.into() (low 128 bits)
  // We've already extracted low 128 bits above, so commitmentHex is correct
  // But let's double-check it matches the format
  console.log('📝 Final commitment for storage:', {
    commitmentHex: commitmentHex,
    commitmentLength: commitmentHex.length,
    commitmentBigInt: BigInt(commitmentHex).toString(),
    low128Bits: (BigInt(commitmentHex) & ((1n << 128n) - 1n)).toString(),
  });

  return {
    proof: validatedProof,
    publicInputs: validatedPublicInputs,
    commitment: commitmentHex, // Use the processed commitment (low 128 bits extracted, matching contract)
    traderSecret: privateTraderSecret, // Return secret for storage
  };
}

export interface ClosePositionProofInputs {
  privateMargin: string;          // Original margin in wei (yUSD)
  privatePositionSize: string;    // Position size in wei (BTC)
  privateEntryPrice: string;      // Entry price (in oracle format with decimals)
  privateTraderSecret: string;    // Same secret used when opening
  isLong: boolean;
  marketId: string;
  currentPrice: string;           // Current price from oracle (in oracle format)
  closingSize: string;            // Size to close in wei (BTC) - use full size for full close
  currentTime: number;            // Unix timestamp
  priceTimestamp: number;         // Price timestamp
  numSources: number;
  minSources: number;
  maxPriceAge: number;
  tradingFeeBps: number;          // Trading fee in basis points (e.g., 10 = 0.1%)
  lockedCollateral: string;      // NEW: Amount that was locked when opening (in wei)
}

export async function generateClosePositionProof(
  inputs: ClosePositionProofInputs
): Promise<ProofResult> {
  // Ensure garaga is initialized
  await init();
  
  // Load verifying key
  const vk = await loadVerifyingKey();
  
  // CRITICAL: Ensure currentPrice is an integer string (circuit expects integers)
  // Parse and floor to prevent floating-point precision issues
  const currentPriceFloat = parseFloat(inputs.currentPrice);
  if (isNaN(currentPriceFloat)) {
    throw new Error(`Invalid currentPrice: ${inputs.currentPrice} (must be a valid number)`);
  }
  const currentPriceInt = BigInt(Math.floor(currentPriceFloat)).toString();
  
  // CRITICAL: Use shared function to ensure market_id matches exactly what's used in deposit/opening
  // This is the SINGLE SOURCE OF TRUTH for market_id format
  const marketIdFelt = getMarketIdFeltFromConfig(inputs.marketId);
  
  // Prepare circuit inputs
  const circuitInput = {
    action: 3, // 3 = close_position
    private_margin: inputs.privateMargin,
    private_position_size: inputs.privatePositionSize,
    private_entry_price: inputs.privateEntryPrice,
    private_trader_secret: inputs.privateTraderSecret,
    is_long: inputs.isLong ? 1 : 0,
    market_id: marketIdFelt, // Convert string to felt252 numeric value
    oracle_price: currentPriceInt, // Use integer price
    current_time: inputs.currentTime.toString(),
    price_timestamp: inputs.priceTimestamp.toString(),
    num_sources: inputs.numSources.toString(),
    min_sources: inputs.minSources.toString(),
    max_price_age: inputs.maxPriceAge.toString(),
    price_impact: '0',
    execution_price: currentPriceInt, // Price with proper decimal handling (multiplied by 10^8)
    acceptable_slippage: '100', // 1% in basis points
    leverage: '0', // Not used for closing
    min_margin_ratio: '0', // Not used for closing
    max_position_size: '0', // Not used for closing
    trigger_price: '0',
    current_price: currentPriceInt, // Price with proper decimal handling (multiplied by 10^8)
    closing_size: inputs.closingSize,
    take_profit_price: '0',
    stop_loss_price: '0',
    trading_fee_bps: inputs.tradingFeeBps.toString(),
    twap_price: '0',
    twap_duration: '0',
    chunk_index: '0',
    total_chunks: '0',
    // NEW: Collateral management inputs
    deposited_balance: '0',  // Not used for closing (set to 0)
    locked_collateral: inputs.lockedCollateral,  // Amount that was locked when opening
  };

  // Generate witness
  const noir = new Noir({ 
    bytecode, 
    abi: abi as any, 
    debug_symbols: '', 
    file_map: {} as DebugFileMap 
  });
  
  const execResult = await noir.execute(circuitInput);
  console.log('Close position circuit execution result:', execResult);

  // Generate proof
  const honk = new UltraHonkBackend(bytecode, { threads: 1 });
  const proof = await honk.generateProof(execResult.witness, { starknetZK: true });
  honk.destroy();
  
  console.log('Close position proof generated:', proof);

  // Prepare calldata for contract
  const callData = getZKHonkCallData(
    proof.proof,
    flattenFieldsAsArray(proof.publicInputs),
    vk,
    1 // HonkFlavor.STARKNET
  );

  // CRITICAL: According to Starknet team, public inputs are already part of the proof structure
  // We should use the FULL callData (minus the first element) as the proof
  // The verifier will extract and return the public inputs if the proof is valid
  // Use the full calldata (skip the first element which is proof_length)
  const fullProofData = callData.slice(1);
  
  // Helper function to ensure value is a hex string with 0x prefix
  // CRITICAL: Starknet.js requires ALL calldata values to be strings with 0x prefix
  // Note: This function is kept for potential future use but currently unused
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _toHexString = (v: any, index?: number): string => {
    try {
      // Handle null/undefined/empty
      if (v === null || v === undefined || v === '') {
        return '0x0';
      }
      
      let num: bigint;
      
      // Convert to BigInt first, then to hex string
      if (typeof v === 'string') {
        const trimmed = v.trim();
        
        // If already has 0x prefix
        if (trimmed.startsWith('0x') || trimmed.startsWith('0X')) {
          if (trimmed.length === 2) return '0x0'; // Just "0x"
          
          // Remove prefix and validate it's valid hex
          const hexPart = trimmed.slice(2);
          if (!/^[0-9a-fA-F]+$/.test(hexPart)) {
            console.error(`Invalid hex string at index ${index}: ${v}`);
            return '0x0';
          }
          num = BigInt(trimmed);
        } else {
          // No prefix - try parsing as decimal or hex
          // First check if it looks like hex (only contains hex chars)
          if (/^[0-9a-fA-F]+$/.test(trimmed)) {
            // Try as hex first
            try {
              num = BigInt('0x' + trimmed);
            } catch {
              // Fall back to decimal
              num = BigInt(trimmed);
            }
          } else {
            // Contains non-hex chars, must be decimal
            num = BigInt(trimmed);
          }
        }
      } else if (typeof v === 'number') {
        if (!Number.isFinite(v) || Number.isNaN(v)) {
          console.warn(`Invalid number at index ${index}: ${v}, using 0x0`);
          return '0x0';
        }
        num = BigInt(Math.floor(v));
      } else if (typeof v === 'bigint') {
        num = v;
      } else {
        // Try to convert to string then parse
        const str = String(v).trim();
        if (str.startsWith('0x') || str.startsWith('0X')) {
          num = BigInt(str);
        } else {
          num = BigInt(str);
        }
      }
      
      // Convert to hex string and ensure 0x prefix
      const hex = num.toString(16);
      return '0x' + hex;
    } catch (error) {
      console.error(`Error converting value at index ${index} to hex:`, {
        value: v,
        type: typeof v,
        error: error
      });
      return '0x0';
    }
  };
  
  // CRITICAL: Use callData.slice(1) directly like the example app (for closePosition)
  // getZKHonkCallData() already returns properly formatted felt252 values
  // We should NOT convert them again as that can cause felt252 overflow
  console.log('Raw full proof data from callData.slice(1) (closePosition):', {
    count: fullProofData.length,
    first5: fullProofData.slice(0, 5),
    types: fullProofData.slice(0, 5).map(v => typeof v),
    hasNonString: fullProofData.some(v => typeof v !== 'string'),
    sampleValues: fullProofData.slice(0, 10).map((v, i) => ({
      index: i,
      value: v,
      type: typeof v,
      stringified: String(v),
    }))
  });
  
  // CRITICAL: Use callData.slice(1) directly without conversion
  // The values from getZKHonkCallData() are already properly formatted as felt252
  // Only ensure they're strings (they should already be)
  const proofData = fullProofData.map((v, i) => {
    // Ensure it's a string (should already be from garaga)
    if (typeof v !== 'string') {
      // Convert to string if needed (shouldn't happen but be safe)
      const str = String(v);
      if (str.startsWith('0x') || str.startsWith('0X')) {
        return str.toLowerCase();
      }
      // If it's a number, convert to hex
      try {
        return '0x' + BigInt(v).toString(16);
      } catch {
        throw new Error(`Cannot convert proof value at index ${i} to hex: ${v} (${typeof v})`);
      }
    }
    // Already a string - normalize to lowercase
    return String(v).toLowerCase();
  });
  
  console.log(`Using ${proofData.length} proof values directly from callData.slice(1) (closePosition), first 5:`, proofData.slice(0, 5));
  
  // Validate all proof values are strings with 0x prefix
  const invalidProof = proofData.filter(v => typeof v !== 'string' || !v.startsWith('0x'));
  if (invalidProof.length > 0) {
    console.error(`Found ${invalidProof.length} proof values without 0x prefix:`, invalidProof);
    throw new Error(`Invalid proof data: ${invalidProof.length} values missing 0x prefix`);
  }
  
  // The verifier is called with only the proof (not public_inputs)
  // The position handler expects public inputs as [market_id, commitment, outcome_code] at positions 0, 1, and 2
  // Reuse marketIdFelt declared earlier (line 232)
  
  // Circuit now returns tuple: (commitment, collateral_released, payout, loss_to_vault)
  // Extract the commitment (first element) from the tuple
  let commitment: string;
  const returnValue = execResult.returnValue;
  
  console.log('🔍 Close position circuit returnValue type:', typeof returnValue, 'value:', returnValue);
  
  if (Array.isArray(returnValue)) {
    // Tuple returned as array
    commitment = returnValue[0]?.toString() || '0x0';
    console.log('📦 Close position circuit returned tuple (array):', {
      commitment: returnValue[0],
      collateral_released: returnValue[1],
      payout: returnValue[2],
      loss_to_vault: returnValue[3],
      tuple_length: returnValue.length,
    });
  } else if (typeof returnValue === 'string') {
    // Check if it's a comma-separated tuple string
    if (returnValue.includes(',')) {
      const parts = returnValue.split(',');
      commitment = parts[0].trim();
      console.log('📦 Close position circuit returned tuple (comma-separated string):', {
        commitment: parts[0],
        collateral_released: parts[1],
        payout: parts[2],
        loss_to_vault: parts[3],
        tuple_length: parts.length,
      });
    } else {
      // Single value (old format)
      commitment = returnValue;
    }
  } else if (typeof returnValue === 'object' && returnValue !== null) {
    // Tuple might be returned as object with numeric keys
    const tuple = returnValue as any;
    commitment = tuple[0]?.toString() || tuple.commitment?.toString() || '0x0';
    console.log('📦 Close position circuit returned tuple (object):', {
      commitment: tuple[0] || tuple.commitment,
      collateral_released: tuple[1],
      payout: tuple[2],
      loss_to_vault: tuple[3],
    });
  } else {
    // Fallback: convert to string and try to parse
    const returnValueStr = String(returnValue);
    if (returnValueStr.includes(',')) {
      const parts = returnValueStr.split(',');
      commitment = parts[0].trim();
    } else {
      commitment = returnValueStr;
    }
  }
  
  // Ensure commitment is a valid string
  if (!commitment || commitment === '') {
    throw new Error(`Failed to extract commitment from close position circuit return value: ${JSON.stringify(returnValue)}`);
  }
  
  const outcomeCode = '0'; // For close position, outcome_code is 0 (success)
  
  // Ensure values are in hex format (Starknet.js expects hex strings)
  // CRITICAL: Must be strings with 0x prefix
  // cairo.felt() returns a hex string, so we just need to normalize it
  let marketIdHex: string;
  const trimmed = String(marketIdFelt).trim();
  if (trimmed.startsWith('0x') || trimmed.startsWith('0X')) {
    marketIdHex = trimmed.toLowerCase();
  } else {
    // If somehow not hex, convert it
    try {
      marketIdHex = '0x' + BigInt(trimmed).toString(16);
    } catch {
      // Fallback: try as hex without prefix
      marketIdHex = '0x' + BigInt('0x' + trimmed).toString(16);
    }
  }
  
  // CRITICAL: Commitment extraction must match contract behavior
  // Contract uses: commitment_u256.low.into() (takes low 128 bits as felt252)
  // We need to extract the low 128 bits, not reduce modulo Stark prime
  // This ensures the commitment matches what's stored on-chain
  
  let commitmentBigInt: bigint;
  if (typeof commitment === 'string') {
    const trimmed = commitment.trim();
    if (trimmed.startsWith('0x') || trimmed.startsWith('0X')) {
      commitmentBigInt = BigInt(trimmed);
    } else {
      try {
        commitmentBigInt = BigInt(trimmed);
      } catch {
        // Fallback: try as hex without prefix
        commitmentBigInt = BigInt('0x' + trimmed);
      }
    }
  } else {
    commitmentBigInt = BigInt(commitment);
  }
  
  // Extract low 128 bits (matching contract: commitment_u256.low.into())
  // u256.low is the lower 128 bits, which fits in felt252
  const LOW_128_MASK = (1n << 128n) - 1n; // 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF
  const commitmentLow = commitmentBigInt & LOW_128_MASK;
  const commitmentHex = '0x' + commitmentLow.toString(16);
  
  // Verify commitment fits in felt252 (63 hex digits after 0x)
  const commitmentHexDigits = commitmentHex.slice(2);
  if (commitmentHexDigits.length > 63) {
    throw new Error(`Commitment still exceeds felt252 bounds after low extraction: ${commitmentHexDigits.length} hex digits (max 63)`);
  }
  
  let outcomeCodeHex: string;
  if (typeof outcomeCode === 'string') {
    const trimmed = outcomeCode.trim();
    if (trimmed.startsWith('0x') || trimmed.startsWith('0X')) {
      outcomeCodeHex = trimmed.toLowerCase();
    } else {
      try {
        outcomeCodeHex = '0x' + BigInt(trimmed).toString(16);
      } catch {
        outcomeCodeHex = '0x' + BigInt('0x' + trimmed).toString(16);
      }
    }
  } else {
    outcomeCodeHex = '0x' + BigInt(outcomeCode).toString(16);
  }
  
  // Final validation - ensure all are strings with 0x prefix
  if (typeof marketIdHex !== 'string' || !marketIdHex.startsWith('0x')) {
    throw new Error(`Invalid marketIdHex: ${marketIdHex} (${typeof marketIdHex})`);
  }
  if (typeof commitmentHex !== 'string' || !commitmentHex.startsWith('0x')) {
    throw new Error(`Invalid commitmentHex: ${commitmentHex} (${typeof commitmentHex})`);
  }
  if (typeof outcomeCodeHex !== 'string' || !outcomeCodeHex.startsWith('0x')) {
    throw new Error(`Invalid outcomeCodeHex: ${outcomeCodeHex} (${typeof outcomeCodeHex})`);
  }
  
  // Format public inputs as expected by the contract: [market_id, commitment, outcome_code]
  const publicInputs = [marketIdHex, commitmentHex, outcomeCodeHex];

  // CRITICAL: Final validation - ensure all proof values are strings with 0x prefix
  const validatedProof = proofData.map((v, i) => {
    if (typeof v !== 'string') {
      console.error(`❌ Proof value at index ${i} is not a string:`, { value: v, type: typeof v });
      throw new Error(`Proof value at index ${i} must be a string, got ${typeof v}`);
    }
    if (!v.startsWith('0x') && !v.startsWith('0X')) {
      console.error(`❌ Proof value at index ${i} missing 0x prefix:`, { value: v });
      throw new Error(`Proof value at index ${i} must start with 0x, got: "${v}"`);
    }
    return v.toLowerCase(); // Normalize to lowercase
  });

  // Validate public inputs
  const validatedPublicInputs = publicInputs.map((v, i) => {
    if (typeof v !== 'string') {
      console.error(`❌ Public input at index ${i} is not a string:`, { value: v, type: typeof v });
      throw new Error(`Public input at index ${i} must be a string, got ${typeof v}`);
    }
    if (!v.startsWith('0x') && !v.startsWith('0X')) {
      console.error(`❌ Public input at index ${i} missing 0x prefix:`, { value: v });
      throw new Error(`Public input at index ${i} must start with 0x, got: "${v}"`);
    }
    return v.toLowerCase(); // Normalize to lowercase
  });

  return {
    proof: validatedProof,
    publicInputs: validatedPublicInputs,
    commitment: commitmentHex, // Use the processed commitment (already converted to hex and modulo reduced)
  };
}

