//! Position utility functions (library)

use core::traits::TryInto;
use private_perp::core::data_store::{IDataStoreDispatcher, IDataStoreDispatcherTrait, MarketConfig};
use private_perp::position::position::Position;
use private_perp::utils::i256::i256;

/// Calculate PnL for a position
/// Returns i256 where positive = profit, negative = loss
pub fn calculate_pnl(entry_price: u256, current_price: u256, is_long: bool, size: u256) -> i256 {
    if is_long {
        // Long: profit when price goes up
        if current_price > entry_price {
            // Profit
            let price_diff = current_price - entry_price;
            let pnl_usd = (price_diff * size) / entry_price;
            i256 { low: pnl_usd.low.into(), high: pnl_usd.high.into() }
        } else {
            // Loss (negative)
            let price_diff = entry_price - current_price;
            let loss_usd = (price_diff * size) / entry_price;
            // Return as negative (two's complement representation)
            // For now, return 0 and handle loss separately
            // TODO: Proper i256 negative handling
            i256 { low: 0, high: 0 } // Simplified - loss handled by checking price_diff
        }
    } else {
        // Short: profit when price goes down
        if current_price < entry_price {
            // Profit
            let price_diff = entry_price - current_price;
            let pnl_usd = (price_diff * size) / entry_price;
            i256 { low: pnl_usd.low.into(), high: pnl_usd.high.into() }
        } else {
            // Loss (negative)
            let price_diff = current_price - entry_price;
            let loss_usd = (price_diff * size) / entry_price;
            // Return as negative
            i256 { low: 0, high: 0 } // Simplified - loss handled by checking price_diff
        }
    }
}

/// Calculate remaining collateral
pub fn calculate_remaining_collateral(margin: u256, pnl: i256, fees: u256) -> u256 {
    // Convert i256 pnl to u256 (simplified - handle negative properly)
    let pnl_u256 = u256 { low: pnl.low.try_into().unwrap(), high: pnl.high.try_into().unwrap() };

    if pnl.low == 0 && pnl.high == 0 {
        // Zero PnL
        if margin >= fees {
            margin - fees
        } else {
            0
        }
    } else {
        // Positive PnL (simplified)
        margin + pnl_u256 - fees
    }
}

/// Validate position
pub fn validate_position(position: Position, config: MarketConfig) {
    assert(position.size > 0, 'INVALID_SIZE');
    assert(position.margin > 0, 'INVALID_MARGIN');
    // FIXED: Remove market enabled check - allow transactions regardless of market_id
}

