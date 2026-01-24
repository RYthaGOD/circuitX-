import { useEffect, useRef, useState } from 'react';
import { 
  createChart, 
  IChartApi, 
  ISeriesApi, 
  CandlestickData, 
  CandlestickSeries
} from 'lightweight-charts';
import { useTradingStore } from '../../stores/tradingStore';
import { fetchPythHistoricalData, fetchPythPrice } from '../../services/pythService';
import { MARKETS, MARKET_INFO } from '../../config/contracts';
import { Loader2 } from 'lucide-react';

export function PriceChart() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const selectedMarket = useTradingStore((state) => state.selectedMarket);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _setSelectedMarket = useTradingStore((state) => state.setSelectedMarket);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize chart (exact match to uniperp)
  useEffect(() => {
    if (!chartContainerRef.current || chartRef.current) return;

    const container = chartContainerRef.current;

    // Create chart (exact match to uniperp)
    let chart: IChartApi;
    try {
      chart = createChart(container, {
        autoSize: true,
        layout: {
          background: { 
            color: '#0f1a1f', // Dark background
          },
          textColor: '#d1d4dc',
          fontSize: 11,
        },
        grid: {
          vertLines: { 
            color: '#1e222d',
            style: 1, // Dotted
          },
          horzLines: { 
            color: '#1e222d',
            style: 1, // Dotted
          },
        },
        timeScale: {
          timeVisible: true,
          secondsVisible: false,
          borderColor: '#363a45',
        },
        rightPriceScale: {
          borderColor: '#363a45',
          scaleMargins: {
            top: 0.1,
            bottom: 0.1,
          },
        },
        crosshair: {
          mode: 0,
          vertLine: {
            color: '#758696',
            width: 1,
            style: 1, // Dotted
            labelBackgroundColor: '#131722',
          },
          horzLine: {
            color: '#758696',
            width: 1,
            style: 1, // Dotted
            labelBackgroundColor: '#131722',
          },
        },
      });
    } catch (error) {
      console.error('Error creating chart:', error);
      setError('Failed to initialize chart');
      return;
    }

    // Create candlestick series (Hyperliquid/TradingView style)
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#26a69a', // Teal for bullish candles (like Hyperliquid)
      downColor: '#ef5350', // Red for bearish candles
      borderUpColor: '#26a69a',
      borderDownColor: '#ef5350',
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
      borderVisible: false, // No border for cleaner look
    });

    // Set initial data - will be updated with real data (matching uniperp pattern)
    const initialData = [
      {
        time: (Math.floor(Date.now() / 1000) - 3600) as any,
        open: 4000,
        high: 4020,
        low: 3980,
        close: 4010,
      },
      {
        time: (Math.floor(Date.now() / 1000) - 1800) as any,
        open: 4010,
        high: 4025,
        low: 3995,
        close: 4015,
      },
      {
        time: Math.floor(Date.now() / 1000) as any,
        open: 4015,
        high: 4030,
        low: 4000,
        close: 4010,
      },
    ];
    candlestickSeries.setData(initialData);

    chartRef.current = chart;
    seriesRef.current = candlestickSeries;

    // Note: With autoSize: true, the chart handles resize automatically
    // No need for manual resize handler

    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        seriesRef.current = null;
      }
    };
  }, []);

  // Load price data when market changes
  useEffect(() => {
    if (!selectedMarket || !seriesRef.current) {
      // Set empty data if no market selected
      if (seriesRef.current) {
        try {
          seriesRef.current.setData([]);
        } catch (e) {
          // Ignore errors
        }
      }
      return;
    }

    const loadPriceData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch historical candlestick data (last 100 entries, 1 hour interval)
        // Pyth service will fetch current price internally for synthetic data generation
        const historical = await fetchPythHistoricalData('1h', 100, selectedMarket);

        // Check if we have valid data
        if (!historical || !historical.prices || historical.prices.length === 0) {
          throw new Error('No historical data available');
        }

        // Use OHLC data from Pyth (already formatted as numbers)
        let candlestickData: CandlestickData[] = [];
        
        if (historical.ohlc && historical.ohlc.length > 0) {
          // Use OHLC data from Pyth
          candlestickData = historical.ohlc
            .map((candle) => {
              try {
                // Use Unix timestamp in seconds (matching uniperp's pattern)
                // uniperp uses: time: (Math.floor(Date.now() / 1000) - 3600) as any
                const timeValue = (candle.time as number) as any;

                return {
                  time: timeValue,
                  open: candle.open,
                  high: candle.high,
                  low: candle.low,
                  close: candle.close,
                };
              } catch (e) {
                console.error('Error formatting candle:', e);
                return null;
              }
            })
            .filter((item): item is CandlestickData => item !== null);
        } else if (historical.prices && historical.prices.length > 0) {
          // Fallback: create synthetic OHLC from prices
          candlestickData = historical.prices
            .map((price, index) => {
              try {
                const timestamp = historical.timestamps[index];

                if (!timestamp || isNaN(timestamp)) {
                  return null;
                }

                // Use Unix timestamp in seconds, cast to any (matching uniperp's pattern)
                const timeValue = timestamp as any;
                const variation = price * 0.01; // 1% variation for candles
                return {
                  time: timeValue,
                  open: price - variation * (0.3 + Math.random() * 0.2),
                  high: price + variation * (0.3 + Math.random() * 0.4),
                  low: price - variation * (0.3 + Math.random() * 0.4),
                  close: price,
                };
              } catch (e) {
                return null;
              }
            })
            .filter((item): item is CandlestickData => item !== null);
        }
        
        // Sort by time in ascending order (oldest first)
        candlestickData.sort((a, b) => {
          const timeA = typeof a.time === 'number' ? a.time : new Date(a.time as string).getTime() / 1000;
          const timeB = typeof b.time === 'number' ? b.time : new Date(b.time as string).getTime() / 1000;
          return timeA - timeB;
        });

        // Set data (matching uniperp pattern)
        if (candlestickData.length > 0 && seriesRef.current) {
          console.log("Setting candlestick data:", candlestickData);
          seriesRef.current.setData(candlestickData);
          if (chartRef.current) {
            chartRef.current.timeScale().fitContent();
          }
        } else if (seriesRef.current) {
          // Fallback: use current price to create simple data (matching uniperp fallback pattern)
          const currentPriceData = await fetchPythPrice(selectedMarket);
          const currentPrice = currentPriceData.price;
          const fallbackData = [
            {
              time: (Math.floor(Date.now() / 1000) - 3600) as any,
              open: currentPrice * 0.995,
              high: currentPrice * 1.005,
              low: currentPrice * 0.99,
              close: currentPrice * 0.998,
            },
            {
              time: (Math.floor(Date.now() / 1000) - 1800) as any,
              open: currentPrice * 0.998,
              high: currentPrice * 1.002,
              low: currentPrice * 0.996,
              close: currentPrice * 1.001,
            },
            {
              time: Math.floor(Date.now() / 1000) as any,
              open: currentPrice * 1.001,
              high: currentPrice * 1.003,
              low: currentPrice * 0.999,
              close: currentPrice,
            },
          ];
          console.log("Setting fallback data:", fallbackData);
          seriesRef.current.setData(fallbackData);
          if (chartRef.current) {
            chartRef.current.timeScale().fitContent();
          }
        }

        setIsLoading(false);
      } catch (err: any) {
        console.error('Error loading price data:', err);
        setError(err.message || 'Failed to load price data');
        setIsLoading(false);
        
        // Set empty data to prevent chart crash
        if (seriesRef.current) {
          try {
            seriesRef.current.setData([]);
          } catch (chartError) {
            console.error('Error setting empty chart data:', chartError);
          }
        }
      }
    };

    loadPriceData();

    // Poll for updates every 30 seconds
    const interval = setInterval(() => {
      loadPriceData();
    }, 30000);

    return () => clearInterval(interval);
  }, [selectedMarket]);

  // Available markets
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _availableMarkets = [
    MARKETS.BTC_USD,
    MARKETS.ETH_USD,
    MARKETS.STRK_USD,
    MARKETS.SOL_USD,
    MARKETS.BNB_USD,
  ];

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _currentMarketInfo = MARKET_INFO[selectedMarket as keyof typeof MARKET_INFO];

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: '#0f1a1f' }}>
      {/* Chart Controls - Minimal header */}
      <div className="flex items-center justify-end px-2 py-1 border-b" style={{ borderColor: '#2b2b43' }}>
        {isLoading && (
          <div className="flex items-center gap-2" style={{ color: '#758696' }}>
            <Loader2 size={12} className="animate-spin" />
            <span className="text-xs">Loading...</span>
          </div>
        )}
      </div>

      {error && (
        <div className="mx-4 mt-2 p-2 rounded text-xs" style={{ 
          backgroundColor: '#2d1b1b',
          border: '1px solid #ef5350',
          color: '#ef5350',
        }}>
          {error}
        </div>
      )}

      <div 
        ref={chartContainerRef} 
        className="flex-1 min-h-0 w-full" 
        style={{ backgroundColor: '#0f1a1f' }}
      />
    </div>
  );
}

