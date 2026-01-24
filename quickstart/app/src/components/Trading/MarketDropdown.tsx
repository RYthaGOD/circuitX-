import { useState, useEffect, useRef } from 'react';
import { useTradingStore } from '../../stores/tradingStore';
import { MARKETS, MARKET_INFO } from '../../config/contracts';
import { fetchPythPrice } from '../../services/pythService';
import { ChevronDown, Search } from 'lucide-react';
import '../../App.css';

interface MarketListItem {
  marketId: string;
  symbol: string;
  currentPrice: string;
  priceChange24h: string;
  priceChangePercent: string;
  volume24h: string;
  openInterest: string;
  fundingRate: string;
  leverage: string;
}

// Static market list - all markets have 20x leverage
const STATIC_MARKETS: Omit<MarketListItem, 'currentPrice' | 'priceChange24h' | 'priceChangePercent' | 'volume24h' | 'openInterest' | 'fundingRate'>[] = [
  { marketId: MARKETS.BTC_USD, symbol: 'BTC/USD', leverage: '20x' },
  { marketId: MARKETS.ETH_USD, symbol: 'ETH/USD', leverage: '20x' },
  { marketId: MARKETS.SOL_USD, symbol: 'SOL/USD', leverage: '20x' },
  { marketId: MARKETS.STRK_USD, symbol: 'STRK/USD', leverage: '20x' },
  { marketId: MARKETS.BNB_USD, symbol: 'BNB/USD', leverage: '20x' },
];

export function MarketDropdown() {
  const selectedMarket = useTradingStore((state) => state.selectedMarket);
  const setSelectedMarket = useTradingStore((state) => state.setSelectedMarket);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Initialize with static markets (prices will be updated)
  const [markets, setMarkets] = useState<MarketListItem[]>(() => 
    STATIC_MARKETS.map(m => ({
      ...m,
      currentPrice: '0',
      priceChange24h: '0',
      priceChangePercent: '0',
      volume24h: '0',
      openInterest: '0',
      fundingRate: '0',
    }))
  );
  
  const [fundingCountdown, setFundingCountdown] = useState('00:00:00');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Countdown timer for funding
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const nextHour = new Date(now);
      nextHour.setHours(now.getHours() + 1, 0, 0, 0);
      const diff = nextHour.getTime() - now.getTime();
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setFundingCountdown(
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      );
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Fetch market prices (but keep static list structure)
  useEffect(() => {
    const updateMarketPrices = async () => {
      try {
        const updatedMarkets = await Promise.all(
          STATIC_MARKETS.map(async (market) => {
            try {
              const priceData = await fetchPythPrice(market.marketId);
              const currentPrice = priceData.price;
              
              // Generate mock 24h change (random between -10% and +15%)
              const changePercent = (Math.random() * 25 - 10).toFixed(2);
              const changeValue = (currentPrice * parseFloat(changePercent) / 100).toFixed(2);
              
              // Generate mock volume and open interest
              const volume = (Math.random() * 5000000000 + 50000000).toFixed(2);
              const openInterest = (Math.random() * 3000000000 + 100000000).toFixed(2);
              
              // Generate mock funding rate
              const fundingRate = (Math.random() * 0.02 - 0.01).toFixed(4);

              return {
                ...market,
                currentPrice: currentPrice.toFixed(2),
                priceChange24h: changeValue,
                priceChangePercent: changePercent,
                volume24h: volume,
                openInterest: openInterest,
                fundingRate: fundingRate,
              };
            } catch (error) {
              console.error(`Error fetching price for ${market.symbol}:`, error);
              // Return market with all required properties
              return {
                ...market,
                currentPrice: '0',
                priceChange24h: '0',
                priceChangePercent: '0',
                volume24h: '0',
                openInterest: '0',
                fundingRate: '0',
              } as MarketListItem;
            }
          })
        );
        // Ensure all markets have all required properties
        const completeMarkets: MarketListItem[] = updatedMarkets.map(m => ({
          marketId: m.marketId,
          symbol: m.symbol,
          currentPrice: ('currentPrice' in m ? m.currentPrice : '0') || '0',
          priceChange24h: ('priceChange24h' in m ? m.priceChange24h : '0') || '0',
          priceChangePercent: ('priceChangePercent' in m ? m.priceChangePercent : '0') || '0',
          volume24h: ('volume24h' in m ? m.volume24h : '0') || '0',
          openInterest: ('openInterest' in m ? m.openInterest : '0') || '0',
          fundingRate: ('fundingRate' in m ? m.fundingRate : '0') || '0',
          leverage: m.leverage || '20x',
        }));
        
        setMarkets(completeMarkets);
        
        // Also update the store so App.tsx title can read from it
        const setStoreMarkets = useTradingStore.getState().setMarkets;
        setStoreMarkets(completeMarkets.map(m => ({
          marketId: m.marketId,
          symbol: m.symbol,
          currentPrice: m.currentPrice || '0',
          priceChange24h: m.priceChange24h || '0',
          volume24h: m.volume24h || '0',
          openInterest: m.openInterest || '0',
        })));
      } catch (error) {
        console.error('Error updating market prices:', error);
      }
    };

    updateMarketPrices();
    const interval = setInterval(updateMarketPrices, 10000); // Update prices every 10 seconds
    return () => clearInterval(interval);
  }, []);

  // Filter markets based on search
  const filteredMarkets = markets.filter((market) =>
    market.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get selected market info
  const selectedMarketInfo = markets.find((m) => m.marketId === selectedMarket);
  const currentInfo = MARKET_INFO[selectedMarket as keyof typeof MARKET_INFO];

  // Market logos
  const marketLogos: Record<string, string> = {
    [MARKETS.BTC_USD]: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS19-daOGUYgkbwY70z-O4j6sk8XlLEs9od1Q&s',
    [MARKETS.ETH_USD]: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTIa3GDAlj9jCzDOu-MBV7_NRhZ4VlzN-i8pg&s',
    [MARKETS.STRK_USD]: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQyryehB1_k7vVWpfloLj_2NeOxHTmOubzNHQ&s',
    [MARKETS.SOL_USD]: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRTOOhDi1KrwwS7G_H1yvSkMoiPhO3anGP8_w&s',
    [MARKETS.BNB_USD]: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRlzPe83XrDQcclbJwYqOZy6lnAcc4FALZ6kw&s',
  };

  const formatPrice = (price: string): string => {
    const num = parseFloat(price);
    if (num >= 1000) {
      return Math.round(num).toLocaleString();
    } else if (num >= 100) {
      return num.toFixed(2);
    } else if (num >= 1) {
      return num.toFixed(3);
    } else {
      return num.toFixed(5);
    }
  };

  const formatLargeNumber = (value: string): string => {
    const num = parseFloat(value);
    return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="px-2 py-2">
      <div className="flex items-center justify-between">
        {/* Market Selector - Simple text, no box */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="market-selector-simple"
            style={{
              background: 'transparent',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            {selectedMarketInfo && currentInfo ? (
              <>
                <img
                  src={marketLogos[selectedMarket] || marketLogos[MARKETS.BTC_USD]}
                  alt={currentInfo.name}
                  className="market-selector-logo"
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
                <span className="market-selector-text">
                  {selectedMarketInfo.symbol.replace('/USD', '-USDC')}
                </span>
                <ChevronDown size={16} style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
              </>
            ) : (
              <>
                <span className="market-selector-text">Select Market</span>
                <ChevronDown size={16} style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
              </>
            )}
          </button>

          {/* Dropdown Menu */}
          {isOpen && (
            <div className="market-dropdown-menu">
              {/* Search Bar */}
              <div className="market-dropdown-search">
                <Search size={16} className="market-dropdown-search-icon" />
                <input
                  type="text"
                  placeholder="Search markets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="market-dropdown-search-input"
                  autoFocus
                />
              </div>

              {/* Market List - Static */}
              <div className="market-dropdown-list">
                {filteredMarkets.length === 0 ? (
                  <div className="market-dropdown-empty">No markets found</div>
                ) : (
                  filteredMarkets.map((market) => {
                    const isSelected = market.marketId === selectedMarket;
                    const marketInfo = MARKET_INFO[market.marketId as keyof typeof MARKET_INFO];
                    const isPositive = parseFloat(market.priceChangePercent) >= 0;
                    const displaySymbol = market.symbol.replace('/USD', '-USDC');

                    return (
                      <div
                        key={market.marketId}
                        className={`market-dropdown-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => {
                          setSelectedMarket(market.marketId);
                          setIsOpen(false);
                          setSearchQuery('');
                        }}
                      >
                        <div className="market-dropdown-item-left">
                          <div className="market-dropdown-item-logo">
                            <img
                              src={marketLogos[market.marketId] || marketLogos[MARKETS.BTC_USD]}
                              alt={marketInfo?.name || market.symbol}
                              className="w-5 h-5 rounded-full object-cover"
                              onError={(e) => {
                                const target = e.currentTarget as HTMLImageElement;
                                target.style.display = 'none';
                              }}
                            />
                          </div>
                          <div className="market-dropdown-item-info">
                            <div className="market-dropdown-item-symbol">
                              {displaySymbol}
                            </div>
                          </div>
                        </div>
                        <div className="market-dropdown-item-right">
                          <div className="market-dropdown-item-price">
                            {formatPrice(market.currentPrice)}
                          </div>
                          <div className={`market-dropdown-item-change ${isPositive ? 'positive' : 'negative'}`}>
                            {isPositive ? '+' : ''}{market.priceChangePercent}%
                          </div>
                          <div className="market-dropdown-item-volume">
                            {formatLargeNumber(market.volume24h)}
                          </div>
                          <div className="market-dropdown-item-oi">
                            {formatLargeNumber(market.openInterest)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Market Stats (Right side) */}
        {selectedMarketInfo && (
          <div className="market-stats-container">
            <div className="market-stat">
              <span className="market-stat-label">Mark</span>
              <span className="market-stat-value">{formatPrice(selectedMarketInfo.currentPrice)}</span>
            </div>
            <div className="market-stat">
              <span className="market-stat-label">Oracle</span>
              <span className="market-stat-value">
                {formatPrice((parseFloat(selectedMarketInfo.currentPrice) * 1.0004).toString())}
              </span>
            </div>
            <div className="market-stat">
              <span className="market-stat-label">24h Change</span>
              <div className="market-stat-change">
                <span className={`market-stat-change-value ${parseFloat(selectedMarketInfo.priceChangePercent) >= 0 ? 'positive' : 'negative'}`}>
                  {parseFloat(selectedMarketInfo.priceChangePercent) >= 0 ? '+' : ''}
                  {formatPrice(selectedMarketInfo.priceChange24h)}
                </span>
                <span className={`market-stat-change-separator ${parseFloat(selectedMarketInfo.priceChangePercent) >= 0 ? 'positive' : 'negative'}`}> / </span>
                <span className={`market-stat-change-percent ${parseFloat(selectedMarketInfo.priceChangePercent) >= 0 ? 'positive' : 'negative'}`}>
                  {parseFloat(selectedMarketInfo.priceChangePercent) >= 0 ? '+' : ''}
                  {selectedMarketInfo.priceChangePercent}%
                </span>
              </div>
            </div>
            <div className="market-stat">
              <span className="market-stat-label">24h Volume</span>
              <span className="market-stat-value">{formatLargeNumber(selectedMarketInfo.volume24h)}</span>
            </div>
            <div className="market-stat">
              <span className="market-stat-label">Funding / Countdown</span>
              <div className="market-stat-funding">
                <span className={`market-stat-funding-rate ${parseFloat(selectedMarketInfo.fundingRate) >= 0 ? 'positive' : 'negative'}`}>
                  {parseFloat(selectedMarketInfo.fundingRate) >= 0 ? '+' : ''}
                  {(parseFloat(selectedMarketInfo.fundingRate) * 100).toFixed(4)}%
                </span>
                <span className="market-stat-countdown">{fundingCountdown}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

