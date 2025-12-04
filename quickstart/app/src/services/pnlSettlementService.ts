import { fetchAvailableBalance, fetchVaultBalance, fetchLockedCollateral } from '../lib/balanceUtils';

/**
 * Refreshes all relevant balances after closing a position.
 * Works regardless of profit or loss (contracts already handle PnL).
 */
export async function refreshPnLBalances(
  userAddress: string,
  marketId: string
): Promise<{
  availableBalance: string;
  vaultBalance: string;
  lockedCollateral: string;
}> {
  const [availableBalance, vaultBalance, lockedCollateral] = await Promise.all([
    fetchAvailableBalance(userAddress, marketId),
    fetchVaultBalance(userAddress, marketId),
    fetchLockedCollateral(userAddress, marketId),
  ]);

  return { availableBalance, vaultBalance, lockedCollateral };
}







