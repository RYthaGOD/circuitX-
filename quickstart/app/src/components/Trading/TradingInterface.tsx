import { MarketDropdown } from './MarketDropdown';
import { OrderForm } from './OrderForm';
import { PositionCard } from './PositionCard';
import { PriceChart } from './PriceChart';
import { OrderBook } from './OrderBook';
import { useTradingStore, Position } from '../../stores/tradingStore';
import { Header } from '../Layout/Header';
import { useState, useEffect } from 'react';
import { useOraclePriceUpdater } from '../../hooks/useOraclePriceUpdater';
import { toast } from 'sonner';
import '../../App.css';

interface TradingInterfaceProps {
  onNavigate?: (page: 'trading' | 'portfolio') => void;
}

export function TradingInterface({ onNavigate }: TradingInterfaceProps) {
  const positions = useTradingStore((state) => state.positions);
  const setPositions = useTradingStore((state) => state.setPositions);
  const ztarknetAccount = useTradingStore((state) => state.ztarknetAccount);
  const isZtarknetReady = useTradingStore((state) => state.isZtarknetReady);
  const [activeTab, setActiveTab] = useState<'orderbook' | 'trades'>('orderbook');
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasSynced, setHasSynced] = useState(false);
  const [wasWalletConnected, setWasWalletConnected] = useState(false); // Track if wallet was ever connected
  
  // Check localStorage directly to see if positions exist
  useEffect(() => {
    const checkLocalStorage = () => {
      try {
        const stored = localStorage.getItem('ztarknet-trading-store');
        if (stored) {
          const parsed = JSON.parse(stored);
          const storedPositions = parsed?.state?.positions || [];
          console.log('📦 Found positions in localStorage:', storedPositions.length);
          if (storedPositions.length > 0) {
            console.log('📋 Stored positions:', storedPositions.map((p: any) => ({
              commitment: p.commitment?.slice(0, 16) + '...',
              marketId: p.marketId,
              hasMargin: !!p.margin,
              hasEntryPrice: !!p.entryPrice,
            })));
          }
        }
      } catch (error) {
        console.error('Error reading localStorage:', error);
      }
    };
    checkLocalStorage();
  }, []);
  
  // Wait for Zustand to hydrate from localStorage before doing anything
  const [isHydrated, setIsHydrated] = useState(false);
  
  useEffect(() => {
    // Zustand persist middleware hydrates automatically
    // We need to wait for it to complete before we can safely check/clear positions
    // Check if positions have been loaded from localStorage
    const checkHydration = () => {
      // Get positions directly from store (Zustand will have hydrated by now)
      const currentPositions = useTradingStore.getState().positions;
      const stored = localStorage.getItem('ztarknet-trading-store');
      
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const storedPositions = parsed?.state?.positions || [];
          
          // If we have stored positions, check if they're in the store
          if (storedPositions.length > 0) {
            // Positions should be hydrated by now (Zustand does this synchronously on mount)
            // But give it a tiny delay to be safe
            if (currentPositions.length === storedPositions.length || currentPositions.length > 0) {
              console.log('✅ Zustand hydration complete:', {
                stored: storedPositions.length,
                current: currentPositions.length,
              });
              setIsHydrated(true);
              return;
            }
          }
        } catch (error) {
          console.error('Error checking hydration:', error);
        }
      }
      
      // No stored data or positions already loaded - hydration is complete
      setIsHydrated(true);
    };
    
    // Check immediately (Zustand hydrates synchronously)
    // But also check after a small delay to be safe
    checkHydration();
    const timer = setTimeout(checkHydration, 200);
    return () => clearTimeout(timer);
  }, []);

  // Handle wallet connect/disconnect (only after hydration)
  useEffect(() => {
    if (!isHydrated) {
      return; // Wait for hydration
    }
    
    if (!isZtarknetReady || !ztarknetAccount) {
      // Wallet is not connected
      // Only clear positions if wallet was previously connected (disconnect event)
      // Don't clear on initial load when wallet was never connected
      if (wasWalletConnected && positions.length > 0) {
        console.log('🔒 Wallet disconnected - clearing positions from display');
        setPositions([]);
      }
      // Reset sync state when wallet disconnects so it can sync again on reconnect
      if (wasWalletConnected && hasSynced) {
        console.log('🔄 Wallet disconnected - resetting sync state');
        setHasSynced(false);
      }
      setWasWalletConnected(false);
    } else {
      // Wallet connected
      if (!wasWalletConnected) {
        // First time connecting - mark as connected
        setWasWalletConnected(true);
        // Restore positions from localStorage if they exist and aren't already loaded
        if (positions.length === 0) {
          const stored = localStorage.getItem('ztarknet-trading-store');
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              const storedPositions = parsed?.state?.positions || [];
              if (storedPositions.length > 0) {
                console.log('📦 Wallet connected - restoring positions from localStorage:', storedPositions.length);
                setPositions(storedPositions);
              }
            } catch (error) {
              console.error('Error restoring positions from localStorage:', error);
            }
          }
        }
      }
    }
  }, [isHydrated, isZtarknetReady, ztarknetAccount, hasSynced, wasWalletConnected, positions.length, setPositions]);

  // Load positions from on-chain based on locked collateral
  useEffect(() => {
    // Wait for hydration before loading
    if (!isHydrated) {
      return;
    }
    
    // Only load if wallet is connected
    if (!isZtarknetReady || !ztarknetAccount) {
      console.log('ℹ️ Wallet not connected - positions will be empty');
      setPositions([]); // Clear positions when wallet disconnects
      return;
    }

    // Prevent multiple simultaneous loads
    if (isSyncing || hasSynced) {
      return;
    }

    // Load positions from on-chain
    const loadPositionsFromChain = async () => {
      setIsSyncing(true);
      try {
        console.log('🔄 Loading positions from on-chain (based on locked collateral)...', {
          walletAddress: ztarknetAccount.address.slice(0, 10) + '...',
        });

        // Import the position fetcher
        const { fetchPositionsFromChain } = await import('../../services/positionFetcher');
        
        // Get commitments from localStorage (persists across browser sessions)
        let knownCommitments: string[] = [];
        try {
          const storedCommitments = localStorage.getItem('position-commitments');
          console.log('📦 Reading commitments from localStorage:', {
            stored: storedCommitments,
            exists: !!storedCommitments,
          });
          knownCommitments = JSON.parse(storedCommitments || '[]');
          console.log('✅ Parsed commitments from localStorage:', {
            count: knownCommitments.length,
            commitments: knownCommitments.map(c => c.slice(0, 16) + '...'),
          });
        } catch (error) {
          console.warn('❌ Failed to read commitments from localStorage:', error);
        }
        
        // FALLBACK: Also check sessionStorage for backward compatibility
        if (knownCommitments.length === 0) {
          try {
            const sessionCommitments = sessionStorage.getItem('position-commitments');
            if (sessionCommitments) {
              const parsed = JSON.parse(sessionCommitments);
              if (Array.isArray(parsed) && parsed.length > 0) {
                console.log('📦 Found commitments in sessionStorage (fallback):', {
                  count: parsed.length,
                  commitments: parsed.map((c: string) => c.slice(0, 16) + '...'),
                });
                knownCommitments = parsed;
                // Migrate to localStorage
                localStorage.setItem('position-commitments', JSON.stringify(knownCommitments));
                console.log('✅ Migrated commitments from sessionStorage to localStorage');
              }
            }
          } catch (error) {
            console.warn('❌ Failed to read commitments from sessionStorage fallback:', error);
          }
        }
        
        // Also get any in-memory positions (from current session)
        const currentPositions = useTradingStore.getState().positions;
        const inMemoryCommitments = currentPositions.map(p => p.commitment);
        console.log('💾 In-memory commitments:', {
          count: inMemoryCommitments.length,
          commitments: inMemoryCommitments.map(c => c.slice(0, 16) + '...'),
        });
        
        // Combine commitments from sessionStorage, localStorage fallback, and in-memory
        const allCommitments = [...new Set([...knownCommitments, ...inMemoryCommitments])];
        console.log('🔗 All commitments to check:', {
          total: allCommitments.length,
          fromSessionStorage: knownCommitments.length,
          fromMemory: inMemoryCommitments.length,
          commitments: allCommitments.map(c => c.slice(0, 16) + '...'),
        });
        
        // Fetch positions from on-chain (only those with locked collateral)
        const onChainPositions = await fetchPositionsFromChain(
          ztarknetAccount.address,
          allCommitments
        );
        
        console.log('📊 On-chain positions found:', {
          count: onChainPositions.length,
          positions: onChainPositions.map(p => ({
            commitment: p.commitment.slice(0, 16) + '...',
            marketId: p.marketId,
            margin: p.margin,
          })),
        });
        
        // RECOVERY: Also load ALL positions from localStorage directly (even if not on-chain)
        // This helps recover positions that might have been lost
        const recoveredPositions: Position[] = [];
        try {
          console.log('🔍 Recovering positions from localStorage...');
          for (const commitment of allCommitments) {
            const storageKey = `position-${commitment}`;
            let stored = localStorage.getItem(storageKey);
            
            if (!stored) {
              // Try sessionStorage as fallback
              stored = sessionStorage.getItem(storageKey);
            }
            
            if (stored) {
              try {
                const positionData = JSON.parse(stored);
                // Only add if it's not already in onChainPositions
                const alreadyFound = onChainPositions.some(p => p.commitment.toLowerCase() === commitment.toLowerCase());
                if (!alreadyFound && positionData.marketId && positionData.commitment) {
                  console.log(`✅ Recovered position from localStorage: ${commitment.slice(0, 16)}...`);
                  recoveredPositions.push({
                    ...positionData,
                    commitment: commitment, // Ensure commitment matches
                  });
                }
              } catch (parseError) {
                console.warn(`⚠️ Failed to parse position data for ${commitment.slice(0, 16)}...:`, parseError);
              }
            }
          }
          console.log(`📦 Recovered ${recoveredPositions.length} positions from localStorage`);
        } catch (recoveryError) {
          console.warn('⚠️ Error recovering positions from localStorage:', recoveryError);
        }
        
        // Load position details from localStorage for positions found on-chain
        const positionsWithDetails: Position[] = [];
        
        for (const onChainPos of onChainPositions) {
          console.log(`🔍 Loading details for position: ${onChainPos.commitment.slice(0, 16)}...`);
          
          // Try to load full position details from localStorage (primary) or sessionStorage (fallback)
          let positionDetails: Partial<Position> | null = null;
          try {
            const storageKey = `position-${onChainPos.commitment}`;
            // Try localStorage first (primary storage)
            let stored = localStorage.getItem(storageKey);
            console.log(`📦 Checking localStorage for key: ${storageKey}`, {
              exists: !!stored,
              length: stored?.length || 0,
            });
            
            if (stored) {
              positionDetails = JSON.parse(stored);
              console.log(`✅ Loaded position details from localStorage:`, {
                hasEntryPrice: !!positionDetails?.entryPrice,
                hasSize: !!positionDetails?.size,
                hasTraderSecret: !!positionDetails?.traderSecret,
                margin: positionDetails?.margin,
              });
            } else {
              // Fallback to sessionStorage for backward compatibility
              stored = sessionStorage.getItem(storageKey);
              console.log(`📦 Checking sessionStorage (fallback) for key: ${storageKey}`, {
                exists: !!stored,
                length: stored?.length || 0,
              });
              
              if (stored) {
                positionDetails = JSON.parse(stored);
                console.log(`✅ Loaded position details from sessionStorage (fallback):`, {
                  hasEntryPrice: !!positionDetails?.entryPrice,
                  hasSize: !!positionDetails?.size,
                  hasTraderSecret: !!positionDetails?.traderSecret,
                  margin: positionDetails?.margin,
                });
                // Migrate to localStorage
                localStorage.setItem(storageKey, stored);
                console.log(`✅ Migrated position details to localStorage`);
              } else {
                console.warn(`⚠️ No position details found for ${onChainPos.commitment.slice(0, 16)}...`);
              }
            }
          } catch (error) {
            console.warn(`❌ Failed to load position details for ${onChainPos.commitment.slice(0, 16)}...:`, error);
          }
          
          // Merge on-chain data with stored details
          const fullPosition: Position = {
            ...onChainPos,
            ...positionDetails,
            // Ensure required fields
            commitment: onChainPos.commitment,
            marketId: onChainPos.marketId,
            margin: positionDetails?.margin || onChainPos.margin,
            timestamp: positionDetails?.timestamp || onChainPos.timestamp,
            leverage: positionDetails?.leverage || onChainPos.leverage || 20,
            isLong: positionDetails?.isLong ?? onChainPos.isLong,
            // Preserve private data from localStorage
            entryPrice: positionDetails?.entryPrice,
            size: positionDetails?.size,
            traderSecret: positionDetails?.traderSecret,
            pnl: positionDetails?.pnl || '0',
          };
          
          console.log(`✅ Final position data:`, {
            commitment: fullPosition.commitment.slice(0, 16) + '...',
            marketId: fullPosition.marketId,
            hasEntryPrice: !!fullPosition.entryPrice,
            hasSize: !!fullPosition.size,
            hasTraderSecret: !!fullPosition.traderSecret,
            margin: fullPosition.margin,
          });
          
          positionsWithDetails.push(fullPosition);
        }
        
        // Combine on-chain positions with recovered positions from localStorage
        // Remove duplicates (same commitment)
        const allPositions = [...positionsWithDetails, ...recoveredPositions];
        const uniquePositions = allPositions.filter((pos, index, self) => 
          index === self.findIndex(p => p.commitment.toLowerCase() === pos.commitment.toLowerCase())
        );
        
        console.log('✅ Final positions loaded:', {
          onChain: positionsWithDetails.length,
          recovered: recoveredPositions.length,
          total: uniquePositions.length,
        });
        
        setPositions(uniquePositions);
        
        console.log('✅ Positions loaded from on-chain:', {
          count: positionsWithDetails.length,
          positions: positionsWithDetails.map(p => ({
            commitment: p.commitment.slice(0, 16) + '...',
            marketId: p.marketId,
            margin: p.margin,
          })),
        });
      } catch (error: any) {
        console.error('❌ Error loading positions from chain:', error);
        console.error('Error details:', {
          message: error?.message,
          stack: error?.stack,
          name: error?.name,
        });
        
        // Check if there's locked collateral but no positions found
        try {
          const { fetchLockedCollateral } = await import('../../lib/balanceUtils');
          const { MARKETS } = await import('../../config/contracts');
          const locked = await fetchLockedCollateral(ztarknetAccount.address, MARKETS.BTC_USD);
          const lockedBigInt = BigInt(locked || '0');
          
          if (lockedBigInt > 0n) {
            // There's locked collateral but positions couldn't be loaded
            toast.warning('Positions found but details missing', {
              description: 'You have locked collateral but position details are not available. If you closed your browser, try refreshing the page.',
              duration: 8000,
            });
          } else {
            // No locked collateral - no positions
            console.log('ℹ️ No locked collateral - no positions to display');
          }
        } catch (checkError) {
          // Show generic error if we can't check locked collateral
          const errorMessage = error?.message || 'Unknown error';
          toast.error('Failed to load positions from blockchain', {
            description: errorMessage.length > 100 ? errorMessage.substring(0, 100) + '...' : errorMessage,
            duration: 5000,
          });
        }
        
        // Don't clear positions on error - keep existing ones if any
        console.warn('⚠️ Keeping existing positions due to load error');
      } finally {
        setIsSyncing(false);
        setHasSynced(true);
      }
    };

    loadPositionsFromChain();
  }, [isHydrated, isZtarknetReady, ztarknetAccount, isSyncing, hasSynced, setPositions]);
  
  // Update oracle prices from price feed (every 60 seconds)
  useOraclePriceUpdater(60000);

  return (
    <div className="trading-interface-container">
      <Header currentPage="trading" onNavigate={onNavigate} />
      
      <div className="trading-interface-layout">
        {/* Top Section: Chart, Order Book, and Order Form */}
        <div className="trading-interface-top">
          {/* Left: Chart Area */}
          <div className="trading-interface-left">
            {/* Empty Rounded Box Above Market Selector */}
            <div className="trading-header-empty-box" />
            
            {/* Market Info Bar */}
            <MarketDropdown />
            
            {/* Chart */}
            <div className="trading-chart-container">
              <PriceChart />
            </div>
            
            {/* Positions Panel - Below Chart, Scrollable */}
            <div className="trading-positions-panel">
              {!isZtarknetReady || !ztarknetAccount ? (
                <div className="trading-positions-empty">
                  Connect wallet to view positions
                </div>
              ) : positions.length === 0 ? (
                <div className="trading-positions-empty">
                  No open positions yet
                </div>
              ) : (
                <>
                  {/* Positions Header Row */}
                  <div 
                    className="flex items-center gap-4 px-4 py-2 border-b text-xs font-medium"
                    style={{
                      backgroundColor: 'transparent',
                      borderColor: 'rgba(255, 255, 255, 0.1)',
                      color: 'rgba(255, 255, 255, 0.6)',
                      position: 'sticky',
                      top: 0,
                      zIndex: 10,
                      flexShrink: 0,
                    }}
                  >
                    <div className="min-w-[80px]">Action</div>
                    <div className="min-w-[100px]">Coin</div>
                    <div className="min-w-[100px]">Size</div>
                    <div className="min-w-[100px]">Position Value</div>
                    <div className="min-w-[90px]">Entry Price</div>
                    <div className="min-w-[90px]">Mark Price</div>
                    <div className="min-w-[120px]">PNL (ROE %)</div>
                    <div className="min-w-[90px]">Liq. Price</div>
                    <div className="min-w-[120px]">Margin</div>
                    <div className="min-w-[80px]">Funding</div>
                    <div className="min-w-[140px]">Close All</div>
                    <div className="min-w-[80px]">TP/SL</div>
                  </div>
                  
                  {/* Positions List */}
                  <div className="trading-positions-list">
                    {positions.map((position) => (
                      <PositionCard key={position.commitment} position={position} />
                    ))}
                  </div>
                  
                  <div className="trading-positions-privacy-note">
                    <p className="text-xs text-gray-500 text-center italic">
                      ALL TRADING INFO ARE PRIVATE AND VERIFIED BY ZK PROOFS
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Middle: Order Book / Trades */}
          <div className="orderbook-container">
            {/* Order Book / Trades Header */}
            <div className="orderbook-header">
              <div className="orderbook-tabs">
                <button 
                  onClick={() => setActiveTab('orderbook')}
                  className={`orderbook-tab ${activeTab === 'orderbook' ? 'active' : ''}`}
                >
                  Order Book
                </button>
                <button 
                  onClick={() => setActiveTab('trades')}
                  className={`orderbook-tab ${activeTab === 'trades' ? 'active' : ''}`}
                >
                  Trades
                </button>
              </div>
            </div>

            {/* Order Book / Trades Content */}
            <div className="orderbook-content">
              {activeTab === 'orderbook' ? (
                <OrderBook />
              ) : (
                <div className="orderbook-trades">
                  <div className="orderbook-column-headers">
                    <span>Price</span>
                    <span>Size</span>
                    <span>Time</span>
                  </div>
                  <div className="orderbook-trades-list">
                    {Array.from({ length: 20 }).map((_, i) => (
                      <div key={i} className="orderbook-row orderbook-trade-row">
                        <span className={Math.random() > 0.5 ? 'orderbook-price-bid' : 'orderbook-price-ask'}>
                          {(91.190 + Math.random() * 0.02).toFixed(3)}
                        </span>
                        <span className="orderbook-size">{(Math.random() * 2).toFixed(5)}</span>
                        <span className="orderbook-time">12:34:56</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Trading Panel */}
          <div className="trading-interface-right">
            <div className="trading-interface-right-inner">
              <OrderForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

