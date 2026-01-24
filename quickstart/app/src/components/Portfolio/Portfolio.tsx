import { useState, useEffect } from 'react';
import { useTradingStore, Position } from '../../stores/tradingStore';
import { formatYusdBalance, fetchVaultBalance, fetchLockedCollateral, fetchAvailableBalance } from '../../lib/balanceUtils';
import { Header } from '../Layout/Header';
import { TrendingUp, TrendingDown, Wallet, Lock, DollarSign, BarChart3 } from 'lucide-react';
import { MARKET_INFO, MARKETS } from '../../config/contracts';
import { fetchPythPrice } from '../../services/pythService';
import { calculatePnL, calculateLiquidationPrice } from '../../services/pnlService';
import { X } from 'lucide-react';
import '../../App.css';

interface PortfolioProps {
  onNavigate?: (page: 'trading' | 'portfolio') => void;
}

interface PositionWithPnL extends Position {
  currentPrice?: number;
  pnl?: string; // Changed to string to match Position interface
  pnlPercent?: number;
  roe?: number;
  positionValue?: number;
  liquidationPrice?: number | undefined; // Changed from number | null to number | undefined
}

export function Portfolio({ onNavigate }: PortfolioProps) {
  const availableBalance = useTradingStore((state) => state.availableBalance);
  const positions = useTradingStore((state) => state.positions);
  const ztarknetAccount = useTradingStore((state) => state.ztarknetAccount);
  const isZtarknetReady = useTradingStore((state) => state.isZtarknetReady);
  
  const [activeTab, setActiveTab] = useState<'balances' | 'positions' | 'orders' | 'history'>('positions');
  const [_timeRange, _setTimeRange] = useState<'7d' | '30d' | 'all'>('30d');
  const [isLoading, setIsLoading] = useState(true);
  const [vaultBalance, setVaultBalance] = useState<string>('0');
  const [lockedCollateral, setLockedCollateral] = useState<string>('0');
  const [positionsWithPnL, setPositionsWithPnL] = useState<PositionWithPnL[]>([]);
  const [totalPnL, setTotalPnL] = useState<number>(0);
  const [totalEquity, setTotalEquity] = useState<number>(0);

  // Fetch real-time balance data
  useEffect(() => {
    if (!isZtarknetReady || !ztarknetAccount) {
      setIsLoading(false);
      return;
    }

    const fetchBalanceData = async () => {
      try {
        setIsLoading(true);
        // Fetch balance for BTC/USD (contract ignores market_id, so any market works)
        const [balance, locked] = await Promise.all([
          fetchVaultBalance(ztarknetAccount.address, MARKETS.BTC_USD),
          fetchLockedCollateral(ztarknetAccount.address, MARKETS.BTC_USD),
        ]);
        
        setVaultBalance(balance);
        setLockedCollateral(locked);
      } catch (error) {
        console.error('Error fetching balance data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBalanceData();
    const interval = setInterval(fetchBalanceData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [isZtarknetReady, ztarknetAccount]);

  // Calculate PnL for all positions
  useEffect(() => {
    if (positions.length === 0) {
      setPositionsWithPnL([]);
      setTotalPnL(0);
      return;
    }

    const updatePositionsPnL = async () => {
      try {
        const updatedPositions: PositionWithPnL[] = await Promise.all(
          positions.map(async (position) => {
            try {
              // Fetch current price
              const priceData = await fetchPythPrice(position.marketId);
              const currentPrice = priceData.price;

              // Calculate PnL
              const pnl = calculatePnL(position, currentPrice, position.leverage || 20);
              
              // Calculate liquidation price
              const liqPrice = calculateLiquidationPrice(position, position.leverage || 20);

              // Calculate position value
              const marginValue = parseFloat(position.margin || '0');
              const marginInYUSD = marginValue > 1e10 ? marginValue / 1e18 : marginValue;
              const entryPriceValue = parseFloat(position.entryPrice || '0');
              const leverage = position.leverage || 20;
              const size = (marginInYUSD * leverage) / entryPriceValue;
              const positionValue = size * currentPrice;

              return {
                ...position,
                currentPrice,
                pnl: pnl.pnl.toString(), // Convert to string to match Position interface
                pnlPercent: pnl.pnlPercent,
                roe: pnl.roe,
                positionValue,
                liquidationPrice: liqPrice ?? undefined, // Convert null to undefined
              };
            } catch (error) {
              console.error(`Error calculating PnL for position ${position.commitment}:`, error);
              return {
                ...position,
                currentPrice: undefined,
                pnl: '0', // String to match Position interface
                pnlPercent: 0,
                roe: 0,
                positionValue: 0,
                liquidationPrice: undefined,
              };
            }
          })
        );

        setPositionsWithPnL(updatedPositions);
        
        // Calculate total PnL (convert string to number)
        const total = updatedPositions.reduce((sum, pos) => {
          const pnlValue = typeof pos.pnl === 'string' ? parseFloat(pos.pnl) : (pos.pnl || 0);
          return sum + pnlValue;
        }, 0);
        setTotalPnL(total);
      } catch (error) {
        console.error('Error updating positions PnL:', error);
      }
    };

    updatePositionsPnL();
    const interval = setInterval(updatePositionsPnL, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, [positions]);

  // Calculate total equity
  useEffect(() => {
    const vaultBalanceNum = parseFloat(formatYusdBalance(vaultBalance));
    const totalEquityValue = vaultBalanceNum + totalPnL;
    setTotalEquity(totalEquityValue);
  }, [vaultBalance, totalPnL]);

  const _yusdBalance = availableBalance ? formatYusdBalance(availableBalance) : '0.00';
  const vaultBalanceFormatted = formatYusdBalance(vaultBalance);
  const lockedCollateralFormatted = formatYusdBalance(lockedCollateral);
  const availableBalanceFormatted = formatYusdBalance(availableBalance);

  const formatPrice = (price: number | string | undefined): string => {
    if (!price) return '0.00';
    const num = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(num)) return '0.00';
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const _formatLargeNumber = (num: number | string): string => {
    const value = typeof num === 'string' ? parseFloat(num) : num;
    if (isNaN(value)) return '0.00';
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  const getMarketSymbol = (marketId: string): string => {
    return MARKET_INFO[marketId as keyof typeof MARKET_INFO]?.symbol || marketId;
  };

  return (
    <div className="portfolio-container">
      <Header currentPage="portfolio" onNavigate={onNavigate} />
      
      <div className="portfolio-content">
        <div className="portfolio-header-section">
          <h1 className="portfolio-title">Portfolio</h1>
          {isZtarknetReady && ztarknetAccount && (
            <div className="portfolio-wallet-badge">
              <Wallet size={16} />
              <span>{ztarknetAccount.address.slice(0, 6)}...{ztarknetAccount.address.slice(-4)}</span>
            </div>
          )}
        </div>

        {/* Summary Cards */}
        <div className="portfolio-summary-grid">
          <div className="portfolio-summary-card primary">
            <div className="portfolio-summary-card-icon">
              <DollarSign size={24} />
            </div>
            <div className="portfolio-summary-card-content">
              <div className="portfolio-summary-card-label">Total Equity</div>
              <div className="portfolio-summary-card-value">${formatPrice(totalEquity)}</div>
              <div className={`portfolio-summary-card-change ${totalPnL >= 0 ? 'positive' : 'negative'}`}>
                {totalPnL >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                <span>${formatPrice(Math.abs(totalPnL))}</span>
              </div>
            </div>
          </div>

          <div className="portfolio-summary-card">
            <div className="portfolio-summary-card-icon">
              <Wallet size={24} />
            </div>
            <div className="portfolio-summary-card-content">
              <div className="portfolio-summary-card-label">Available Balance</div>
              <div className="portfolio-summary-card-value">${availableBalanceFormatted}</div>
              <div className="portfolio-summary-card-subtext">Ready to trade</div>
            </div>
          </div>

          <div className="portfolio-summary-card">
            <div className="portfolio-summary-card-icon">
              <Lock size={24} />
            </div>
            <div className="portfolio-summary-card-content">
              <div className="portfolio-summary-card-label">Locked Collateral</div>
              <div className="portfolio-summary-card-value">${lockedCollateralFormatted}</div>
              <div className="portfolio-summary-card-subtext">{positions.length} position{positions.length !== 1 ? 's' : ''}</div>
            </div>
          </div>

          <div className="portfolio-summary-card">
            <div className="portfolio-summary-card-icon">
              <BarChart3 size={24} />
            </div>
            <div className="portfolio-summary-card-content">
              <div className="portfolio-summary-card-label">Total PnL</div>
              <div className={`portfolio-summary-card-value ${totalPnL >= 0 ? 'positive' : 'negative'}`}>
                {totalPnL >= 0 ? '+' : ''}${formatPrice(totalPnL)}
              </div>
              <div className="portfolio-summary-card-subtext">
                {positions.length > 0 
                  ? `${((totalPnL / parseFloat(vaultBalanceFormatted)) * 100).toFixed(2)}% ROI`
                  : 'No positions'
                }
              </div>
            </div>
          </div>
        </div>

        <div className="portfolio-layout">
          {/* Left Panel - Quick Stats */}
          <div className="portfolio-left-panel">
            <div className="portfolio-stat-card">
              <div className="portfolio-stat-label">Vault Balance</div>
              <div className="portfolio-stat-value">${vaultBalanceFormatted}</div>
              <div className="portfolio-stat-breakdown">
                <div className="portfolio-stat-breakdown-item">
                  <span>Available:</span>
                  <span>${availableBalanceFormatted}</span>
                </div>
                <div className="portfolio-stat-breakdown-item">
                  <span>Locked:</span>
                  <span>${lockedCollateralFormatted}</span>
                </div>
              </div>
            </div>

            <div className="portfolio-stat-card">
              <div className="portfolio-stat-label">Trading Fees</div>
              <div className="portfolio-stat-row">
                <span className="portfolio-stat-value-small">Taker: 0.0450%</span>
                <span className="portfolio-stat-value-small">Maker: 0.0150%</span>
              </div>
              <div className="portfolio-stat-subtext">Perpetual Futures</div>
            </div>

            <div className="portfolio-stat-card">
              <div className="portfolio-stat-label">Open Positions</div>
              <div className="portfolio-stat-value-large">{positions.length}</div>
              <div className="portfolio-stat-subtext">
                {positions.length > 0 
                  ? `${positions.filter(p => {
                      const posPnL = positionsWithPnL.find(p2 => p2.commitment === p.commitment)?.pnl;
                      const pnlValue = typeof posPnL === 'string' ? parseFloat(posPnL) : (posPnL || 0);
                      return pnlValue >= 0;
                    }).length} profitable`
                  : 'Start trading to open positions'
                }
              </div>
            </div>
          </div>

          {/* Right Panel - Positions Table */}
          <div className="portfolio-right-panel">

            <div className="portfolio-bottom-right">
              <div className="portfolio-table-header">
                <div className="portfolio-table-tabs">
                  <button 
                    className={`portfolio-table-tab ${activeTab === 'balances' ? 'active' : ''}`}
                    onClick={() => setActiveTab('balances')}
                  >
                    Balances
                  </button>
                  <button 
                    className={`portfolio-table-tab ${activeTab === 'positions' ? 'active' : ''}`}
                    onClick={() => setActiveTab('positions')}
                  >
                    Positions ({positions.length})
                  </button>
                  <button 
                    className={`portfolio-table-tab ${activeTab === 'orders' ? 'active' : ''}`}
                    onClick={() => setActiveTab('orders')}
                  >
                    Open Orders
                  </button>
                  <button 
                    className={`portfolio-table-tab ${activeTab === 'history' ? 'active' : ''}`}
                    onClick={() => setActiveTab('history')}
                  >
                    Trade History
                  </button>
                </div>
              </div>

              {activeTab === 'positions' && (
                <div className="portfolio-table-container">
                  {isLoading && positions.length === 0 ? (
                    <div className="portfolio-table-empty">Loading positions...</div>
                  ) : positions.length === 0 ? (
                    <div className="portfolio-table-empty-state">
                      <BarChart3 size={48} />
                      <h3>No Open Positions</h3>
                      <p>Start trading to open your first position</p>
                      <button 
                        className="portfolio-empty-action-btn"
                        onClick={() => onNavigate?.('trading')}
                      >
                        Go to Trading
                      </button>
                    </div>
                  ) : (
                    <div className="portfolio-positions-grid">
                      {positionsWithPnL.map((position) => {
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        const _marketInfo = MARKET_INFO[position.marketId as keyof typeof MARKET_INFO];
                        const size = position.size ? parseFloat(position.size) : 
                          (position.margin && position.entryPrice && position.leverage
                            ? (parseFloat(position.margin) * (position.leverage || 20)) / parseFloat(position.entryPrice)
                            : 0);
                        // Convert pnl from string to number for calculations
                        const pnl = typeof position.pnl === 'string' ? parseFloat(position.pnl) : (position.pnl || 0);
                        const pnlPercent = position.pnlPercent || 0;
                        const roe = position.roe || 0;

                        return (
                          <div key={position.commitment} className="portfolio-position-card">
                            <div className="portfolio-position-header">
                              <div className="portfolio-position-market">
                                <span className="portfolio-position-symbol">
                                  {getMarketSymbol(position.marketId).replace('/USD', '')}
                                </span>
                                <span className={`portfolio-position-side ${position.isLong ? 'long' : 'short'}`}>
                                  {position.isLong ? 'LONG' : 'SHORT'}
                                </span>
                                <span className="portfolio-position-leverage">{position.leverage || 20}x</span>
                              </div>
                              <div className={`portfolio-position-pnl ${pnl >= 0 ? 'positive' : 'negative'}`}>
                                {pnl >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                <span>${formatPrice(Math.abs(pnl))}</span>
                                <span className="portfolio-position-pnl-percent">
                                  ({pnlPercent >= 0 ? '+' : ''}{formatPrice(pnlPercent)}%)
                                </span>
                              </div>
                            </div>
                            
                            <div className="portfolio-position-body">
                              <div className="portfolio-position-row">
                                <div className="portfolio-position-label">Size</div>
                                <div className="portfolio-position-value">{formatPrice(size)}</div>
                              </div>
                              <div className="portfolio-position-row">
                                <div className="portfolio-position-label">Entry Price</div>
                                <div className="portfolio-position-value">${formatPrice(position.entryPrice)}</div>
                              </div>
                              <div className="portfolio-position-row">
                                <div className="portfolio-position-label">Mark Price</div>
                                <div className="portfolio-position-value">${formatPrice(position.currentPrice)}</div>
                              </div>
                              <div className="portfolio-position-row">
                                <div className="portfolio-position-label">Position Value</div>
                                <div className="portfolio-position-value">${formatPrice(position.positionValue)}</div>
                              </div>
                              <div className="portfolio-position-row">
                                <div className="portfolio-position-label">Margin</div>
                                <div className="portfolio-position-value">${formatPrice(position.margin)}</div>
                              </div>
                              <div className="portfolio-position-row">
                                <div className="portfolio-position-label">ROE</div>
                                <div className={`portfolio-position-value ${roe >= 0 ? 'positive' : 'negative'}`}>
                                  {roe >= 0 ? '+' : ''}{formatPrice(roe)}%
                                </div>
                              </div>
                              {position.liquidationPrice && (
                                <div className="portfolio-position-row">
                                  <div className="portfolio-position-label">Liquidation Price</div>
                                  <div className="portfolio-position-value liquidation">
                                    ${formatPrice(position.liquidationPrice)}
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            <div className="portfolio-position-footer">
                              <button
                                className="portfolio-position-close-btn"
                                onClick={() => {
                                  // Navigate to trading page where user can close position
                                  onNavigate?.('trading');
                                }}
                                title="Go to Trading page to close this position"
                              >
                                <X size={14} />
                                Manage Position
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'balances' && (
                <div className="portfolio-table-container">
                  <table className="portfolio-table">
                    <thead>
                      <tr>
                        <th>Asset</th>
                        <th>Total Balance</th>
                        <th>Available</th>
                        <th>Locked</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>
                          <div className="portfolio-asset-cell">
                            <span className="portfolio-asset-symbol">yUSD</span>
                            <span className="portfolio-asset-name">Yield USD</span>
                          </div>
                        </td>
                        <td>${vaultBalanceFormatted}</td>
                        <td>${availableBalanceFormatted}</td>
                        <td>${lockedCollateralFormatted}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'orders' && (
                <div className="portfolio-table-container">
                  <div className="portfolio-table-empty-state">
                    <BarChart3 size={48} />
                    <h3>No Open Orders</h3>
                    <p>Your pending orders will appear here</p>
                  </div>
                </div>
              )}

              {activeTab === 'history' && (
                <div className="portfolio-table-container">
                  <div className="portfolio-table-empty-state">
                    <BarChart3 size={48} />
                    <h3>No Trade History</h3>
                    <p>Your completed trades will appear here</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

