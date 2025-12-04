import { useState, useEffect, useMemo } from 'react';
import { useTradingStore, Position } from '../../stores/tradingStore';
import { ExternalLink, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { closePositionClient } from '../../services/positionCloseService';
import { calculatePnL, calculateLiquidationPrice } from '../../services/pnlService';
import { fetchPythPrice } from '../../services/pythService';
import { NETWORK, MARKET_INFO } from '../../config/contracts';
import { refreshPnLBalances } from '../../services/pnlSettlementService';

interface PositionCardProps {
  position: Position;
}

export function PositionCard({ position }: PositionCardProps) {
  const removePosition = useTradingStore((state) => state.removePosition);
  const setAvailableBalance = useTradingStore((state) => state.setAvailableBalance);
  const ztarknetAccount = useTradingStore((state) => state.ztarknetAccount);
  const isZtarknetReady = useTradingStore((state) => state.isZtarknetReady);
  
  const [isClosing, setIsClosing] = useState(false);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [pnlData, setPnlData] = useState<{ pnl: number; pnlPercent: number; roe: number } | null>(null);
  const [liquidationPrice, setLiquidationPrice] = useState<number | null>(null);

  // Calculate position size dynamically from margin, leverage, and entry price
  const calculatedSize = useMemo(() => {
    if (!position.margin || !position.entryPrice || !position.leverage) return null;
    
    try {
      // Margin is stored as yUSD string (could be in wei format or regular format)
      // Check if it's in wei format (very large number) or regular format
      const marginValue = parseFloat(position.margin);
      const marginInYUSD = marginValue > 1e10 ? marginValue / 1e18 : marginValue; // Convert from wei if needed
      
      const entryPriceValue = parseFloat(position.entryPrice);
      const leverage = position.leverage || 20;
      
      // Position size = (margin * leverage) / entry_price
      const size = (marginInYUSD * leverage) / entryPriceValue;
      return size;
    } catch (error) {
      console.error('Error calculating position size:', error);
      return null;
    }
  }, [position.margin, position.entryPrice, position.leverage]);

  // Fetch current price from Pyth Network and calculate PnL in real-time
  useEffect(() => {
    if (!position.entryPrice || !position.margin) return;

    const fetchPriceAndCalculatePnL = async () => {
      try {
        // Fetch from Pyth Network for the specific market
        const priceData = await fetchPythPrice(position.marketId);
        const price = priceData.price; // Price in USD (already formatted)
        setCurrentPrice(price);

        // Calculate PnL
        const pnl = calculatePnL(position, price, position.leverage || 20);
        setPnlData(pnl);

        // Calculate liquidation price
        const liqPrice = calculateLiquidationPrice(position, position.leverage || 20);
        setLiquidationPrice(liqPrice);
      } catch (error) {
        console.error('Error fetching price from Pyth for PnL calculation:', error);
        // Don't set price to 0 on error, keep last known price
      }
    };

    fetchPriceAndCalculatePnL();
    
    // Update every 5 seconds
    const interval = setInterval(fetchPriceAndCalculatePnL, 5000);
    return () => clearInterval(interval);
  }, [position]);

  const handleClose = async () => {
    if (!isZtarknetReady || !ztarknetAccount) {
      toast.error('Please set up your Ztarknet trading wallet first');
      return;
    }

    if (!position.traderSecret) {
      toast.error('Position data incomplete. Cannot close position.');
      return;
    }

    setIsClosing(true);
    const progressToast = toast.loading('Closing position...', {
      description: 'Calling contract to close position',
    });

    try {
      // Call the client-side service that directly interacts with the contract
      const result = await closePositionClient(
        ztarknetAccount,
        position,
        currentPrice || undefined
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to close position');
      }

      toast.dismiss(progressToast);

      // Show success
      toast.success('Position closed successfully!', {
        action: result.txHash ? {
          label: 'View Transaction',
          onClick: () => window.open(`${NETWORK.EXPLORER_URL}/tx/${result.txHash}`, '_blank'),
        } : undefined,
        duration: 10000,
      });

      // Remove position from store
      removePosition(position.commitment);
      
      // Clean up localStorage (primary storage)
      try {
        const commitments = JSON.parse(localStorage.getItem('position-commitments') || '[]');
        const updatedCommitments = commitments.filter((c: string) => c !== position.commitment);
        localStorage.setItem('position-commitments', JSON.stringify(updatedCommitments));
        localStorage.removeItem(`position-${position.commitment}`);
        console.log('🗑️ Removed position from localStorage:', position.commitment.slice(0, 16) + '...');
      } catch (error) {
        console.warn('Failed to clean up position from localStorage:', error);
      }
      
      // Also clean up sessionStorage for consistency
      try {
        const sessionCommitments = JSON.parse(sessionStorage.getItem('position-commitments') || '[]');
        const updatedSessionCommitments = sessionCommitments.filter((c: string) => c !== position.commitment);
        sessionStorage.setItem('position-commitments', JSON.stringify(updatedSessionCommitments));
        sessionStorage.removeItem(`position-${position.commitment}`);
      } catch (error) {
        console.warn('Failed to clean up position from sessionStorage:', error);
      }
      
      // Refresh balances after closing (no artificial delay)
      try {
        const { availableBalance, vaultBalance, lockedCollateral } =
          await refreshPnLBalances(ztarknetAccount.address, position.marketId);

        setAvailableBalance(availableBalance);
        console.log('💰 Balances refreshed after position close:', {
          availableBalance,
          vaultBalance,
          lockedCollateral,
        });
      } catch (error) {
        console.error('Error refreshing balances after close:', error);
      }
    } catch (error: any) {
      console.error('Close position error (will force-remove locally):', error);

      // Always clear the position locally so the user is not stuck with
      // an uncloseable UI position, even if the on-chain tx/proof fails.
      try {
        // 1) Remove from in-memory store (Zustand) – this will also
        //    trigger the persist middleware to update localStorage.
        removePosition(position.commitment);

        // Clean up localStorage (primary storage)
        try {
          const commitments = JSON.parse(localStorage.getItem('position-commitments') || '[]');
          const updatedCommitments = commitments.filter((c: string) => c !== position.commitment);
          localStorage.setItem('position-commitments', JSON.stringify(updatedCommitments));
          localStorage.removeItem(`position-${position.commitment}`);
          console.log('🗑️ Force-removed position from localStorage:', position.commitment.slice(0, 16) + '...');
        } catch (error) {
          console.warn('Failed to clean up position from localStorage:', error);
        }
        
        // Also clean up sessionStorage for consistency
        try {
          const sessionCommitments = JSON.parse(sessionStorage.getItem('position-commitments') || '[]');
          const updatedSessionCommitments = sessionCommitments.filter((c: string) => c !== position.commitment);
          sessionStorage.setItem('position-commitments', JSON.stringify(updatedSessionCommitments));
          sessionStorage.removeItem(`position-${position.commitment}`);
        } catch (error) {
          console.warn('Failed to clean up position from sessionStorage:', error);
        }

        // 2) Extra safety: directly clean the persisted store entry
        //    from localStorage in case persist didn't run for any reason.
        // NOTE: Positions are no longer stored in localStorage, but keeping this for orders
        const STORAGE_KEY = 'ztarknet-trading-store';
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed.positions)) {
              parsed.positions = parsed.positions.filter(
                (p: any) => p.commitment !== position.commitment
              );
              localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
              console.log(
                '🧹 Force-removed position from localStorage after close error:',
                position.commitment.slice(0, 16) + '...'
              );
            }
          } catch (parseError) {
            console.error('Error cleaning ztarknet-trading-store after close error:', parseError);
          }
        }
      } catch (cleanupError) {
        console.error('Error during local cleanup after close failure:', cleanupError);
      }

      toast.dismiss(progressToast);

      // Report a "soft success": inform the user the on-chain close may
      // have failed, but the position has been cleared from this device.
      toast.success(
        'Position removed from this device. On-chain close may have failed – check the explorer if needed.'
      );
    } finally {
      setIsClosing(false);
    }
  };

  // Format PnL display
  const displayPnL = pnlData ? pnlData.pnl : (position.pnl ? parseFloat(position.pnl) : 0);
  const displayROE = pnlData ? pnlData.roe : 0;

  // Calculate position value (notional value) - Frontend only calculation
  // Position Value = Size × Current Market Price
  // This represents the total dollar value of the position at current market price
  const positionValue = useMemo(() => {
    if (calculatedSize === null || currentPrice === null) {
      return null;
    }
    
    try {
      // Position Value = Size (BTC) × Current Price (USD)
      const value = calculatedSize * currentPrice;
      return value;
    } catch (error) {
      console.error('Error calculating position value:', error);
      return null;
    }
  }, [calculatedSize, currentPrice]);

  // Get market info for display
  const marketInfo = MARKET_INFO[position.marketId as keyof typeof MARKET_INFO];
  const marketSymbol = marketInfo?.symbol.replace('/USD', '') || position.marketId.replace('/USD', '');
  const leverage = position.leverage || 20;

  // Format numbers for display
  const formatPrice = (price: number | null): string => {
    if (price === null) return '--';
    if (price >= 1000) {
      return price.toLocaleString('en-US', { maximumFractionDigits: 0 });
    } else if (price >= 100) {
      return price.toFixed(2);
    } else if (price >= 1) {
      return price.toFixed(3);
    } else {
      return price.toFixed(5);
    }
  };

  const formatSize = (size: number | null): string => {
    if (size === null) return '--';
    if (size >= 1) {
      return size.toFixed(2);
    } else {
      return size.toFixed(5);
    }
  };

  const formatCurrency = (value: number | null): string => {
    if (value === null) return '$0.00';
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Calculate margin display (convert from wei if needed)
  const marginDisplay = useMemo(() => {
    if (!position.margin) return '0.00';
    const marginValue = parseFloat(position.margin);
    const marginInYUSD = marginValue > 1e10 ? marginValue / 1e18 : marginValue;
    return marginInYUSD.toFixed(2);
  }, [position.margin]);

  return (
    <div
      className="flex items-center gap-4 px-4 py-3 border-b text-xs"
      style={{
        backgroundColor: 'transparent',
        borderColor: 'rgba(255, 255, 255, 0.1)',
      }}
    >
      {/* Close Position Button - At the beginning */}
      <div className="min-w-[80px] flex-shrink-0">
        <button
          onClick={handleClose}
          disabled={isClosing || !isZtarknetReady}
          className="px-2 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            color: '#ef4444',
            backgroundColor: 'transparent',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            fontSize: '11px',
            padding: '4px 8px',
          }}
          onMouseEnter={(e) => {
            if (!isClosing && isZtarknetReady) {
              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
          }}
        >
          {isClosing ? 'Closing...' : 'Close'}
        </button>
      </div>

      {/* Coin */}
      <div className="flex items-center gap-2 min-w-[100px]">
        <span style={{ color: '#50d2c1', fontWeight: 500 }}>
          {marketSymbol} {leverage}x
        </span>
      </div>

      {/* Size */}
      <div className="min-w-[100px]">
        <span style={{ color: '#50d2c1', fontWeight: 500 }}>
          {calculatedSize !== null ? `${formatSize(calculatedSize)} ${marketSymbol}` : '--'}
        </span>
      </div>

      {/* Position Value */}
      <div className="min-w-[100px]">
        <span style={{ color: '#d1d4dc' }}>
          {positionValue !== null ? formatCurrency(positionValue) : '--'}
        </span>
      </div>

      {/* Entry Price */}
      <div className="min-w-[90px]">
        <span style={{ color: '#d1d4dc' }}>
          {position.entryPrice ? formatPrice(parseFloat(position.entryPrice)) : '--'}
        </span>
      </div>

      {/* Mark Price */}
      <div className="min-w-[90px]">
        <span style={{ color: '#d1d4dc' }}>
          {currentPrice !== null ? formatPrice(currentPrice) : '--'}
        </span>
      </div>

      {/* PNL (ROE %) */}
      <div className="flex items-center gap-1 min-w-[120px]">
        <span
          style={{
            color: displayPnL >= 0 ? '#50d2c1' : '#ef4444',
            fontWeight: 500,
          }}
        >
          {displayPnL >= 0 ? '+' : ''}{formatCurrency(displayPnL)}
          {displayROE !== 0 && (
            <span style={{ marginLeft: '4px' }}>
              ({displayROE >= 0 ? '+' : ''}{displayROE.toFixed(1)}%)
            </span>
          )}
        </span>
        <ExternalLink size={12} style={{ color: '#758696', cursor: 'pointer' }} />
      </div>

      {/* Liq. Price */}
      <div className="min-w-[90px]">
        <span style={{ color: '#d1d4dc' }}>
          {liquidationPrice !== null ? formatPrice(liquidationPrice) : '--'}
        </span>
      </div>

      {/* Margin */}
      <div className="flex items-center gap-1 min-w-[120px]">
        <span style={{ color: '#d1d4dc' }}>
          {formatCurrency(parseFloat(marginDisplay))} (Isolated)
        </span>
        <Pencil size={12} style={{ color: '#758696', cursor: 'pointer' }} />
      </div>

      {/* Funding */}
      <div className="min-w-[80px]">
        <span style={{ color: '#d1d4dc' }}>$0.00</span>
      </div>

      {/* Close All */}
      <div className="flex items-center gap-2 min-w-[140px]">
        <button
          onClick={handleClose}
          disabled={isClosing || !isZtarknetReady}
          className="px-2 py-1 rounded text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            color: '#50d2c1',
            backgroundColor: 'transparent',
            border: '1px solid rgba(80, 210, 193, 0.3)',
          }}
          onMouseEnter={(e) => {
            if (!isClosing && isZtarknetReady) {
              e.currentTarget.style.backgroundColor = 'rgba(80, 210, 193, 0.1)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          {isClosing ? 'Closing...' : 'Market'}
        </button>
        <button
          disabled={true}
          className="px-2 py-1 rounded text-xs transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            color: '#50d2c1',
            backgroundColor: 'transparent',
            border: '1px solid rgba(80, 210, 193, 0.2)',
          }}
        >
          Limit
        </button>
      </div>

      {/* TP/SL */}
      <div className="flex items-center gap-1 min-w-[80px]">
        <span style={{ color: '#758696' }}>--/--</span>
        <Pencil size={12} style={{ color: '#758696', cursor: 'pointer' }} />
      </div>
    </div>
  );
}
