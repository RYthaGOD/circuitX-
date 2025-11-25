//! Order data structures

use starknet::ContractAddress;

#[derive(Drop, Copy, starknet::Store, Serde, PartialEq)]
pub enum OrderType {
    MarketOpen,
    LimitOpen,
    TWAPOpen,
    MarketClose,
    LimitClose,
    TakeProfit,
    StopLoss,
    #[default]
    None,
}

#[derive(Drop, starknet::Store, Serde, Copy)]
pub struct Order {
    pub commitment: felt252,
    pub market_id: felt252,
    pub is_long: bool,
    pub order_type: OrderType,
    pub trigger_price: u256, // For limit orders
    pub size: u256,
    pub collateral_amount: u256, // Collateral for the order
    pub created_at: u64,
}

impl OrderDefault of core::traits::Default<Order> {
    fn default() -> Order {
        Order {
            commitment: 0,
            market_id: 0,
            is_long: false,
            order_type: OrderType::None,
            trigger_price: 0,
            size: 0,
            collateral_amount: 0,
            created_at: 0,
        }
    }
}

