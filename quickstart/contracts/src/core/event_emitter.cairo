//! Event emission contract

use starknet::ContractAddress;

#[starknet::interface]
pub trait IEventEmitter<TContractState> {
    fn emit_position_opened(
        ref self: TContractState, commitment: felt252, market_id: felt252,
    );

    fn emit_position_closed(
        ref self: TContractState, commitment: felt252, market_id: felt252, outcome: felt252,
    );

    fn emit_position_liquidated(
        ref self: TContractState,
        commitment: felt252,
        market_id: felt252,
        liquidator: ContractAddress,
    );

    fn emit_price_updated(
        ref self: TContractState, market_id: felt252, price: u256, timestamp: u64,
    );

    fn emit_market_order_executed(
        ref self: TContractState,
        order_commitment: felt252,
        market_id: felt252,
        is_long: bool,
        execution_price: u256,
    );

    fn emit_limit_order_created(
        ref self: TContractState,
        order_commitment: felt252,
        market_id: felt252,
        is_long: bool,
        trigger_price: u256,
    );

    fn emit_limit_order_executed(
        ref self: TContractState,
        order_commitment: felt252,
        market_id: felt252,
        is_long: bool,
        execution_price: u256,
    );

    fn emit_twap_order_created(
        ref self: TContractState,
        order_commitment: felt252,
        market_id: felt252,
        is_long: bool,
        duration: u64,
        chunk_interval: u64,
    );

    fn emit_twap_chunk_executed(
        ref self: TContractState,
        order_commitment: felt252,
        market_id: felt252,
        twap_price: u256,
    );

    fn emit_twap_order_cancelled(
        ref self: TContractState,
        order_commitment: felt252,
        market_id: felt252,
    );
}

#[starknet::contract]
mod EventEmitter {
    use starknet::ContractAddress;

    #[storage]
    struct Storage {}

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        PositionOpened: PositionOpened,
        PositionClosed: PositionClosed,
        PositionLiquidated: PositionLiquidated,
        PriceUpdated: PriceUpdated,
        MarketOrderExecuted: MarketOrderExecuted,
        LimitOrderCreated: LimitOrderCreated,
        LimitOrderExecuted: LimitOrderExecuted,
        TWAPOrderCreated: TWAPOrderCreated,
        TWAPChunkExecuted: TWAPChunkExecuted,
        TWAPOrderCancelled: TWAPOrderCancelled,
    }

    #[derive(Drop, starknet::Event)]
    struct PositionOpened {
        commitment: felt252,
        market_id: felt252,
        // is_long removed - encoded in commitment for privacy
    }

    #[derive(Drop, starknet::Event)]
    struct PositionClosed {
        commitment: felt252,
        market_id: felt252,
        outcome: felt252,
    }

    #[derive(Drop, starknet::Event)]
    struct PositionLiquidated {
        commitment: felt252,
        market_id: felt252,
        liquidator: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct PriceUpdated {
        market_id: felt252,
        price: u256,
        timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct MarketOrderExecuted {
        order_commitment: felt252,
        market_id: felt252,
        is_long: bool,
        execution_price: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct LimitOrderCreated {
        order_commitment: felt252,
        market_id: felt252,
        is_long: bool,
        trigger_price: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct LimitOrderExecuted {
        order_commitment: felt252,
        market_id: felt252,
        is_long: bool,
        execution_price: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct TWAPOrderCreated {
        order_commitment: felt252,
        market_id: felt252,
        is_long: bool,
        duration: u64,
        chunk_interval: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct TWAPChunkExecuted {
        order_commitment: felt252,
        market_id: felt252,
        twap_price: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct TWAPOrderCancelled {
        order_commitment: felt252,
        market_id: felt252,
    }

    #[constructor]
    fn constructor(ref self: ContractState) {}

    #[abi(embed_v0)]
    impl EventEmitterImpl of super::IEventEmitter<ContractState> {
        fn emit_position_opened(
            ref self: ContractState, commitment: felt252, market_id: felt252,
        ) {
            self.emit(PositionOpened { commitment, market_id });
        }

        fn emit_position_closed(
            ref self: ContractState,
            commitment: felt252,
            market_id: felt252,
            outcome: felt252,
        ) {
            self.emit(PositionClosed { commitment, market_id, outcome });
        }

        fn emit_position_liquidated(
            ref self: ContractState,
            commitment: felt252,
            market_id: felt252,
            liquidator: ContractAddress,
        ) {
            self.emit(PositionLiquidated { commitment, market_id, liquidator });
        }

        fn emit_price_updated(
            ref self: ContractState, market_id: felt252, price: u256, timestamp: u64,
        ) {
            self.emit(PriceUpdated { market_id, price, timestamp });
        }

        fn emit_market_order_executed(
            ref self: ContractState,
            order_commitment: felt252,
            market_id: felt252,
            is_long: bool,
            execution_price: u256,
        ) {
            self
                .emit(
                    MarketOrderExecuted {
                        order_commitment, market_id, is_long, execution_price,
                    },
                );
        }

        fn emit_limit_order_created(
            ref self: ContractState,
            order_commitment: felt252,
            market_id: felt252,
            is_long: bool,
            trigger_price: u256,
        ) {
            self
                .emit(
                    LimitOrderCreated { order_commitment, market_id, is_long, trigger_price },
                );
        }

        fn emit_limit_order_executed(
            ref self: ContractState,
            order_commitment: felt252,
            market_id: felt252,
            is_long: bool,
            execution_price: u256,
        ) {
            self
                .emit(
                    LimitOrderExecuted {
                        order_commitment, market_id, is_long, execution_price,
                    },
                );
        }

        fn emit_twap_order_created(
            ref self: ContractState,
            order_commitment: felt252,
            market_id: felt252,
            is_long: bool,
            duration: u64,
            chunk_interval: u64,
        ) {
            self
                .emit(
                    TWAPOrderCreated {
                        order_commitment, market_id, is_long, duration, chunk_interval,
                    },
                );
        }

        fn emit_twap_chunk_executed(
            ref self: ContractState,
            order_commitment: felt252,
            market_id: felt252,
            twap_price: u256,
        ) {
            self
                .emit(
                    TWAPChunkExecuted {
                        order_commitment,
                        market_id,
                        twap_price,
                    },
                );
        }

        fn emit_twap_order_cancelled(
            ref self: ContractState,
            order_commitment: felt252,
            market_id: felt252,
        ) {
            self
                .emit(
                    TWAPOrderCancelled { order_commitment, market_id },
                );
        }
    }
}

