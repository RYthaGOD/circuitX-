import { useTradingStore } from '../../stores/tradingStore';
import { MARKETS, MARKET_INFO } from '../../config/contracts';
import { useEffect } from 'react';
import { fetchPythPrice } from '../../services/pythService';

export function MarketSelector() {
  const selectedMarket = useTradingStore((state) => state.selectedMarket);
  const setSelectedMarket = useTradingStore((state) => state.setSelectedMarket);
  const markets = useTradingStore((state) => state.markets);
  const setMarkets = useTradingStore((state) => state.setMarkets);
  const updateMarketPrice = useTradingStore((state) => state.updateMarketPrice);

  const currentMarket = markets.find((m) => m.marketId === selectedMarket);

  // Fetch prices from Pyth Network - only BTC/USD for now
  useEffect(() => {
    const fetchAllPrices = async () => {
      try {
        // Only fetch BTC/USD
        const marketDataPromises = [[MARKETS.BTC_USD, 'BTC_USD']].map(async ([marketId, key]) => {
          try {
            const priceData = await fetchPythPrice();
            const price = priceData.price.toString();

            return {
              marketId,
              symbol: MARKET_INFO[marketId as keyof typeof MARKET_INFO]?.symbol || key,
              currentPrice: price,
              priceChange24h: '0', // TODO: Calculate from historical data
              volume24h: '0', // Not available from Pyth free tier
              openInterest: '0', // Not available from Pyth free tier
            };
          } catch (error) {
            // Silently handle errors and return default data
            return {
              marketId,
              symbol: MARKET_INFO[marketId as keyof typeof MARKET_INFO]?.symbol || key,
              currentPrice: '0',
              priceChange24h: '0',
              volume24h: '0',
              openInterest: '0',
            };
          }
        });

        const marketData = (await Promise.all(marketDataPromises)).filter(Boolean);
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

  return (
    <div className="flex items-center justify-between px-2 py-1.5 border-b border-[rgba(255,255,255,0.1)] bg-[#0f1a1f]">
      {/* Market Selector - Only BTC/USD for now */}
      <div className="flex items-center gap-2">
        {[MARKETS.BTC_USD].map((marketId) => {
          const info = MARKET_INFO[marketId as keyof typeof MARKET_INFO];
          if (!info) return null;

          const isSelected = selectedMarket === marketId;

          return (
            <button
              key={marketId}
              onClick={() => setSelectedMarket(marketId)}
              className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                isSelected
                  ? 'bg-[#50d2c1]/20 text-[#50d2c1]'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              {info.symbol}
            </button>
          );
        })}
      </div>

      {/* Market Stats */}
      {currentMarket && currentMarket.currentPrice && (
        <div className="flex items-center gap-6 text-xs">
          <div>
            <span className="text-white/50">Mark: </span>
            <span className="text-white font-medium">
              {(() => {
                try {
                  const price = parseFloat(currentMarket.currentPrice || '0');
                  return isNaN(price) ? '0' : price.toLocaleString(undefined, { maximumFractionDigits: 2 });
                } catch {
                  return '0';
                }
              })()}
            </span>
          </div>
          <div>
            <span className="text-white/50">Oracle: </span>
            <span className="text-white font-medium">
              {(() => {
                try {
                  const price = parseFloat(currentMarket.currentPrice || '0');
                  return isNaN(price) ? '0' : price.toLocaleString(undefined, { maximumFractionDigits: 2 });
                } catch {
                  return '0';
                }
              })()}
            </span>
          </div>
          <div>
            <span className="text-white/50">24h Change: </span>
            <span className="text-[#50d2c1] font-medium">
              +{(() => {
                try {
                  const change = parseFloat(currentMarket.priceChange24h || '0');
                  return isNaN(change) ? '0.00' : change.toFixed(2);
                } catch {
                  return '0.00';
                }
              })()}%
            </span>
          </div>
          <div>
            <span className="text-white/50">24h Volume: </span>
            <span className="text-white font-medium">
              ${(() => {
                try {
                  const volume = parseFloat(currentMarket.volume24h || '0');
                  return isNaN(volume) ? '0' : volume.toLocaleString(undefined, { maximumFractionDigits: 0 });
                } catch {
                  return '0';
                }
              })()}
            </span>
          </div>
          <div>
            <span className="text-white/50">Open Interest: </span>
            <span className="text-white font-medium">
              ${(() => {
                try {
                  const oi = parseFloat(currentMarket.openInterest || '0');
                  return isNaN(oi) ? '0' : oi.toLocaleString(undefined, { maximumFractionDigits: 0 });
                } catch {
                  return '0';
                }
              })()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
