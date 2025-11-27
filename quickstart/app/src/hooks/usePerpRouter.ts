import { useCallback } from 'react';
import { Contract, Account, CallData } from 'starknet';
import { useTradingStore } from '../stores/tradingStore';
import { CONTRACTS, NETWORK } from '../config/contracts';
import { RpcProvider } from 'starknet';

// Minimal PerpRouter ABI (expand as needed)
const PERP_ROUTER_ABI = [
  {
    type: 'function',
    name: 'open_position',
    inputs: [
      { name: 'market_id', type: 'felt252' },
      { name: 'is_long', type: 'bool' },
      { name: 'collateral_amount', type: 'u256' },
      { name: 'proof_data', type: 'Span<felt252>' },
    ],
    outputs: [],
    state_mutability: 'external',
  },
  {
    type: 'function',
    name: 'close_position',
    inputs: [
      { name: 'market_id', type: 'felt252' },
      { name: 'commitment', type: 'felt252' },
      { name: 'proof_data', type: 'Span<felt252>' },
    ],
    outputs: [],
    state_mutability: 'external',
  },
] as const;

export function usePerpRouter() {
  const ztarknetAccount = useTradingStore((state) => state.ztarknetAccount);
  const addPosition = useTradingStore((state) => state.addPosition);

  const openPosition = useCallback(
    async (
      marketId: string,
      isLong: boolean,
      collateralAmount: string,
      proofData: string[]
    ) => {
      if (!ztarknetAccount) {
        throw new Error('Ztarknet trading wallet not ready. Please set up your trading wallet first.');
      }

      const provider = new RpcProvider({ nodeUrl: NETWORK.RPC_URL });
      const router = new Contract(
        PERP_ROUTER_ABI,
        CONTRACTS.PERP_ROUTER,
        provider
      );
      router.connect(account);

      // Convert collateral amount to u256
      const collateralU256 = CallData.compile({
        low: collateralAmount,
        high: '0',
      });

      const call = router.populate('open_position', [
        marketId,
        isLong,
        collateralU256,
        proofData,
      ]);

      const result = await ztarknetAccount.execute(call);
      return result;
    },
    [ztarknetAccount, addPosition]
  );

  const closePosition = useCallback(
    async (marketId: string, commitment: string, proofData: string[]) => {
      if (!ztarknetAccount) {
        throw new Error('Ztarknet trading wallet not ready. Please set up your trading wallet first.');
      }

      const provider = new RpcProvider({ nodeUrl: NETWORK.RPC_URL });
      const router = new Contract(
        PERP_ROUTER_ABI,
        CONTRACTS.PERP_ROUTER,
        provider
      );
      router.connect(ztarknetAccount);

      const call = router.populate('close_position', [
        marketId,
        commitment,
        proofData,
      ]);

      const result = await ztarknetAccount.execute(call);
      return result;
    },
    [ztarknetAccount]
  );

  return {
    openPosition,
    closePosition,
  };
}

