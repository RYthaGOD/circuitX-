import { useState } from 'react';
import { useTradingStore, Position } from '../../stores/tradingStore';
import { ArrowUp, ArrowDown, X } from 'lucide-react';
import { toast } from 'sonner';

interface PositionCardProps {
  position: Position;
}

export function PositionCard({ position }: PositionCardProps) {
  const removePosition = useTradingStore((state) => state.removePosition);
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = async () => {
    setIsClosing(true);
    toast.info('Generating proof and closing position...');

    try {
      // TODO: Generate proof for closing
      // TODO: Call usePerpRouter().closePosition()
      
      removePosition(position.commitment);
      toast.success('Position closed successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to close position');
    } finally {
      setIsClosing(false);
    }
  };

  // Calculate PnL (if we have the data locally)
  const pnl = position.pnl
    ? parseFloat(position.pnl)
    : null;
  const pnlPercent = position.entryPrice && position.pnl
    ? (parseFloat(position.pnl) / parseFloat(position.entryPrice)) * 100
    : null;

  return (
    <div
      className={`p-2 rounded border text-xs ${
        position.isLong
          ? 'bg-[#50d2c1]/10 border-[#50d2c1]/30'
          : 'bg-red-900/20 border-red-700/50'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
        {position.isLong ? (
          <ArrowUp className="text-[#50d2c1]" size={14} />
        ) : (
          <ArrowDown className="text-red-400" size={14} />
        )}
        <span className="font-medium text-white text-xs">
          {position.isLong ? 'Long' : 'Short'}
        </span>
          <span className="text-gray-400 text-sm">
            {position.marketId.slice(0, 8)}...
          </span>
        </div>
        <button
          onClick={handleClose}
          disabled={isClosing}
          className="p-1 hover:bg-gray-800 rounded transition-colors disabled:opacity-50"
        >
          <X size={16} className="text-gray-400" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        {position.size && (
          <div>
            <div className="text-gray-400">Size</div>
            <div className="text-white font-semibold">
              {parseFloat(position.size).toLocaleString()}
            </div>
          </div>
        )}

        {position.entryPrice && (
          <div>
            <div className="text-gray-400">Entry Price</div>
            <div className="text-white font-semibold">
              ${parseFloat(position.entryPrice).toLocaleString()}
            </div>
          </div>
        )}

        {position.margin && (
          <div>
            <div className="text-gray-400">Margin</div>
            <div className="text-white font-semibold">
              {parseFloat(position.margin).toLocaleString()} yUSD
            </div>
          </div>
        )}

        {pnl !== null && (
          <div>
            <div className="text-white/50">PnL</div>
            <div
              className={`font-medium text-xs ${
                pnl >= 0 ? 'text-[#50d2c1]' : 'text-red-400'
              }`}
            >
              {pnl >= 0 ? '+' : ''}
              {pnl.toLocaleString()} yUSD
              {pnlPercent !== null && (
                <span className="ml-1 text-xs">
                  ({pnlPercent >= 0 ? '+' : ''}
                  {pnlPercent.toFixed(2)}%)
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-gray-700">
        <div className="text-xs text-gray-500">
          Commitment: {position.commitment.slice(0, 16)}...
        </div>
        <div className="text-xs text-gray-500">
          Opened: {new Date(position.timestamp).toLocaleString()}
        </div>
      </div>
    </div>
  );
}

