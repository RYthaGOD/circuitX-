//! Minimal position metadata stored on-chain.
//! Size, collateral, and direction are PRIVATE - encoded in commitment hash only.

use starknet::ContractAddress;

#[derive(Copy, Drop, Serde, starknet::Store)]
pub struct PositionRecord {
    pub commitment: felt252,  // Hash of all private data (size, margin, direction, secret)
    pub account: ContractAddress,
    pub market_id: felt252,
    // is_long removed - encoded in commitment for privacy
    pub opened_at: u64,
}

pub fn position_record_new(
    commitment: felt252,
    account: ContractAddress,
    market_id: felt252,
    opened_at: u64,
) -> PositionRecord {
    PositionRecord { commitment, account, market_id, opened_at }
}

pub fn position_record_empty() -> PositionRecord {
    PositionRecord {
        commitment: 0,
        account: starknet::contract_address_const::<0>(),
        market_id: 0,
        opened_at: 0,
    }
}

