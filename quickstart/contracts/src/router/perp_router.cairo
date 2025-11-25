//! Perp Router - Main entry point for all operations

use core::array::SpanTrait;
use private_perp::handlers::liquidation_handler::ILiquidationHandlerDispatcher;
use private_perp::handlers::order_handler::IOrderHandlerDispatcher;
use private_perp::handlers::position_handler::IPositionHandlerDispatcher;
use private_perp::risk::risk_manager::IRiskManagerDispatcher;
use starknet::ContractAddress;

#[starknet::interface]
pub trait IPerpRouter<TContractState> {
    fn open_position(ref self: TContractState, proof: Span<felt252>, public_inputs: Span<felt252>);

    fn close_position(
        ref self: TContractState,
        proof: Span<felt252>,
        public_inputs: Span<felt252>,
        position_commitment: felt252,
    );

    fn liquidate_position(
        ref self: TContractState,
        proof: Span<felt252>,
        public_inputs: Span<felt252>,
        position_commitment: felt252,
    );

    fn create_market_order(
        ref self: TContractState,
        proof: Span<felt252>,
        public_inputs: Span<felt252>,
        market_id: felt252,
        is_long: bool,
        size: u256,
        collateral_amount: u256,
    ) -> felt252;

    fn create_limit_order(
        ref self: TContractState,
        market_id: felt252,
        is_long: bool,
        size: u256,
        trigger_price: u256,
        collateral_amount: u256,
    ) -> felt252;

    fn create_twap_order(
        ref self: TContractState,
        market_id: felt252,
        is_long: bool,
        total_size: u256,
        duration: u64,
        chunk_interval: u64,
        collateral_amount: u256,
    ) -> felt252;

    fn execute_limit_order(
        ref self: TContractState,
        proof: Span<felt252>,
        public_inputs: Span<felt252>,
        order_commitment: felt252,
    );

    fn execute_twap_chunk(
        ref self: TContractState,
        proof: Span<felt252>,
        public_inputs: Span<felt252>,
        twap_order_commitment: felt252,
    );

    fn cancel_twap_order(ref self: TContractState, twap_order_commitment: felt252);

    /// Calculate liquidation price before opening a position
    fn calculate_liquidation_price(
        self: @TContractState,
        market_id: felt252,
        collateral_amount: u256,
        position_size_usd: u256,
        entry_price: u256,
        is_long: bool,
    ) -> u256;
}

#[starknet::contract]
mod PerpRouter {
    use core::array::SpanTrait;
    use private_perp::handlers::liquidation_handler::{ILiquidationHandlerDispatcher, ILiquidationHandlerDispatcherTrait};
    use private_perp::handlers::order_handler::{IOrderHandlerDispatcher, IOrderHandlerDispatcherTrait};
    use private_perp::handlers::position_handler::{IPositionHandlerDispatcher, IPositionHandlerDispatcherTrait};
    use private_perp::risk::risk_manager::{IRiskManagerDispatcher, IRiskManagerDispatcherTrait};
    use starknet::ContractAddress;
    use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};

    #[storage]
    struct Storage {
        position_handler: IPositionHandlerDispatcher,
        order_handler: IOrderHandlerDispatcher,
        liquidation_handler: ILiquidationHandlerDispatcher,
        risk_manager: IRiskManagerDispatcher,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        position_handler_address: ContractAddress,
        order_handler_address: ContractAddress,
        liquidation_handler_address: ContractAddress,
        risk_manager_address: ContractAddress,
    ) {
        self
            .position_handler
            .write(IPositionHandlerDispatcher { contract_address: position_handler_address });
        self
            .order_handler
            .write(IOrderHandlerDispatcher { contract_address: order_handler_address });
        self
            .liquidation_handler
            .write(ILiquidationHandlerDispatcher { contract_address: liquidation_handler_address });
        self.risk_manager.write(IRiskManagerDispatcher { contract_address: risk_manager_address });
    }

    #[external(v0)]
    impl PerpRouterImpl of super::IPerpRouter<ContractState> {
        fn open_position(
            ref self: ContractState,
            proof: Span<felt252>,
            public_inputs: Span<felt252>,
        ) {
            self.position_handler.read().open_position(proof, public_inputs);
        }

        fn close_position(
            ref self: ContractState,
            proof: Span<felt252>,
            public_inputs: Span<felt252>,
            position_commitment: felt252,
        ) {
            self
                .position_handler
                .read()
                .close_position(proof, public_inputs, position_commitment);
        }

        fn liquidate_position(
            ref self: ContractState,
            proof: Span<felt252>,
            public_inputs: Span<felt252>,
            position_commitment: felt252,
        ) {
            self
                .liquidation_handler
                .read()
                .liquidate_position(proof, public_inputs, position_commitment);
        }

        fn create_market_order(
            ref self: ContractState,
            proof: Span<felt252>,
            public_inputs: Span<felt252>,
            market_id: felt252,
            is_long: bool,
            size: u256,
            collateral_amount: u256,
        ) -> felt252 {
            self
                .order_handler
                .read()
                .create_market_order(
                    proof, public_inputs, market_id, is_long, size, collateral_amount,
                )
        }

        fn create_limit_order(
            ref self: ContractState,
            market_id: felt252,
            is_long: bool,
            size: u256,
            trigger_price: u256,
            collateral_amount: u256,
        ) -> felt252 {
            self
                .order_handler
                .read()
                .create_limit_order(market_id, is_long, size, trigger_price, collateral_amount)
        }

        fn create_twap_order(
            ref self: ContractState,
            market_id: felt252,
            is_long: bool,
            total_size: u256,
            duration: u64,
            chunk_interval: u64,
            collateral_amount: u256,
        ) -> felt252 {
            self
                .order_handler
                .read()
                .create_twap_order(
                    market_id, is_long, total_size, duration, chunk_interval, collateral_amount,
                )
        }

        fn execute_limit_order(
            ref self: ContractState,
            proof: Span<felt252>,
            public_inputs: Span<felt252>,
            order_commitment: felt252,
        ) {
            self.order_handler.read().execute_limit_order(proof, public_inputs, order_commitment);
        }

        fn execute_twap_chunk(
            ref self: ContractState,
            proof: Span<felt252>,
            public_inputs: Span<felt252>,
            twap_order_commitment: felt252,
        ) {
            self
                .order_handler
                .read()
                .execute_twap_chunk(proof, public_inputs, twap_order_commitment);
        }

        fn cancel_twap_order(ref self: ContractState, twap_order_commitment: felt252) {
            self.order_handler.read().cancel_twap_order(twap_order_commitment);
        }

        fn calculate_liquidation_price(
            self: @ContractState,
            market_id: felt252,
            collateral_amount: u256,
            position_size_usd: u256,
            entry_price: u256,
            is_long: bool,
        ) -> u256 {
            self
                .risk_manager
                .read()
                .calculate_liquidation_price(
                    market_id, collateral_amount, position_size_usd, entry_price, is_long,
                )
        }
    }
}

