//! Minimal position metadata stored on-chain so that size/collateral remain private.

use starknet::ContractAddress;

#[derive(Copy, Drop, Serde, starknet::Store)]
pub struct PositionRecord {
    pub commitment: felt252,
    pub account: ContractAddress,
    pub market_id: felt252,
    pub is_long: bool,
    pub opened_at: u64,
}

pub fn position_record_new(
    commitment: felt252,
    account: ContractAddress,
    market_id: felt252,
    is_long: bool,
    opened_at: u64,
) -> PositionRecord {
    PositionRecord { commitment, account, market_id, is_long, opened_at }
}

pub fn position_record_empty() -> PositionRecord {
    PositionRecord {
        commitment: 0,
        account: starknet::contract_address_const::<0>(),
        market_id: 0,
        is_long: false,
        opened_at: 0,
    }
}

