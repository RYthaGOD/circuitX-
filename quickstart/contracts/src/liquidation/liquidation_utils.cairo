//! Liquidation utility functions

use core::traits::TryInto;
use private_perp::position::position::Position;
use private_perp::position::position_utils::calculate_pnl;

/// Check if position is liquidatable
pub fn is_liquidatable(position: Position, current_price: u256, min_margin_ratio: u256) -> bool {
    // Calculate PnL
    let pnl = calculate_pnl(position.entry_price, current_price, position.is_long, position.size);

    // Calculate remaining collateral
    let pnl_u256 = u256 { low: pnl.low.try_into().unwrap(), high: pnl.high.try_into().unwrap() };
    let remaining_collateral = if pnl.low == 0 && pnl.high == 0 {
        position.margin
    } else {
        position.margin + pnl_u256
    };

    // Calculate required margin
    let required_margin = (position.size * min_margin_ratio) / 100;

    // Check if liquidatable
    remaining_collateral < required_margin
}


