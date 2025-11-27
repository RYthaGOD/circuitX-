import { useState } from 'react';
import { useTradingStore } from '../../stores/tradingStore';
import { ArrowUp, ArrowDown, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

export function OrderForm() {
  const {
    orderType,
    orderSide,
    orderSize,
    orderPrice,
    collateral,
    setOrderType,
    setOrderSide,
    setOrderSize,
    setOrderPrice,
    setCollateral,
    resetOrderForm,
    isZtarknetReady,
    ztarknetAccount,
  } = useTradingStore();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [marginMode, setMarginMode] = useState<'cross' | 'isolated'>('cross');
  const [leverage, setLeverage] = useState<string>('20x');
  const [positionMode, setPositionMode] = useState<'one-way' | 'hedge'>('one-way');
  const [sizePercent, setSizePercent] = useState<number>(0);
  const [reduceOnly, setReduceOnly] = useState(false);
  const [takeProfitStopLoss, setTakeProfitStopLoss] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isZtarknetReady || !ztarknetAccount) {
      toast.error('Please set up your Ztarknet trading wallet first');
      return;
    }
    
    if (!orderSize || parseFloat(orderSize) <= 0) {
      toast.error('Please enter a valid order size');
      return;
    }

    if (orderType === 'limit' && (!orderPrice || parseFloat(orderPrice) <= 0)) {
      toast.error('Please enter a valid limit price');
      return;
    }

    if (!collateral || parseFloat(collateral) <= 0) {
      toast.error('Please enter collateral amount');
      return;
    }

    setIsSubmitting(true);
    toast.info('Generating proof and submitting order...');

    try {
      // TODO: Generate proof here
      // TODO: Call usePerpRouter().openPosition()
      
      toast.success('Order submitted successfully!');
      resetOrderForm();
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSizePercentChange = (percent: number) => {
    setSizePercent(percent);
    // Calculate size based on available balance (mock for now)
    const availableBalance = 0; // TODO: Get from store
    if (availableBalance > 0) {
      const calculatedSize = (availableBalance * percent) / 100;
      setOrderSize(calculatedSize.toFixed(4));
    }
  };

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Top Controls: Cross, 20x, One-Way */}
      <div className="flex gap-1 pb-2 border-b border-[rgba(255,255,255,0.1)]">
        <button
          onClick={() => setMarginMode('cross')}
          className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
            marginMode === 'cross'
              ? 'bg-white/10 text-white'
              : 'bg-white/5 text-white/70 hover:text-white hover:bg-white/10'
          }`}
        >
          Cross
        </button>
        <button
          onClick={() => setLeverage('20x')}
          className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
            leverage === '20x'
              ? 'bg-white/10 text-white'
              : 'bg-white/5 text-white/70 hover:text-white hover:bg-white/10'
          }`}
        >
          20x
        </button>
        <button
          onClick={() => setPositionMode('one-way')}
          className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
            positionMode === 'one-way'
              ? 'bg-white/10 text-white'
              : 'bg-white/5 text-white/70 hover:text-white hover:bg-white/10'
          }`}
        >
          One-Way
        </button>
      </div>

      {/* Order Type Tabs */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setOrderType('market')}
          className={`px-1 py-1 text-xs font-medium transition-all ${
            orderType === 'market'
              ? 'text-[#50d2c1] border-b border-[#50d2c1]'
              : 'text-white/70 hover:text-white'
          }`}
        >
          Market
        </button>
        <button
          onClick={() => setOrderType('limit')}
          className={`px-1 py-1 text-xs font-medium transition-all ${
            orderType === 'limit'
              ? 'text-[#50d2c1] border-b border-[#50d2c1]'
              : 'text-white/70 hover:text-white'
          }`}
        >
          Limit
        </button>
        <button className="px-1 py-1 text-xs font-medium text-white/70 hover:text-white flex items-center gap-1">
          Pro
          <ChevronDown size={12} />
        </button>
      </div>

      {/* Long/Short Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setOrderSide('long')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-3 rounded text-xs font-medium transition-all ${
            orderSide === 'long'
              ? 'bg-[#50d2c1] text-[#0f1a1f]'
              : 'bg-white/5 text-white/70 hover:text-white hover:bg-white/10'
          }`}
        >
          <ArrowUp size={14} />
          Buy / Long
        </button>
        <button
          onClick={() => setOrderSide('short')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-3 rounded text-xs font-medium transition-all ${
            orderSide === 'short'
              ? 'bg-red-500 text-white'
              : 'bg-white/5 text-white/70 hover:text-white hover:bg-white/10'
          }`}
        >
          <ArrowDown size={14} />
          Sell / Short
        </button>
      </div>

      {/* Account Info */}
      <div className="text-xs text-white/50 space-y-1">
        <div className="flex justify-between">
          <span>Available to Trade:</span>
          <span>0.00 USDC</span>
        </div>
        <div className="flex justify-between">
          <span>Current Position:</span>
          <span>0.00000 BTC</span>
        </div>
      </div>

      {/* Order Form */}
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col space-y-3">
        {/* Size Input */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-xs text-white/70">Size</label>
            <button
              type="button"
              className="text-xs text-white/70 hover:text-white flex items-center gap-1 px-2 py-0.5 rounded hover:bg-white/5"
            >
              BTC
              <ChevronDown size={10} />
            </button>
          </div>
          <input
            type="number"
            step="0.0001"
            value={orderSize}
            onChange={(e) => setOrderSize(e.target.value)}
            placeholder="0.00"
            className="w-full px-2.5 py-2 bg-white/5 border border-white/10 rounded text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#50d2c1]/50"
            required
          />
        </div>

        {/* Size Slider and Percentage */}
        <div className="space-y-1.5">
          <div className="relative">
            <input
              type="range"
              min="0"
              max="100"
              value={sizePercent}
              onChange={(e) => handleSizePercentChange(Number(e.target.value))}
              className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, #50d2c1 0%, #50d2c1 ${sizePercent}%, rgba(255,255,255,0.1) ${sizePercent}%, rgba(255,255,255,0.1) 100%)`
              }}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              max="100"
              value={sizePercent}
              onChange={(e) => handleSizePercentChange(Number(e.target.value))}
              className="w-16 px-1.5 py-1 bg-white/5 border border-white/10 rounded text-xs text-white focus:outline-none focus:border-[#50d2c1]/50"
            />
            <span className="text-xs text-white/50">%</span>
          </div>
        </div>

        {/* Checkboxes */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={reduceOnly}
              onChange={(e) => setReduceOnly(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-white/20 bg-white/5 text-[#50d2c1] focus:ring-[#50d2c1] focus:ring-offset-0"
            />
            <span className="text-xs text-white/70">Reduce Only</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={takeProfitStopLoss}
              onChange={(e) => setTakeProfitStopLoss(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-white/20 bg-white/5 text-[#50d2c1] focus:ring-[#50d2c1] focus:ring-offset-0"
            />
            <span className="text-xs text-white/70">Take Profit / Stop Loss</span>
          </label>
        </div>

        {/* Connect/Submit Button */}
        {!isZtarknetReady || !ztarknetAccount ? (
          <button
            type="button"
            onClick={() => toast.info('Please connect your wallet first')}
            className="w-full py-3 rounded text-xs font-medium transition-all bg-[#50d2c1] hover:bg-[#50d2c1]/90 text-[#0f1a1f] mt-auto"
          >
            Connect
          </button>
        ) : (
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-3 rounded text-xs font-medium transition-all mt-auto ${
              orderSide === 'long'
                ? 'bg-[#50d2c1] hover:bg-[#50d2c1]/90 text-[#0f1a1f]'
                : 'bg-red-500 hover:bg-red-600 text-white'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isSubmitting ? 'Submitting...' : `${orderSide === 'long' ? 'Buy' : 'Sell'} ${orderType === 'market' ? 'Market' : 'Limit'}`}
          </button>
        )}

        {/* Trade Information */}
        <div className="space-y-1.5 pt-2 border-t border-white/10 mt-auto">
          <div className="flex justify-between text-xs">
            <span className="text-white/50">Liquidation Price</span>
            <span className="text-white/70">N/A</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-white/50">Order Value</span>
            <span className="text-white/70">N/A</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-white/50">Slippage</span>
            <span className="text-white/70">Est: 0% / Max: 8.00%</span>
          </div>
        </div>
      </form>
    </div>
  );
}

