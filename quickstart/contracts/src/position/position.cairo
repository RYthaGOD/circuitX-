//! Position data structures

use starknet::ContractAddress;
use core::num::traits::Zero;

#[derive(Drop, starknet::Store, Serde, Copy)]
pub struct Position {
    pub commitment: felt252,
    pub account: ContractAddress, // User who opened the position (depositing address)
    pub market_id: felt252,
    pub is_long: bool,
    pub entry_price: u256,
    pub size: u256,
    pub margin: u256,
    pub created_at: u64,
}

impl PositionZeroable of Zero<Position> {
    fn zero() -> Position {
        Position {
            commitment: 0,
            account: starknet::contract_address_const::<0>(),
            market_id: 0,
            is_long: false,
            entry_price: 0,
            size: 0,
            margin: 0,
            created_at: 0,
        }
    }

    fn is_zero(self: @Position) -> bool {
        *self.commitment == 0
    }

    fn is_non_zero(self: @Position) -> bool {
        !self.is_zero()
    }
}

