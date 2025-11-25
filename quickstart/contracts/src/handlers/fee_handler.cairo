//! Fee Handler Contract - Handles fee collection

use core::array::ArrayTrait;
use private_perp::core::data_store::{IDataStoreDispatcher, IDataStoreDispatcherTrait};
use private_perp::core::event_emitter::{IEventEmitterDispatcher, IEventEmitterDispatcherTrait};
use private_perp::vault::collateral_vault::{
    ICollateralVaultDispatcher, ICollateralVaultDispatcherTrait,
};
use starknet::ContractAddress;

#[starknet::interface]
pub trait IFeeHandler<TContractState> {
    /// Accrue trading fees to vault
    fn accrue_trading_fee(ref self: TContractState, market_id: felt252, fee_amount: u256);

    /// Claim fees from vault (admin only)
    fn claim_fees(ref self: TContractState, market_id: felt252, amount: u256);
}

#[starknet::contract]
mod FeeHandler {
    use core::array::ArrayTrait;
    use private_perp::core::data_store::{IDataStoreDispatcher, IDataStoreDispatcherTrait};
    use private_perp::core::event_emitter::{IEventEmitterDispatcher, IEventEmitterDispatcherTrait};
    use private_perp::vault::collateral_vault::{ICollateralVaultDispatcher, ICollateralVaultDispatcherTrait};
    use starknet::ContractAddress;
    use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};
    use super::IFeeHandler;

    #[storage]
    struct Storage {
        data_store: IDataStoreDispatcher,
        event_emitter: IEventEmitterDispatcher,
        collateral_vault: ICollateralVaultDispatcher,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        data_store_address: ContractAddress,
        event_emitter_address: ContractAddress,
        collateral_vault_address: ContractAddress,
    ) {
        self.data_store.write(IDataStoreDispatcher { contract_address: data_store_address });
        self
            .event_emitter
            .write(IEventEmitterDispatcher { contract_address: event_emitter_address });
        self
            .collateral_vault
            .write(ICollateralVaultDispatcher { contract_address: collateral_vault_address });
    }

    #[external(v0)]
    impl FeeHandlerImpl of super::IFeeHandler<ContractState> {
        fn accrue_trading_fee(ref self: ContractState, market_id: felt252, fee_amount: u256) {
            // Accrue fees to vault
            ICollateralVaultDispatcherTrait::accrue_fees(
                self.collateral_vault.read(), market_id, fee_amount
            );

            // TODO: Add emit_fee_accrued to event emitter
            // self.event_emitter.read().emit_fee_accrued(market_id, fee_amount);
        }

        fn claim_fees(ref self: ContractState, market_id: felt252, amount: u256) {
            // Claim fees from vault (admin only, handled by vault)
            ICollateralVaultDispatcherTrait::claim_fees(
                self.collateral_vault.read(), market_id, amount
            );

            // TODO: Add emit_fees_claimed to event emitter
            // self.event_emitter.read().emit_fees_claimed(market_id, amount);
        }
    }
}

