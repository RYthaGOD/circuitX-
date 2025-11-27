import { useState } from 'react';
import { useTradingStore } from '../../stores/tradingStore';
import { formatYusdBalance } from '../../lib/balanceUtils';
import { Header } from '../Layout/Header';
import { ChevronDown } from 'lucide-react';
import '../../App.css';

interface PortfolioProps {
  onNavigate?: (page: 'trading' | 'portfolio') => void;
}

export function Portfolio({ onNavigate }: PortfolioProps) {
  const availableBalance = useTradingStore((state) => state.availableBalance);
  const positions = useTradingStore((state) => state.positions);
  const [activeTab, setActiveTab] = useState<'balances' | 'positions' | 'orders' | 'history'>('positions');
  const [accountView, setAccountView] = useState<'all' | 'perps' | 'spot'>('all');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('30d');

  const yusdBalance = availableBalance ? formatYusdBalance(availableBalance) : '0.00';

  return (
    <div className="portfolio-container">
      <Header currentPage="portfolio" onNavigate={onNavigate} />
      
      <div className="portfolio-content">
        <h1 className="portfolio-title">Portfolio</h1>

        <div className="portfolio-layout">
          {/* Left Panel - Summary Statistics */}
          <div className="portfolio-left-panel">
            <div className="portfolio-stat-card">
              <div className="portfolio-stat-label">yUSD Balance</div>
              <div className="portfolio-stat-value">${yusdBalance}</div>
              <a href="#" className="portfolio-stat-link">View Balance</a>
            </div>

            <div className="portfolio-stat-card">
              <div className="portfolio-stat-label">Fees (Taker / Maker)</div>
              <div className="portfolio-stat-row">
                <span className="portfolio-stat-value-small">0.0450% / 0.0150%</span>
                <button className="portfolio-dropdown-btn">
                  Perps <ChevronDown size={12} />
                </button>
              </div>
              <a href="#" className="portfolio-stat-link">View Fee Schedule</a>
            </div>
          </div>

          {/* Right Panel - Account Summary and Positions */}
          <div className="portfolio-right-panel">
            {/* Top Right - Actions and Account Summary */}
            <div className="portfolio-top-right">
              {/* Action Buttons */}
              <div className="portfolio-actions">
                <button className="portfolio-action-btn">Link Staking</button>
                <button className="portfolio-action-btn">Perps &lt;-&gt; Spot Transfer</button>
                <button className="portfolio-action-btn">EVM &lt;-&gt; Core Transfer</button>
                <button className="portfolio-action-btn">Swap Stablecoins</button>
                <button className="portfolio-action-btn">Send</button>
                <button className="portfolio-action-btn">Withdraw</button>
                <button className="portfolio-action-btn">Deposit</button>
              </div>

              {/* Account Summary */}
              <div className="portfolio-account-summary">
                <div className="portfolio-summary-tabs">
                  <button className="portfolio-summary-tab">Account Value</button>
                  <button className="portfolio-summary-tab active">PNL</button>
                </div>
                <div className="portfolio-summary-controls">
                  <button className="portfolio-dropdown-btn">
                    Perps + Spot + Vaults <ChevronDown size={12} />
                  </button>
                  <button className="portfolio-dropdown-btn">
                    {timeRange.toUpperCase()} <ChevronDown size={12} />
                  </button>
                </div>
                <div className="portfolio-summary-stats">
                  <div className="portfolio-summary-stat">
                    <span className="portfolio-summary-label">PNL:</span>
                    <span className="portfolio-summary-value">$0.00</span>
                  </div>
                  <div className="portfolio-summary-stat">
                    <span className="portfolio-summary-label">Volume:</span>
                    <span className="portfolio-summary-value">$0.00</span>
                  </div>
                  <div className="portfolio-summary-stat">
                    <span className="portfolio-summary-label">Max Drawdown:</span>
                    <span className="portfolio-summary-value">0.00%</span>
                  </div>
                  <div className="portfolio-summary-stat">
                    <span className="portfolio-summary-label">Total Equity:</span>
                    <span className="portfolio-summary-value">${yusdBalance}</span>
                  </div>
                  <div className="portfolio-summary-stat">
                    <span className="portfolio-summary-label">Perps Account Equity:</span>
                    <span className="portfolio-summary-value">${yusdBalance}</span>
                  </div>
                  <div className="portfolio-summary-stat">
                    <span className="portfolio-summary-label">Spot Account Equity:</span>
                    <span className="portfolio-summary-value">$0.00</span>
                  </div>
                  <div className="portfolio-summary-stat">
                    <span className="portfolio-summary-label">Vault Equity:</span>
                    <span className="portfolio-summary-value">$0.00</span>
                  </div>
                </div>
                {/* PNL Graph Placeholder */}
                <div className="portfolio-pnl-graph">
                  <div className="portfolio-graph-placeholder">PNL Graph</div>
                </div>
              </div>
            </div>

            {/* Bottom Right - Positions Table */}
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
                    Positions
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
                <button className="portfolio-filter-btn">
                  Filter <ChevronDown size={12} />
                </button>
              </div>

              {activeTab === 'positions' && (
                <div className="portfolio-table-container">
                  <table className="portfolio-table">
                    <thead>
                      <tr>
                        <th>Coin</th>
                        <th>Size</th>
                        <th>Position Value</th>
                        <th>Entry Price</th>
                        <th>Mark Price</th>
                        <th>PNL (ROE %)</th>
                        <th>Liq. Price</th>
                        <th>Margin</th>
                        <th>Funding</th>
                      </tr>
                    </thead>
                    <tbody>
                      {positions.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="portfolio-table-empty">
                            No open positions yet
                          </td>
                        </tr>
                      ) : (
                        positions.map((position) => (
                          <tr key={position.commitment}>
                            <td>{position.marketId}</td>
                            <td>{position.size || '0.00'}</td>
                            <td>$0.00</td>
                            <td>{position.entryPrice || '0.00'}</td>
                            <td>$0.00</td>
                            <td>{position.pnl || '0.00'} (0.00%)</td>
                            <td>N/A</td>
                            <td>$0.00</td>
                            <td>$0.00</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'balances' && (
                <div className="portfolio-table-container">
                  <table className="portfolio-table">
                    <thead>
                      <tr>
                        <th>Asset</th>
                        <th>Balance</th>
                        <th>Available</th>
                        <th>In Orders</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>yUSD</td>
                        <td>{yusdBalance}</td>
                        <td>{yusdBalance}</td>
                        <td>0.00</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'orders' && (
                <div className="portfolio-table-container">
                  <div className="portfolio-table-empty">No open orders</div>
                </div>
              )}

              {activeTab === 'history' && (
                <div className="portfolio-table-container">
                  <div className="portfolio-table-empty">No trade history</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

