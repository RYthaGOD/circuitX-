import { MarketSelector } from './MarketSelector';
import { OrderForm } from './OrderForm';
import { PositionCard } from './PositionCard';
import { PriceChart } from './PriceChart';
import { useTradingStore } from '../../stores/tradingStore';
import { Header } from '../Layout/Header';
import { useState } from 'react';

export function TradingInterface() {
  const positions = useTradingStore((state) => state.positions);
  const [activeTab, setActiveTab] = useState<'orderbook' | 'trades'>('orderbook');

  return (
    <div className="min-h-screen bg-[#0f1a1f] text-white">
      <Header />
      
      <div className="flex h-[calc(100vh-48px)]">
        {/* Left: Chart Area with Positions Below */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Market Info Bar */}
          <MarketSelector />
          
          {/* Chart - Fixed Height */}
          <div className="flex-1 overflow-hidden" style={{ minHeight: '60vh' }}>
            <PriceChart />
          </div>

          {/* Positions Panel - Below Chart, Scrollable */}
          <div className="border-t border-[rgba(255,255,255,0.1)] p-3 overflow-y-auto" style={{ maxHeight: '40vh' }}>
            <div className="text-xs font-medium mb-2">Positions</div>
            {positions.length === 0 ? (
              <div className="text-xs text-white/50 text-center py-4">
                No open positions
              </div>
            ) : (
              <div className="space-y-2">
                {positions.map((position) => (
                  <PositionCard key={position.commitment} position={position} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Middle: Order Book / Trades */}
        <div className="w-72 border-l border-r border-[rgba(255,255,255,0.1)] flex flex-col">
          {/* Order Book / Trades Tabs */}
          <div className="flex border-b border-[rgba(255,255,255,0.1)]">
            <button 
              onClick={() => setActiveTab('orderbook')}
              className={`flex-1 px-2 py-1.5 text-xs font-medium transition-colors ${
                activeTab === 'orderbook'
                  ? 'text-[#50d2c1] border-b-2 border-[#50d2c1]'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Order Book
            </button>
            <button 
              onClick={() => setActiveTab('trades')}
              className={`flex-1 px-2 py-1.5 text-xs font-medium transition-colors ${
                activeTab === 'trades'
                  ? 'text-[#50d2c1] border-b-2 border-[#50d2c1]'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Trades
            </button>
          </div>

          {/* Order Book / Trades Content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'orderbook' ? (
              <div className="p-1">
                <div className="text-xs text-white/50 mb-1 flex justify-between px-1">
                  <span>Price</span>
                  <span>Size</span>
                  <span>Total</span>
                </div>
                {/* Sell Orders */}
                <div className="space-y-0.5 mb-1">
                  {[90.204, 90.203, 90.202, 90.201, 90.200, 90.199, 90.198, 90.197].map((price, i) => (
                    <div key={i} className="flex justify-between text-xs hover:bg-white/5 px-1 py-0.5 rounded">
                      <span className="text-red-400">{price.toFixed(3)}</span>
                      <span className="text-white/70">{(Math.random() * 5).toFixed(5)}</span>
                      <span className="text-white/50">{(Math.random() * 10).toFixed(5)}</span>
                    </div>
                  ))}
                </div>
                {/* Current Price */}
                <div className="flex justify-between text-xs font-medium py-0.5 border-y border-[rgba(255,255,255,0.1)] my-0.5 px-1">
                  <span className="text-[#50d2c1]">90.196</span>
                  <span className="text-white/70">0.00000</span>
                  <span className="text-white/50">0.00000</span>
                </div>
                {/* Buy Orders */}
                <div className="space-y-0.5">
                  {[90.195, 90.194, 90.193, 90.192, 90.191, 90.190, 90.189, 90.188].map((price, i) => (
                    <div key={i} className="flex justify-between text-xs hover:bg-white/5 px-1 py-0.5 rounded">
                      <span className="text-green-400">{price.toFixed(3)}</span>
                      <span className="text-white/70">{(Math.random() * 5).toFixed(5)}</span>
                      <span className="text-white/50">{(Math.random() * 10).toFixed(5)}</span>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-white/50 mt-1 text-center">
                  Spread 1 0.001%
                </div>
              </div>
            ) : (
              <div className="p-1">
                <div className="text-xs text-white/50 mb-1 flex justify-between px-1">
                  <span>Price</span>
                  <span>Size</span>
                  <span>Time</span>
                </div>
                <div className="space-y-0.5">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <div key={i} className="flex justify-between text-xs hover:bg-white/5 px-1 py-0.5 rounded">
                      <span className={Math.random() > 0.5 ? 'text-green-400' : 'text-red-400'}>
                        {(90.190 + Math.random() * 0.02).toFixed(3)}
                      </span>
                      <span className="text-white/70">{(Math.random() * 2).toFixed(5)}</span>
                      <span className="text-white/50">12:34:56</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Trading Panel - 70% of device height */}
        <div className="w-80 flex flex-col border-l border-[rgba(255,255,255,0.1)]" style={{ height: '70vh' }}>
          <div className="flex-1 overflow-y-auto p-3">
            <OrderForm />
          </div>
        </div>
      </div>
    </div>
  );
}

