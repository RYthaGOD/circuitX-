//! Minimal order metadata stored on-chain so that size/collateral remain private.

use private_perp::order::order::OrderType;

#[derive(Copy, Drop, Serde, starknet::Store)]
pub struct OrderRecord {
    pub commitment: felt252,
    pub market_id: felt252,
    pub is_long: bool,
    pub order_type: OrderType,
    pub trigger_price: u256, // For limit orders
    pub created_at: u64,
}

pub fn order_record_new(
    commitment: felt252,
    market_id: felt252,
    is_long: bool,
    order_type: OrderType,
    trigger_price: u256,
    created_at: u64,
) -> OrderRecord {
    OrderRecord { commitment, market_id, is_long, order_type, trigger_price, created_at }
}

pub fn order_record_empty() -> OrderRecord {
    OrderRecord {
        commitment: 0,
        market_id: 0,
        is_long: false,
        order_type: OrderType::None,
        trigger_price: 0,
        created_at: 0,
    }
}

