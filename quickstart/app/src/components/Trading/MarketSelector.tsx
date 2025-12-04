import { useTradingStore } from '../../stores/tradingStore';
import { MARKETS, MARKET_INFO } from '../../config/contracts';
import { useEffect, useState } from 'react';
import { fetchPythPrice } from '../../services/pythService';
import { ChevronDown } from 'lucide-react';

export function MarketSelector() {
  const selectedMarket = useTradingStore((state) => state.selectedMarket);
  const setSelectedMarket = useTradingStore((state) => state.setSelectedMarket);
  const markets = useTradingStore((state) => state.markets);
  const setMarkets = useTradingStore((state) => state.setMarkets);
  const [fundingCountdown, setFundingCountdown] = useState('00:00:00');

  const currentMarket = markets.find((m) => m.marketId === selectedMarket);

  // Mock data for 24h volume
  const mockVolume24h = 3231779581.83;
  const mockOpenInterest = 2331160196.93;
  const mockPriceChange24h = 3931;
  const mockPriceChangePercent = 4.51;
  const mockFundingRate = 0.0008;

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

  // Fetch prices from Pyth Network for all markets
  useEffect(() => {
    const fetchAllPrices = async () => {
      try {
        // Fetch prices for all supported markets
        const marketDataPromises = [
          [MARKETS.BTC_USD, 'BTC_USD'],
          [MARKETS.ETH_USD, 'ETH_USD'],
          [MARKETS.STRK_USD, 'STRK_USD'],
          [MARKETS.SOL_USD, 'SOL_USD'],
          [MARKETS.BNB_USD, 'BNB_USD'],
        ].map(async ([marketId, key]) => {
          try {
            const priceData = await fetchPythPrice(marketId);
            console.log('MarketSelector: Fetched price from Pyth:', priceData);
            
            // Ensure price is valid
            if (!priceData || !priceData.price || priceData.price <= 0 || isNaN(priceData.price)) {
              console.warn('MarketSelector: Invalid price data from Pyth:', priceData);
              throw new Error('Invalid price data');
            }
            
            const price = priceData.price.toString();
            console.log('MarketSelector: Setting price to:', price);

            return {
              marketId,
              symbol: MARKET_INFO[marketId as keyof typeof MARKET_INFO]?.symbol || key,
              currentPrice: price,
              priceChange24h: mockPriceChangePercent.toString(),
              volume24h: mockVolume24h.toString(),
              openInterest: mockOpenInterest.toString(),
            };
          } catch (error) {
            console.error('MarketSelector: Error fetching price for', marketId, error);
            // Return with a fallback price instead of '0' to help debug
            return {
              marketId,
              symbol: MARKET_INFO[marketId as keyof typeof MARKET_INFO]?.symbol || key,
              currentPrice: '0', // Will show as 0 if fetch fails
              priceChange24h: mockPriceChangePercent.toString(),
              volume24h: mockVolume24h.toString(),
              openInterest: mockOpenInterest.toString(),
            };
          }
        });

        const marketData = (await Promise.all(marketDataPromises)).filter(Boolean);
        console.log('MarketSelector: Setting markets data:', marketData);
        setMarkets(marketData);
      } catch (error) {
        console.error('Error fetching market prices:', error);
        // Set empty markets on error to prevent UI breakage
        setMarkets([]);
      }
    };

    fetchAllPrices();

    // Poll for price updates every 10 seconds
    const interval = setInterval(() => {
      fetchAllPrices();
    }, 10000);

    return () => clearInterval(interval);
  }, [setMarkets]);

  const formatPrice = (price: string | undefined): string => {
    try {
      const num = parseFloat(price || '0');
      return isNaN(num) ? '0' : Math.round(num).toLocaleString();
    } catch {
      return '0';
    }
  };

  const formatLargeNumber = (value: string | undefined): string => {
    try {
      const num = parseFloat(value || '0');
      return isNaN(num) ? '0' : num.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 });
    } catch {
      return '0';
    }
  };

  return (
    <div className="px-2 py-2">
      <div className="flex items-center justify-between">
        {/* Market Selector Button - Standalone */}
        {(() => {
          const marketId = selectedMarket || MARKETS.BTC_USD;
          const info = MARKET_INFO[marketId as keyof typeof MARKET_INFO];
          if (!info) return null;

          // Get logo image URL based on market
          const marketLogos: Record<string, string> = {
            [MARKETS.BTC_USD]: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
            [MARKETS.ETH_USD]: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTIa3GDAlj9jCzDOu-MBV7_NRhZ4VlzN-i8pg&s',
            [MARKETS.STRK_USD]: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQyryehB1_k7vVWpfloLj_2NeOxHTmOubzNHQ&s',
            [MARKETS.SOL_USD]: 'https://images.seeklogo.com/logo-png/42/2/solana-sol-logo-png_seeklogo-423095.png',
            [MARKETS.BNB_USD]: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRlzPe83XrDQcclbJwYqOZy6lnAcc4FALZ6kw&s',
          };

          const logoUrl = marketLogos[marketId] || marketLogos[MARKETS.BTC_USD];
          const displaySymbol = info.symbol.replace('/USD', '-USDC');
          
          // Fallback colors and symbols for when images fail to load
          const fallbackColors: Record<string, string> = {
            [MARKETS.BTC_USD]: '#f7931a',
            [MARKETS.ETH_USD]: '#627EEA',
            [MARKETS.STRK_USD]: '#50d2c1',
            [MARKETS.SOL_USD]: '#14F195',
            [MARKETS.BNB_USD]: '#F3BA2F',
          };

          const fallbackSymbols: Record<string, string> = {
            [MARKETS.BTC_USD]: '₿',
            [MARKETS.ETH_USD]: 'Ξ',
            [MARKETS.STRK_USD]: 'S',
            [MARKETS.SOL_USD]: '◎',
            [MARKETS.BNB_USD]: 'B',
          };

          const fallbackColor = fallbackColors[marketId as keyof typeof fallbackColors] || '#50d2c1';
          const fallbackSymbol = fallbackSymbols[marketId as keyof typeof fallbackSymbols] || '?';

          return (
            <button
              onClick={() => {
                // Show dropdown or cycle through markets
                const allMarkets = [MARKETS.BTC_USD, MARKETS.ETH_USD, MARKETS.STRK_USD, MARKETS.SOL_USD, MARKETS.BNB_USD] as const;
                const currentIndex = allMarkets.indexOf(marketId as typeof MARKETS.BTC_USD);
                const nextIndex = (currentIndex + 1) % allMarkets.length;
                setSelectedMarket(allMarkets[nextIndex]);
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all group"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: 'none',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
              }}
            >
              {/* Market Logo Image */}
              <div className="relative w-6 h-6">
                <img 
                  src={logoUrl}
                  alt={info.name}
                  className="w-6 h-6 rounded-full object-cover"
                  style={{
                    backgroundColor: fallbackColor,
                    display: 'block',
                  }}
                  onError={(e) => {
                    // Fallback to colored circle with symbol if image fails to load
                    const target = e.currentTarget as HTMLImageElement;
                    target.style.display = 'none';
                    // Check if fallback already exists
                    const parent = target.parentElement;
                    if (parent && !parent.querySelector('.logo-fallback')) {
                      const fallback = document.createElement('div');
                      fallback.className = 'logo-fallback w-6 h-6 rounded-full flex items-center justify-center';
                      fallback.style.backgroundColor = fallbackColor;
                      fallback.innerHTML = `<span class="text-white text-xs font-bold">${fallbackSymbol}</span>`;
                      parent.appendChild(fallback);
                    }
                  }}
                />
              </div>
              <span className="text-sm font-semibold text-white">{displaySymbol}</span>
              <ChevronDown size={14} className="text-white/70 group-hover:text-white transition-colors" />
            </button>
          );
        })()}

        {/* Right: Market Stats */}
        {currentMarket ? (
            <div className="flex items-center gap-10 text-xs">
              <div className="flex flex-col">
                <span className="text-white/50 text-[10px] mb-1 underline">Mark</span>
                <span className="text-white font-semibold text-base">
                  {currentMarket.currentPrice && parseFloat(currentMarket.currentPrice) > 0
                    ? formatPrice(currentMarket.currentPrice)
                    : 'Loading...'}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-white/50 text-[10px] mb-1 underline">Oracle</span>
                <span className="text-white font-semibold text-base">
                  {(() => {
                    if (!currentMarket.currentPrice || parseFloat(currentMarket.currentPrice) <= 0) {
                      return 'Loading...';
                    }
                    const markPrice = parseFloat(currentMarket.currentPrice);
                    // Oracle price is slightly different (like in the image: Mark 91,168 vs Oracle 91,206)
                    const oraclePrice = markPrice + (markPrice * 0.0004); // ~0.04% difference
                    return formatPrice(oraclePrice.toString());
                  })()}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-white/50 text-[10px] mb-1">24h Change</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[#22c55e] font-semibold text-base">
                    +{mockPriceChange24h.toLocaleString()}
                  </span>
                  <span className="text-[#22c55e] font-semibold text-base">
                    +{mockPriceChangePercent.toFixed(2)}%
                  </span>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-white/50 text-[10px] mb-1">24h Volume</span>
                <span className="text-white font-semibold text-base">
                  ${formatLargeNumber(currentMarket.volume24h)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-white/50 text-[10px] mb-1 underline">Open Interest</span>
                <span className="text-white font-semibold text-base">
                  ${formatLargeNumber(currentMarket.openInterest)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-white/50 text-[10px] mb-1 underline">Funding / Countdown</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[#ef4444] font-semibold text-base">
                    -{Math.abs(mockFundingRate * 100).toFixed(4)}%
                  </span>
                  <span className="text-white/70 font-semibold text-sm">
                    {fundingCountdown}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-10 text-xs">
              <div className="flex flex-col">
                <span className="text-white/50 text-[10px] mb-1 underline">Mark</span>
                <span className="text-white font-semibold text-base">Loading...</span>
              </div>
              <div className="flex flex-col">
                <span className="text-white/50 text-[10px] mb-1 underline">Oracle</span>
                <span className="text-white font-semibold text-base">Loading...</span>
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
