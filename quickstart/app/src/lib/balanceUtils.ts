import { Contract, RpcProvider, Account } from 'starknet';
import { CONTRACTS, NETWORK, getMarketIdFelt } from '../config/contracts';

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
 * Fetches user's deposited balance in CollateralVault for a specific market
 */
export async function fetchVaultBalance(
  userAddress: string,
  marketId: string
): Promise<string> {
  try {
    const provider = new RpcProvider({ nodeUrl: NETWORK.RPC_URL });
    
    // CollateralVault ABI for get_user_balance
    const VAULT_ABI = [
      {
        type: 'function',
        name: 'get_user_balance',
        inputs: [
          { name: 'user', type: 'core::starknet::contract_address::ContractAddress' },
          { name: 'market_id', type: 'core::felt252' }
        ],
        outputs: [
          { type: 'core::integer::u256' }
        ],
        state_mutability: 'view'
      }
    ];
    
    const contract = new Contract({
      abi: VAULT_ABI,
      address: CONTRACTS.COLLATERAL_VAULT,
      providerOrAccount: provider,
    });
    
    // Convert marketId string to felt252 (use Pragma asset ID format)
    const PRAGMA_ASSET_IDS: Record<string, string> = {
      'BTC/USD': '0x4254432f555344',
      'ETH/USD': '0x4554482f555344',
      'STRK/USD': '0x5354524b2f555344',
      'SOL/USD': '0x534f4c2f555344',
      'BNB/USD': '0x424e422f555344',
    };
    
    const marketIdFelt = PRAGMA_ASSET_IDS[marketId] || marketId;
    
    const res = await contract.get_user_balance(userAddress, marketIdFelt);
    
    // Handle u256 response
    let balanceRawString = "0";
    try {
      if (res !== undefined && res !== null) {
        balanceRawString = BigInt(res).toString();
      }
    } catch (e) {
      console.error('Error parsing vault balance response:', e, 'Response:', res);
      return '0';
    }
    
    return balanceRawString;
  } catch (error) {
    console.error('Error fetching vault balance:', error);
    return '0';
  }
}

/**
 * Fetches locked collateral amount for a user/market from CollateralVault
 */
export async function fetchLockedCollateral(
  userAddress: string,
  marketId: string
): Promise<string> {
  try {
    const provider = new RpcProvider({ nodeUrl: NETWORK.RPC_URL });
    
    // CollateralVault ABI for get_locked_collateral
    const VAULT_ABI = [
      {
        type: 'function',
        name: 'get_locked_collateral',
        inputs: [
          { name: 'user', type: 'core::starknet::contract_address::ContractAddress' },
          { name: 'market_id', type: 'core::felt252' }
        ],
        outputs: [
          { type: 'core::integer::u256' }
        ],
        state_mutability: 'view'
      }
    ];
    
    const contract = new Contract({
      abi: VAULT_ABI,
      address: CONTRACTS.COLLATERAL_VAULT,
      providerOrAccount: provider,
    });
    
    // CRITICAL: Use hex format directly - same as deposit
    const marketIdFelt = getMarketIdFelt(marketId);
    
    const res = await contract.get_locked_collateral(userAddress, marketIdFelt);
    
    // Handle u256 response
    let lockedAmountString = "0";
    try {
      if (res !== undefined && res !== null) {
        lockedAmountString = BigInt(res).toString();
      }
    } catch (e) {
      console.error('Error parsing locked collateral response:', e, 'Response:', res);
      return '0';
    }
    
    return lockedAmountString;
  } catch (error) {
    console.error('Error fetching locked collateral:', error);
    return '0';
  }
}

/**
 * Fetches user's available balance (user_balance - locked_collateral) in CollateralVault
 * This is the actual amount available for trading
 */
export async function fetchAvailableBalance(
  userAddress: string,
  marketId: string
): Promise<string> {
  try {
    const [userBalance, lockedCollateral] = await Promise.all([
      fetchVaultBalance(userAddress, marketId),
      fetchLockedCollateral(userAddress, marketId)
    ]);
    
    const userBalanceBigInt = BigInt(userBalance || '0');
    const lockedBigInt = BigInt(lockedCollateral || '0');
    
    // Available = user_balance - locked_collateral
    const available = userBalanceBigInt >= lockedBigInt 
      ? userBalanceBigInt - lockedBigInt 
      : 0n;
    
    console.log('💰 Available balance calculation:', {
      userBalance: userBalanceBigInt.toString(),
      lockedCollateral: lockedBigInt.toString(),
      available: available.toString()
    });
    
    return available.toString();
  } catch (error) {
    console.error('Error fetching available balance:', error);
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

