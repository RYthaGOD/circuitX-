//! Liquidation Handler Contract

use core::array::SpanTrait;
use core::option::OptionTrait;
use private_perp::core::data_store::{IDataStoreDispatcher, IDataStoreDispatcherTrait};
use private_perp::core::event_emitter::{IEventEmitterDispatcher, IEventEmitterDispatcherTrait};
use private_perp::handlers::position_handler::{IVerifier, IVerifierDispatcher};
use private_perp::position::position_record::PositionRecord;
use private_perp::vault::collateral_vault::{
    ICollateralVaultDispatcher, ICollateralVaultDispatcherTrait,
};
use starknet::{ContractAddress, get_caller_address};

#[starknet::interface]
pub trait ILiquidationHandler<TContractState> {
    fn liquidate_position(
        ref self: TContractState,
        proof: Span<felt252>,
        public_inputs: Span<felt252>,
        position_commitment: felt252,
    );
}

#[starknet::contract]
mod LiquidationHandler {
    use core::array::SpanTrait;
    use core::option::OptionTrait;
    use private_perp::core::data_store::{IDataStoreDispatcher, IDataStoreDispatcherTrait};
    use private_perp::core::event_emitter::{IEventEmitterDispatcher, IEventEmitterDispatcherTrait};
    use private_perp::position::position_record::PositionRecord;
    use private_perp::vault::collateral_vault::{
        ICollateralVaultDispatcher, ICollateralVaultDispatcherTrait,
    };
    use starknet::{ContractAddress, get_caller_address};
    use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};
    use super::{ILiquidationHandler, IVerifier, IVerifierDispatcher};

    #[storage]
    struct Storage {
        data_store: IDataStoreDispatcher,
        event_emitter: IEventEmitterDispatcher,
        verifier_address: ContractAddress,
        collateral_vault: ICollateralVaultDispatcher,
    }

    #[derive(Copy)]
    struct LiquidationProofData {
        market_id: felt252,
        commitment: felt252,
        closed_size: u256,
        loss_to_vault: u256,
        fees: u256,
        reward: u256,
        collateral_released: u256,
    }

    fn parse_liquidation_proof(
        public_inputs: Span<felt252>,
        proof_outputs: Span<u256>,
    ) -> LiquidationProofData {
        assert(public_inputs.len() >= 2, 'MISSING_LIQ_INPUTS');
        assert(proof_outputs.len() >= 5, 'MISSING_LIQ_PROOF_OUTPUTS');

        LiquidationProofData {
            market_id: *public_inputs.at(0),
            commitment: *public_inputs.at(1),
            closed_size: *proof_outputs.at(0),
            loss_to_vault: *proof_outputs.at(1),
            fees: *proof_outputs.at(2),
            reward: *proof_outputs.at(3),
            collateral_released: *proof_outputs.at(4),
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
        collateral_vault_address: ContractAddress,
    ) {
        self.data_store.write(IDataStoreDispatcher { contract_address: data_store_address });
        self
            .event_emitter
            .write(IEventEmitterDispatcher { contract_address: event_emitter_address });
        self.verifier_address.write(verifier_address);
        self
            .collateral_vault
            .write(ICollateralVaultDispatcher { contract_address: collateral_vault_address });
    }

    #[external(v0)]
    impl LiquidationHandlerImpl of super::ILiquidationHandler<ContractState> {
        fn liquidate_position(
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
            let parsed = parse_liquidation_proof(public_inputs, verified_outputs);

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

            if parsed.reward > 0 {
                let reward_success = self
                    .collateral_vault
                    .read()
                    .withdraw_profit(record.market_id, get_caller_address(), parsed.reward);
                assert(reward_success, 'REWARD_FAILED');
            }

            self.data_store.read().remove_position(position_commitment);

            self
                .event_emitter
                .read()
                .emit_position_liquidated(position_commitment, record.market_id, get_caller_address());
        }
    }
}

