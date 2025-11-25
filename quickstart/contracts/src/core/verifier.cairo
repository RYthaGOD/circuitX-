//! Verifier Interface - Shared across contracts
//! This interface matches the UltraStarknetZKHonkVerifier contract

use core::array::SpanTrait;
use core::option::OptionTrait;

#[starknet::interface]
pub trait IVerifier<TContractState> {
    fn verify_ultra_starknet_zk_honk_proof(
        self: @TContractState, proof: Span<felt252>,
    ) -> Option<Span<u256>>;
}

