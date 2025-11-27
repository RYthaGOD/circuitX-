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
    <div className="bg-[#0f1a1f] rounded border border-[rgba(255,255,255,0.1)] p-3 flex flex-col">
      {/* Top Controls: Cross, 20x, One-Way - Centered with equal padding, smaller buttons and text */}
      <div className="flex justify-center gap-1 pt-8">
        <button
          onClick={() => setMarginMode('cross')}
          className={`px-1 py-0.5 rounded-full text-[8px] font-extralight transition-all ${
            marginMode === 'cross'
              ? 'bg-white/10 text-white'
              : 'bg-white/5 text-white/70 hover:text-white hover:bg-white/10'
          }`}
        >
          Cross
        </button>
        <button
          onClick={() => setLeverage('20x')}
          className={`px-1 py-0.5 rounded-full text-[8px] font-extralight transition-all ${
            leverage === '20x'
              ? 'bg-white/10 text-white'
              : 'bg-white/5 text-white/70 hover:text-white hover:bg-white/10'
          }`}
        >
          20x
        </button>
        <button
          onClick={() => setPositionMode('one-way')}
          className={`px-1 py-0.5 rounded-full text-[8px] font-extralight transition-all ${
            positionMode === 'one-way'
              ? 'bg-white/10 text-white'
              : 'bg-white/5 text-white/70 hover:text-white hover:bg-white/10'
          }`}
        >
          One-Way
        </button>
      </div>

      {/* Order Type Tabs: Market, Limit, TWAP - Smaller text, light font, underline for active */}
      <div className="flex items-center justify-center gap-2" style={{ paddingTop: '7px', paddingBottom: '7px' }}>
        <button
          onClick={() => setOrderType('market')}
          className={`px-1 py-0.5 text-[5px] font-extralight transition-all ${
            orderType === 'market'
              ? 'text-[#50d2c1] border-b border-[#50d2c1]'
              : 'text-white/70 hover:text-white'
          }`}
        >
          Market
        </button>
        <button
          onClick={() => setOrderType('limit')}
          className={`px-1 py-0.5 text-[5px] font-extralight transition-all ${
            orderType === 'limit'
              ? 'text-[#50d2c1] border-b border-[#50d2c1]'
              : 'text-white/70 hover:text-white'
          }`}
        >
          Limit
        </button>
        <button 
          onClick={() => setOrderType('twap')}
          className={`px-1 py-0.5 text-[5px] font-extralight flex items-center gap-0.5 transition-all ${
            orderType === 'twap'
              ? 'text-[#50d2c1] border-b border-[#50d2c1]'
              : 'text-white/70 hover:text-white'
          }`}
        >
          TWAP
        </button>
      </div>

      {/* Long/Short Toggle - Sliding switch effect */}
      <div className="relative flex gap-0.5 p-0.5 bg-white/5 rounded-4xl" style={{ marginTop: '8px' }}>
        <button
          onClick={() => setOrderSide('long')}
          className={`relative flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-4xl text-[7px] font-extralight transition-all z-10 ${
            orderSide === 'long'
              ? 'text-[#0f1a1f]'
              : 'text-white/70 hover:text-white'
          }`}
        >
          <ArrowUp size={12} />
          Buy / Long
        </button>
        <button
          onClick={() => setOrderSide('short')}
          className={`relative flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-4xl text-[7px] font-extralight transition-all z-10 ${
            orderSide === 'short'
              ? 'text-white'
              : 'text-white/70 hover:text-white'
          }`}
        >
          <ArrowDown size={12} />
          Sell / Short
        </button>
        {/* Sliding background */}
        <div
          className={`absolute top-0.5 bottom-0.5 w-[calc(50%-0.25rem)] rounded transition-all duration-200 ${
            orderSide === 'long'
              ? 'left-0.5 bg-[#50d2c1]'
              : 'left-[calc(50%+0.25rem)] bg-red-500'
          }`}
        />
      </div>

      {/* Account Info */}
      <div className="text-[12px] text-white/50 space-y-0.5" style={{ paddingTop: '8px', paddingBottom: '8px' }}>
        <div className="flex justify-between">
          <span>Available to Trade:</span>
          <span>0.00 yUSD</span>
        </div>
        <div className="flex pt-4 justify-between">
          <span>Current Position:</span>
          <span>0.000 BTC</span>
        </div>
      </div>

      {/* Order Form */}
      <form onSubmit={handleSubmit} className="flex flex-col space-y-2 min-h-0" style={{ paddingTop: '15px', paddingBottom: '15px' }}>
        {/* Size Input - Label and dropdown INSIDE the input */}
        <div className="relative">
          <input
            type="number"
            step="0.0001"
            value={orderSize}
            onChange={(e) => setOrderSize(e.target.value)}
            placeholder="0.00"
            className="w-full pl-12 pr-16 bg-white/5 border border-white/10 rounded text-[9px] font-extralight text-white placeholder-white/30 focus:outline-none focus:border-[#50d2c1]/50"
            style={{ height: '48px', paddingTop: '12px', paddingBottom: '12px' }}
            required
          />
          {/* Size label inside input on left */}
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-extralight text-white/70 pointer-events-none">
            Size
          </span>
          {/* BTC dropdown inside input on right */}
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-extralight text-white/70 hover:text-white flex items-center gap-0.5 px-1 py-0.5 rounded hover:bg-white/5"
          >
            BTC
            <ChevronDown size={8} />
          </button>
        </div>

        {/* Size Slider and Percentage */}
        <div className="space-y-1">
          <div className="relative">
            <input
              type="range"
              min="0"
              max="100"
              value={sizePercent}
              onChange={(e) => handleSizePercentChange(Number(e.target.value))}
              className="w-full h-0.5 bg-white/10 rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, #50d2c1 0%, #50d2c1 ${sizePercent}%, rgba(255,255,255,0.1) ${sizePercent}%, rgba(255,255,255,0.1) 100%)`
              }}
            />
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min="0"
              max="100"
              value={sizePercent}
              onChange={(e) => handleSizePercentChange(Number(e.target.value))}
              className="w-12 px-1 py-0.5 bg-white/5 border border-white/10 rounded text-[10px] text-white focus:outline-none focus:border-[#50d2c1]/50"
            />
            <span className="text-[10px] text-white/50">%</span>
          </div>
        </div>

        {/* Checkboxes */}
        <div className="space-y-1">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={reduceOnly}
              onChange={(e) => setReduceOnly(e.target.checked)}
              className="w-3 h-3 rounded border-white/20 bg-white/5 text-[#50d2c1] focus:ring-[#50d2c1] focus:ring-offset-0"
            />
            <span className="text-[10px] text-white/70">Reduce Only</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={takeProfitStopLoss}
              onChange={(e) => setTakeProfitStopLoss(e.target.checked)}
              className="w-3 h-3 rounded border-white/20 bg-white/5 text-[#50d2c1] focus:ring-[#50d2c1] focus:ring-offset-0"
            />
            <span className="text-[10px] text-white/70">Take Profit / Stop Loss</span>
          </label>
        </div>

        {/* Connect/Submit Button - Smaller text, white text, reduced height, 35-40px margin top */}
        <div style={{ marginTop: '37px', paddingBottom: '15px' }} className="flex-shrink-0">
          {!isZtarknetReady || !ztarknetAccount ? (
            <button
              type="button"
              onClick={() => toast.info('Please connect your wallet first')}
              className="w-full py-1.5 rounded text-[9px] font-extralight transition-all bg-[#50d2c1] hover:bg-[#50d2c1]/90"
            >
              Connect
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-1.5 rounded text-[9px] font-extralight transition-all ${
                orderSide === 'long'
                  ? 'bg-[#50d2c1] hover:bg-[#50d2c1]/90 text-white'
                  : 'bg-red-500 hover:bg-red-600 text-white'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isSubmitting ? 'Submitting...' : `${orderSide === 'long' ? 'Buy' : 'Sell'} ${orderType === 'market' ? 'Market' : 'Limit'}`}
            </button>
          )}
        </div>
      </form>

      {/* Trade Information - At the bottom of the order form, padding top and bottom for each */}
      <div className="space-y-0 border-t border-white/10 flex-shrink-0" style={{ paddingTop: '15px', paddingBottom: '15px' }}>
        <div className="flex justify-between text-[10px] py-1">
          <span className="text-white/50">Liquidation Price</span>
          <span className="text-white/70">N/A</span>
        </div>
        <div className="flex justify-between text-[10px] py-1">
          <span className="text-white/50">Order Value</span>
          <span className="text-white/70">N/A</span>
        </div>
        <div className="flex justify-between text-[10px] py-1">
          <span className="text-white/50">Slippage</span>
          <span className="text-white/70">Est: 0% / Max: 8.00%</span>
        </div>
      </div>
    </div>
  );
}

