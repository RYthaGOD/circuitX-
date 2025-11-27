import { useCallback, useEffect, useState } from 'react';
import { RpcProvider } from 'starknet';
import { CONTRACTS, NETWORK } from '../config/contracts';
import { useTradingStore } from '../stores/tradingStore';

export function useOracle() {
  const [loading, setLoading] = useState(false);
  const updateMarketPrice = useTradingStore((state) => state.updateMarketPrice);

  const getPrice = useCallback(
    async (marketId: string): Promise<{ value: string; decimals: number }> => {
      setLoading(true);
      try {
        const provider = new RpcProvider({ nodeUrl: NETWORK.RPC_URL });
        
        // Use provider's callContract for view functions
        const result = await provider.callContract({
          contractAddress: CONTRACTS.ORACLE,
          entrypoint: 'get_price',
          calldata: [marketId],
        });
        
        // Extract price and decimals from result (result is string[])
        const priceValue = result[0] || '0';
        const decimals = result[1] ? Number(result[1]) : 8;

        // Update store
        updateMarketPrice(marketId, priceValue);

        return { value: priceValue, decimals };
      } catch (error) {
        console.error('Error fetching price:', error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [updateMarketPrice]
  );

  // Poll price updates (every 5 seconds)
  useEffect(() => {
    const selectedMarket = useTradingStore.getState().selectedMarket;
    if (!selectedMarket) return;

    const interval = setInterval(() => {
      getPrice(selectedMarket).catch(console.error);
    }, 5000);

    return () => clearInterval(interval);
  }, [getPrice]);

  return {
    getPrice,
    loading,
  };
}

