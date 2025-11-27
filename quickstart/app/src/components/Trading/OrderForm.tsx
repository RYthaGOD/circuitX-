import { useState } from 'react';
import { useTradingStore } from '../../stores/tradingStore';
import { ArrowUp, ArrowDown, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { formatYusdBalance } from '../../lib/balanceUtils';
import '../../App.css';

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
    availableBalance,
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
    // Size calculation can be implemented later when balance fetching is re-added
  };

  return (
    <div className="order-form-container">
      {/* Top Controls: Cross, 20x, One-Way */}
      <div className="order-form-top-controls">
        <button
          onClick={() => setMarginMode('cross')}
          className={`order-form-control-btn ${marginMode === 'cross' ? 'active' : ''}`}
        >
          Cross
        </button>
        <button
          onClick={() => setLeverage('20x')}
          className={`order-form-control-btn ${leverage === '20x' ? 'active' : ''}`}
        >
          20x
        </button>
        <button
          onClick={() => setPositionMode('one-way')}
          className={`order-form-control-btn ${positionMode === 'one-way' ? 'active' : ''}`}
        >
          One-Way
        </button>
      </div>

      {/* Order Type Tabs: Market, Limit, TWAP */}
      <div className="order-form-type-tabs">
        <button
          onClick={() => setOrderType('market')}
          className={`order-form-type-tab ${orderType === 'market' ? 'active' : ''}`}
        >
          Market
        </button>
        <button
          onClick={() => setOrderType('limit')}
          className={`order-form-type-tab ${orderType === 'limit' ? 'active' : ''}`}
        >
          Limit
        </button>
        <button 
          onClick={() => setOrderType('twap')}
          className={`order-form-type-tab ${orderType === 'twap' ? 'active' : ''}`}
        >
          TWAP
        </button>
      </div>

      {/* Long/Short Toggle - Sliding switch effect */}
      <div className="order-form-toggle-container">
        <div className={`order-form-toggle-slider ${orderSide === 'short' ? 'right' : ''}`} />
        <button
          onClick={() => setOrderSide('long')}
          className={`order-form-toggle-btn ${orderSide === 'long' ? 'active' : ''}`}
        >
          <ArrowUp size={12} />
          Buy / Long
        </button>
        <button
          onClick={() => setOrderSide('short')}
          className={`order-form-toggle-btn ${orderSide === 'short' ? 'active' : ''}`}
        >
          <ArrowDown size={12} />
          Sell / Short
        </button>
      </div>

      {/* Account Info */}
      <div className="order-form-account-info">
        <div className="order-form-account-row">
          <span>Available to Trade:</span>
          <span>{availableBalance ? `${formatYusdBalance(availableBalance)} yUSD` : '0.00 yUSD'}</span>
        </div>
        <div className="order-form-account-row">
          <span>Current Position:</span>
          <span>0.000 BTC</span>
        </div>
      </div>

      {/* Order Form */}
      <form onSubmit={handleSubmit} className="order-form-form">
        {/* Size Input - Label and dropdown INSIDE the input */}
        <div className="order-form-size-input-container">
          <input
            type="number"
            step="0.0001"
            value={orderSize}
            onChange={(e) => setOrderSize(e.target.value)}
            placeholder="0.00"
            className="order-form-size-input"
            required
          />
          <span className="order-form-size-label">Size</span>
          <button
            type="button"
            className="order-form-size-dropdown"
          >
            BTC
            <ChevronDown size={8} />
          </button>
        </div>

        {/* Size Slider and Percentage */}
        <div className="order-form-slider-container">
          <input
            type="range"
            min="0"
            max="100"
            value={sizePercent}
            onChange={(e) => handleSizePercentChange(Number(e.target.value))}
            className="order-form-slider"
            style={{
              background: `linear-gradient(to right, #50d2c1 0%, #50d2c1 ${sizePercent}%, rgba(255,255,255,0.1) ${sizePercent}%, rgba(255,255,255,0.1) 100%)`
            }}
          />
          <div className="order-form-percent-row">
            <input
              type="number"
              min="0"
              max="100"
              value={sizePercent}
              onChange={(e) => handleSizePercentChange(Number(e.target.value))}
              className="order-form-percent-input"
            />
            <span className="order-form-percent-label">%</span>
          </div>
        </div>

        {/* Checkboxes */}
        <div className="order-form-checkboxes">
          <label className="order-form-checkbox-label">
            <input
              type="checkbox"
              checked={reduceOnly}
              onChange={(e) => setReduceOnly(e.target.checked)}
              className="order-form-checkbox"
            />
            <span className="order-form-checkbox-label-text">Reduce Only</span>
          </label>
          <label className="order-form-checkbox-label">
            <input
              type="checkbox"
              checked={takeProfitStopLoss}
              onChange={(e) => setTakeProfitStopLoss(e.target.checked)}
              className="order-form-checkbox"
            />
            <span className="order-form-checkbox-label-text">Take Profit / Stop Loss</span>
          </label>
        </div>

        {/* Connect/Submit Button */}
        <div className="order-form-submit-container">
          {!isZtarknetReady || !ztarknetAccount ? (
            <button
              type="button"
              onClick={() => toast.info('Please connect your wallet first')}
              className="order-form-submit-btn"
            >
              Connect
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting}
              className={`order-form-submit-btn ${orderSide === 'short' ? 'sell' : ''}`}
            >
              {isSubmitting ? 'Submitting...' : `${orderSide === 'long' ? 'Buy' : 'Sell'} ${orderType === 'market' ? 'Market' : 'Limit'}`}
            </button>
          )}
        </div>
      </form>

      {/* Trade Information */}
      <div className="order-form-trade-info">
        <div className="order-form-trade-info-row">
          <span className="order-form-trade-info-label">Liquidation Price</span>
          <span className="order-form-trade-info-value">N/A</span>
        </div>
        <div className="order-form-trade-info-row">
          <span className="order-form-trade-info-label">Order Value</span>
          <span className="order-form-trade-info-value">N/A</span>
        </div>
        <div className="order-form-trade-info-row">
          <span className="order-form-trade-info-label">Slippage</span>
          <span className="order-form-trade-info-value">Est: 0% / Max: 8.00%</span>
        </div>
      </div>
    </div>
  );
}
