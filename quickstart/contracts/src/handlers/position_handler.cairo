//! Position Handler Contract - Handles opening and closing positions

use core::array::SpanTrait;
use core::option::OptionTrait;
use private_perp::core::data_store::{IDataStoreDispatcher, IDataStoreDispatcherTrait};
use private_perp::core::event_emitter::{IEventEmitterDispatcher, IEventEmitterDispatcherTrait};
use private_perp::position::position_record::{PositionRecord, position_record_new};
use private_perp::vault::collateral_vault::{
    ICollateralVaultDispatcher, ICollateralVaultDispatcherTrait,
};
use starknet::{ContractAddress, get_caller_address};

// ERC20 Interface (dispatcher will be auto-generated)
#[starknet::interface]
trait IERC20<TContractState> {
    fn transfer(ref self: TContractState, recipient: ContractAddress, amount: u256) -> bool;
    fn transfer_from(
        ref self: TContractState, sender: ContractAddress, recipient: ContractAddress, amount: u256,
    ) -> bool;
    fn balance_of(self: @TContractState, account: ContractAddress) -> u256;
}

// Verifier Interface
#[starknet::interface]
pub trait IVerifier<TContractState> {
    fn verify_ultra_starknet_zk_honk_proof(
        self: @TContractState, proof: Span<felt252>,
    ) -> Option<Span<u256>>;
}

// Dispatcher trait alias (auto-generated from interface)
pub use IVerifierDispatcherTrait;

// Dispatchers (auto-generated from interfaces, but we need to use them)
use starknet::ClassHash;

#[starknet::interface]
pub trait IPositionHandler<TContractState> {
    fn open_position(ref self: TContractState, proof: Span<felt252>, public_inputs: Span<felt252>);

    fn close_position(
        ref self: TContractState,
        proof: Span<felt252>,
        public_inputs: Span<felt252>,
        position_commitment: felt252,
    );
}

#[starknet::contract]
mod PositionHandler {
    use core::array::SpanTrait;
    use core::option::OptionTrait;
    use private_perp::core::data_store::{IDataStoreDispatcher, IDataStoreDispatcherTrait};
    use private_perp::core::event_emitter::{IEventEmitterDispatcher, IEventEmitterDispatcherTrait};
    use private_perp::core::oracle::{IOracleDispatcher, IOracleDispatcherTrait};
    use private_perp::position::position_record::{PositionRecord, position_record_new};
    use private_perp::vault::collateral_vault::{ICollateralVaultDispatcher, ICollateralVaultDispatcherTrait};
    use starknet::get_block_timestamp;
    use starknet::{ContractAddress, get_caller_address};
    use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};
    use super::{IPositionHandler, IVerifier, IVerifierDispatcher, IVerifierDispatcherTrait};

    #[storage]
    struct Storage {
        data_store: IDataStoreDispatcher,
        event_emitter: IEventEmitterDispatcher,
        verifier_address: ContractAddress,
        yusd_token_address: ContractAddress,
        collateral_vault: ICollateralVaultDispatcher,
    }

    #[derive(Copy)]
    struct OpenPositionProofData {
        market_id: felt252,
        commitment: felt252,
        is_long: bool,
        size: u256,
        collateral_locked: u256,
    }

    #[derive(Copy)]
    struct ClosePositionProofData {
        market_id: felt252,
        commitment: felt252,
        outcome_code: felt252,
        closed_size: u256,
        payout: u256,
        loss_to_vault: u256,
        fees: u256,
        collateral_released: u256,
        is_full_close: bool,
    }

    fn felt_to_bool(value: felt252) -> bool {
        value != 0
    }

    fn parse_open_position_proof(
        public_inputs: Span<felt252>,
        proof_outputs: Span<u256>,
    ) -> OpenPositionProofData {
        assert(public_inputs.len() >= 3, 'MISSING_PUBLIC_INPUTS');
        assert(proof_outputs.len() >= 2, 'MISSING_PROOF_OUTPUTS');

        let market_id = *public_inputs.at(0);
        let commitment = *public_inputs.at(1);
        let is_long = felt_to_bool(*public_inputs.at(2));

        let size = *proof_outputs.at(0);
        let collateral_locked = *proof_outputs.at(1);

        OpenPositionProofData { market_id, commitment, is_long, size, collateral_locked }
    }

    fn parse_close_position_proof(
        public_inputs: Span<felt252>,
        proof_outputs: Span<u256>,
    ) -> ClosePositionProofData {
        assert(public_inputs.len() >= 4, 'MISSING_CLOSE_PUBLIC_INPUTS');
        assert(proof_outputs.len() >= 5, 'MISSING_CLOSE_PROOF_OUTPUTS');

        let market_id = *public_inputs.at(0);
        let commitment = *public_inputs.at(1);
        let outcome_code = *public_inputs.at(2);
        let is_full_close = felt_to_bool(*public_inputs.at(3));

        let closed_size = *proof_outputs.at(0);
        let payout = *proof_outputs.at(1);
        let loss_to_vault = *proof_outputs.at(2);
        let fees = *proof_outputs.at(3);
        let collateral_released = *proof_outputs.at(4);

        ClosePositionProofData {
            market_id,
            commitment,
            outcome_code,
            closed_size,
            payout,
            loss_to_vault,
            fees,
            collateral_released,
            is_full_close,
        }
    }

    fn checked_sub(lhs: u256, rhs: u256, error: felt252) -> u256 {
        assert(lhs >= rhs, error);
        lhs - rhs
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        data_store_address: ContractAddress,
        event_emitter_address: ContractAddress,
        verifier_address: ContractAddress,
        yusd_token_address: ContractAddress,
        collateral_vault_address: ContractAddress,
    ) {
        self.data_store.write(IDataStoreDispatcher { contract_address: data_store_address });
        self
            .event_emitter
            .write(IEventEmitterDispatcher { contract_address: event_emitter_address });
        self.verifier_address.write(verifier_address);
        self.yusd_token_address.write(yusd_token_address);
        self
            .collateral_vault
            .write(ICollateralVaultDispatcher { contract_address: collateral_vault_address });
    }

    #[external(v0)]
    impl PositionHandlerImpl of super::IPositionHandler<ContractState> {
        fn open_position(
            ref self: ContractState,
            proof: Span<felt252>,
            public_inputs: Span<felt252>,
        ) {
            // 1. Verify ZK proof and decode privacy-preserving outputs
            let verifier = IVerifierDispatcher { contract_address: self.verifier_address.read() };
            let verified_outputs = verifier
                .verify_ultra_starknet_zk_honk_proof(proof)
                .expect('INVALID_PROOF');
            let parsed = parse_open_position_proof(public_inputs, verified_outputs);

            // 2. Ensure market is enabled
            let config = self.data_store.read().get_market_config(parsed.market_id);
            assert(config.enabled, 'MARKET_DISABLED');

            // 3. Persist only commitment metadata
            let caller = get_caller_address();
            let record = position_record_new(
                parsed.commitment,
                caller,
                parsed.market_id,
                parsed.is_long,
                get_block_timestamp(),
            );
            self.data_store.read().set_position(parsed.commitment, record);

            // 4. Update aggregate collateral pool with opaque delta from proof
            if parsed.collateral_locked > 0 {
                let mut pool = self.data_store.read().get_collateral_pool(parsed.market_id);
                pool += parsed.collateral_locked;
                self.data_store.read().set_collateral_pool(parsed.market_id, pool);
            }

            // 5. Update open interest counters using proof-provided size
            if parsed.size > 0 {
                if parsed.is_long {
                    let mut oi = self.data_store.read().get_long_open_interest(parsed.market_id);
                    oi += parsed.size;
                    self.data_store.read().set_long_open_interest(parsed.market_id, oi);
                } else {
                    let mut oi = self.data_store.read().get_short_open_interest(parsed.market_id);
                    oi += parsed.size;
                    self.data_store.read().set_short_open_interest(parsed.market_id, oi);
                }
            }

            // 6. Emit minimal event (no position amounts)
            self
                .event_emitter
                .read()
                .emit_position_opened(parsed.commitment, parsed.market_id, parsed.is_long);
        }

        fn close_position(
            ref self: ContractState,
            proof: Span<felt252>,
            public_inputs: Span<felt252>,
            position_commitment: felt252,
        ) {
            let record = self.data_store.read().get_position(position_commitment);
            assert(record.commitment != 0, 'POSITION_NOT_FOUND');

            let verifier = IVerifierDispatcher { contract_address: self.verifier_address.read() };
            let verified_outputs = verifier
                .verify_ultra_starknet_zk_honk_proof(proof)
                .expect('INVALID_PROOF');
            let parsed = parse_close_position_proof(public_inputs, verified_outputs);

            assert(parsed.commitment == position_commitment, 'COMMITMENT_MISMATCH');
            assert(parsed.market_id == record.market_id, 'MARKET_MISMATCH');

            if parsed.closed_size > 0 {
                if record.is_long {
                    let current = self.data_store.read().get_long_open_interest(record.market_id);
                    let updated = checked_sub(current, parsed.closed_size, 'OI_UNDERFLOW');
                    self.data_store.read().set_long_open_interest(record.market_id, updated);
                } else {
                    let current = self.data_store.read().get_short_open_interest(record.market_id);
                    let updated = checked_sub(current, parsed.closed_size, 'OI_UNDERFLOW');
                    self.data_store.read().set_short_open_interest(record.market_id, updated);
                }
            }

            if parsed.collateral_released > 0 {
                let pool = self.data_store.read().get_collateral_pool(record.market_id);
                let updated_pool =
                    checked_sub(pool, parsed.collateral_released, 'POOL_UNDERFLOW');
                self.data_store.read().set_collateral_pool(record.market_id, updated_pool);
            }

            if parsed.fees > 0 {
                self.collateral_vault.read().accrue_fees(record.market_id, parsed.fees);
            }

            if parsed.loss_to_vault > 0 {
                let absorbed = self
                    .collateral_vault
                    .read()
                    .absorb_loss(record.market_id, parsed.loss_to_vault);
                assert(absorbed, 'LOSS_ABSORB_FAILED');
            }

            if parsed.payout > 0 {
                let success = self
                    .collateral_vault
                    .read()
                    .withdraw_profit(record.market_id, record.account, parsed.payout);
                assert(success, 'PAYOUT_FAILED');
            }

            if parsed.is_full_close {
                self.data_store.read().remove_position(position_commitment);
            }

            self
                .event_emitter
                .read()
                .emit_position_closed(record.commitment, record.market_id, parsed.outcome_code);
        }
    }
}

