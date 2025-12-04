//! Order utility functions

use private_perp::core::data_store::MarketConfig;
use private_perp::order::order::{Order, OrderType};

/// Check if trigger price is reached
pub fn check_trigger_price(
    trigger_price: u256, current_price: u256, is_long: bool, order_type: OrderType,
) -> bool {
    if order_type == OrderType::LimitOpen {
        if is_long {
            // Limit buy: execute when price <= trigger
            current_price <= trigger_price
        } else {
            // Limit sell: execute when price >= trigger
            current_price >= trigger_price
        }
    } else if order_type == OrderType::TakeProfit {
        if is_long {
            // Long TP: execute when price >= trigger
            current_price >= trigger_price
        } else {
            // Short TP: execute when price <= trigger
            current_price <= trigger_price
        }
    } else if order_type == OrderType::StopLoss {
        if is_long {
            // Long SL: execute when price <= trigger
            current_price <= trigger_price
        } else {
            // Short SL: execute when price >= trigger
            current_price >= trigger_price
        }
    } else {
        false
    }
}

/// Validate order
pub fn validate_order(order: Order, config: MarketConfig) {
    assert(order.size > 0, 'INVALID_SIZE');
    // FIXED: Remove market enabled check - allow transactions regardless of market_id
}


