import { Contract, RpcProvider, Account } from 'starknet';
import { CONTRACTS, NETWORK } from '../config/contracts';

const YUSD_ABI = [
  {
    type: 'function',
    name: 'balance_of',
    inputs: [
      { name: 'account', type: 'core::starknet::contract_address::ContractAddress' }
    ],
    outputs: [
      { type: 'core::integer::u256' }
    ],
    state_mutability: 'view'
  }
];

/**
 * Fetches yUSD balance for an account
 * Uses the same pattern as testnet folder - handles u256 properly
 */
export async function fetchYusdBalance(account: Account | string): Promise<string> {
  try {
    // Use RpcProvider for read-only operations (same as testnet pattern)
    const provider = new RpcProvider({ nodeUrl: NETWORK.RPC_URL });
    
    // Get address - handle both Account and string
    const address = typeof account === 'string' ? account : account.address;
    
    // Create contract with provider (read-only)
    const contract = new Contract({
      abi: YUSD_ABI,
      address: CONTRACTS.YUSD_TOKEN,
      providerOrAccount: provider, // Use provider, not account
    });
    
    // Call balance_of
    const res = await contract.balance_of(address);
    
    // Handle u256 response - response is directly a bigint for Cairo 1
    let balanceRawString = "0";
    
    try {
      if (res !== undefined && res !== null) {
        // Response is directly a bigint (Cairo 1 pattern)
        balanceRawString = BigInt(res).toString();
      }
    } catch (e) {
      console.error('Error parsing balance response:', e, 'Response:', res);
      return '0';
    }
    
    return balanceRawString;
  } catch (error) {
    console.error('Error fetching yUSD balance:', error);
    return '0';
  }
}

/**
 * Formats balance string to human-readable format
 */
export function formatYusdBalance(balanceRaw: string, decimals: number = 18): string {
  if (!balanceRaw || balanceRaw === '0') return '0.00';
  const balance = BigInt(balanceRaw);
  const formatted = (Number(balance) / 10 ** decimals).toFixed(2);
  return formatted.replace(/\.?0+$/, ''); // Remove trailing zeros
}

