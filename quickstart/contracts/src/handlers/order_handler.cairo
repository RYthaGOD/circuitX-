//! Order Handler Contract - Handles market, limit, and TWAP orders

use core::array::SpanTrait;
use private_perp::core::data_store::{IDataStoreDispatcher, IDataStoreDispatcherTrait};
use private_perp::core::event_emitter::{IEventEmitterDispatcher, IEventEmitterDispatcherTrait};
use private_perp::core::oracle::{IOracleDispatcher, IOracleDispatcherTrait};
use private_perp::handlers::position_handler::IPositionHandlerDispatcher;
use private_perp::order::order::{Order, OrderType};
use private_perp::order::order_record::{OrderRecord, order_record_new, order_record_empty};
use core::traits::Into;
use core::option::OptionTrait;
use private_perp::order::order_utils::check_trigger_price;
use private_perp::order::twap_order::{
    TWAPOrder, calculate_chunk_size, get_remaining_size, should_execute_chunk,
};
use private_perp::order::twap_order_record::{
    TWAPOrderRecord, twap_order_record_new, twap_order_record_empty, should_execute_chunk_record,
};
use starknet::get_block_timestamp;
use starknet::{ContractAddress, get_caller_address};

#[starknet::interface]
pub trait IOrderHandler<TContractState> {
    /// Create and execute market order immediately
    fn create_market_order(
        ref self: TContractState,
        proof: Span<felt252>,
        public_inputs: Span<felt252>,
        market_id: felt252,
        is_long: bool,
        size: u256,
        collateral_amount: u256,
    ) -> felt252;

    /// Create limit order (executes when trigger price is reached)
    fn create_limit_order(
        ref self: TContractState,
        market_id: felt252,
        is_long: bool,
        size: u256,
        trigger_price: u256,
        collateral_amount: u256,
    ) -> felt252;

    /// Execute limit order when trigger price is reached
    fn execute_limit_order(
        ref self: TContractState,
        proof: Span<felt252>,
        public_inputs: Span<felt252>,
        order_commitment: felt252,
    );

    /// Create TWAP order (Time Weighted Average Price)
    fn create_twap_order(
        ref self: TContractState,
        market_id: felt252,
        is_long: bool,
        total_size: u256,
        duration: u64, // Total duration in seconds
        chunk_interval: u64, // Interval between chunks in seconds (min 300 = 5 minutes)
        collateral_amount: u256,
    ) -> felt252;

    /// Execute next chunk of TWAP order (called by keeper periodically)
    fn execute_twap_chunk(
        ref self: TContractState,
        proof: Span<felt252>,
        public_inputs: Span<felt252>,
        twap_order_commitment: felt252,
    );

    /// Cancel TWAP order (if not fully executed)
    fn cancel_twap_order(ref self: TContractState, twap_order_commitment: felt252);
}

#[starknet::contract]
mod OrderHandler {
    use core::array::SpanTrait;
    use private_perp::core::data_store::{IDataStoreDispatcher, IDataStoreDispatcherTrait};
    use private_perp::core::event_emitter::{IEventEmitterDispatcher, IEventEmitterDispatcherTrait};
    use private_perp::core::oracle::{IOracleDispatcher, IOracleDispatcherTrait, Price};
    use private_perp::handlers::position_handler::{IPositionHandlerDispatcher, IPositionHandlerDispatcherTrait};
    use private_perp::order::order::{OrderType};
    use private_perp::order::order_record::{OrderRecord, order_record_new, order_record_empty};
    use private_perp::order::twap_order_record::{TWAPOrderRecord, twap_order_record_new, twap_order_record_empty, should_execute_chunk_record};
    use private_perp::order::twap_order::calculate_chunk_size;
    use starknet::{ContractAddress, get_caller_address};
    use starknet::get_block_timestamp;
    use starknet::storage::{Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess, StoragePointerWriteAccess};
    use super::IOrderHandler;

    #[storage]
    struct Storage {
        data_store: IDataStoreDispatcher,
        event_emitter: IEventEmitterDispatcher,
        oracle: IOracleDispatcher,
        position_handler: IPositionHandlerDispatcher,
        orders: Map<felt252, OrderRecord>,
        twap_orders: Map<felt252, TWAPOrderRecord>,
        order_counter: u256 // For generating unique commitments
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        data_store_address: ContractAddress,
        event_emitter_address: ContractAddress,
        oracle_address: ContractAddress,
        position_handler_address: ContractAddress,
    ) {
        self.data_store.write(IDataStoreDispatcher { contract_address: data_store_address });
        self
            .event_emitter
            .write(IEventEmitterDispatcher { contract_address: event_emitter_address });
        self.oracle.write(IOracleDispatcher { contract_address: oracle_address });
        self
            .position_handler
            .write(IPositionHandlerDispatcher { contract_address: position_handler_address });
    }

    #[external(v0)]
    impl OrderHandlerImpl of super::IOrderHandler<ContractState> {
        fn create_market_order(
            ref self: ContractState,
            proof: Span<felt252>,
            public_inputs: Span<felt252>,
            market_id: felt252,
            is_long: bool,
            size: u256,
            collateral_amount: u256,
        ) -> felt252 {
            // Market orders execute immediately at current price
            // 1. Update price from Pragma (ensure fresh)
            self.oracle.read().update_price_from_pragma(market_id);

            // 2. Get current price
            let current_price: Price = self.oracle.read().get_price(market_id);

            // 3. Execute position immediately via PositionHandler
            self.position_handler.read().open_position(proof, public_inputs);

            // 4. Generate order commitment for tracking
            let mut counter = self.order_counter.read();
            counter += 1;
            self.order_counter.write(counter);

            let commitment: felt252 = counter.low.try_into().unwrap(); // Use counter for unique commitment

            // Store minimal order record (no size/collateral for privacy)
            let order_record: OrderRecord = order_record_new(
                commitment,
                market_id,
                is_long,
                OrderType::MarketOpen,
                {
                    let price_u256: u256 = current_price.value.into();
                    price_u256
                }, // Store execution price (u128 -> u256 via Into)
                get_block_timestamp(),
            );

            self.orders.write(commitment, order_record);

            // 5. Emit event (no size to preserve privacy)
            self
                .event_emitter
                .read()
                .emit_market_order_executed(
                    commitment, market_id, is_long, current_price.value.into(),
                );

            commitment
        }

        fn create_limit_order(
            ref self: ContractState,
            market_id: felt252,
            is_long: bool,
            size: u256,
            trigger_price: u256,
            collateral_amount: u256,
        ) -> felt252 {
            // Validate trigger price
            assert(trigger_price > 0, 'INVALID_TRIGGER_PRICE');

            // Generate unique order commitment
            let mut counter = self.order_counter.read();
            counter += 1;
            self.order_counter.write(counter);

            let commitment: felt252 = counter.low.try_into().unwrap();

            // Store minimal order record (no size/collateral for privacy)
            let order_record: OrderRecord = order_record_new(
                commitment,
                market_id,
                is_long,
                OrderType::LimitOpen,
                trigger_price,
                get_block_timestamp(),
            );

            self.orders.write(commitment, order_record);

            // Emit event (no size to preserve privacy)
            self
                .event_emitter
                .read()
                .emit_limit_order_created(commitment, market_id, is_long, trigger_price);

            commitment
        }

        fn execute_limit_order(
            ref self: ContractState,
            proof: Span<felt252>,
            public_inputs: Span<felt252>,
            order_commitment: felt252,
        ) {
            let order_record: OrderRecord = self.orders.read(order_commitment);
            assert(order_record.commitment != 0, 'ORDER_NOT_FOUND');
            assert(order_record.order_type == OrderType::LimitOpen, 'NOT_LIMIT_ORDER');

            // 1. Update price from Pragma
            self.oracle.read().update_price_from_pragma(order_record.market_id);

            // 2. Get current price
            let current_price: Price = self.oracle.read().get_price(order_record.market_id);
            let current_price_u256: u256 = current_price.value.into();

            // 3. Check trigger price
            // For long: execute when price <= trigger_price (buy at or below)
            // For short: execute when price >= trigger_price (sell at or above)
            let trigger_reached: bool = if order_record.is_long {
                current_price_u256 <= order_record.trigger_price
            } else {
                current_price_u256 >= order_record.trigger_price
            };
            assert(trigger_reached, 'TRIGGER_NOT_REACHED');

            // 4. Execute position via PositionHandler
            self.position_handler.read().open_position(proof, public_inputs);

            // 5. Remove order
            self.orders.write(order_commitment, order_record_empty());

            // 7. Emit event (no size to preserve privacy)
            self
                .event_emitter
                .read()
                .emit_limit_order_executed(
                    order_commitment,
                    order_record.market_id,
                    order_record.is_long,
                    current_price_u256,
                );
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
            // Validate inputs
            assert(total_size > 0, 'INVALID_SIZE');
            assert(duration >= 300, 'DURATION_TOO_SHORT'); // Min 5 minutes
            assert(duration <= 86400, 'DURATION_TOO_LONG'); // Max 24 hours
            assert(chunk_interval >= 300, 'INTERVAL_TOO_SHORT'); // Min 5 minutes
            assert(chunk_interval <= duration, 'INTERVAL_TOO_LONG');

            // Validate chunk size calculation (off-chain, but verify it's non-zero)
            // Note: We don't store size/collateral on-chain for privacy
            let _chunk_size = calculate_chunk_size(total_size, duration, chunk_interval);
            assert(_chunk_size > 0, 'CHUNK_SIZE_ZERO');

            // Generate unique commitment
            let mut counter = self.order_counter.read();
            counter += 1;
            self.order_counter.write(counter);

            let commitment: felt252 = counter.low.try_into().unwrap();

            let current_time = get_block_timestamp();
            let start_time = current_time;
            let end_time = start_time + duration;

            // Store minimal TWAP order record (no size/collateral for privacy)
            let twap_order_record: TWAPOrderRecord = twap_order_record_new(
                commitment,
                market_id,
                is_long,
                duration,
                chunk_interval,
                start_time,
                end_time,
                current_time,
            );

            self.twap_orders.write(commitment, twap_order_record);

            // Emit event (no size to preserve privacy)
            self
                .event_emitter
                .read()
                .emit_twap_order_created(
                    commitment, market_id, is_long, duration, chunk_interval,
                );

            commitment
        }

        fn execute_twap_chunk(
            ref self: ContractState,
            proof: Span<felt252>,
            public_inputs: Span<felt252>,
            twap_order_commitment: felt252,
        ) {
            let twap_order_record: TWAPOrderRecord = self.twap_orders.read(twap_order_commitment);
            assert(twap_order_record.commitment != 0, 'TWAP_ORDER_NOT_FOUND');
            assert(twap_order_record.is_active, 'ORDER_NOT_ACTIVE');

            let current_time = get_block_timestamp();

            // Check if chunk should be executed (using record, not full order)
            assert(should_execute_chunk_record(twap_order_record, current_time), 'CHUNK_NOT_READY');

            // Check if order has ended (time-based completion)
            assert(current_time < twap_order_record.end_time, 'ORDER_COMPLETE');

            // 1. Get TWAP price from Pragma
            // Calculate TWAP over the period from start_time to now
            let twap_duration: u64 = if twap_order_record.last_execution_time == 0 {
                // First chunk - use time since start
                current_time - twap_order_record.start_time
            } else {
                // Subsequent chunks - use time since last execution
                current_time - twap_order_record.last_execution_time
            };

            let twap_start_time: u64 = if twap_order_record.last_execution_time == 0 {
                twap_order_record.start_time
            } else {
                twap_order_record.last_execution_time
            };
            let (twap_price, _decimals): (u128, u32) = self
                .oracle
                .read()
                .get_twap(
                    twap_order_record.market_id,
                    twap_duration,
                    twap_start_time,
                );

            // 2. Update regular price cache (for consistency)
            self.oracle.read().update_price_from_pragma(twap_order_record.market_id);

            // 3. Execute position chunk via PositionHandler
            // Note: Chunk size and collateral come from ZK proof outputs (not stored on-chain)
            // The proof validates the chunk size and collateral are correct
            self.position_handler.read().open_position(proof, public_inputs);

            // 4. Update TWAP order record state (only timing/status, no size/collateral)
            // Create updated record with new last_execution_time
            let is_complete: bool = current_time >= twap_order_record.end_time;
            let updated_record: TWAPOrderRecord = TWAPOrderRecord {
                commitment: twap_order_record.commitment,
                market_id: twap_order_record.market_id,
                is_long: twap_order_record.is_long,
                duration: twap_order_record.duration,
                chunk_interval: twap_order_record.chunk_interval,
                start_time: twap_order_record.start_time,
                end_time: twap_order_record.end_time,
                last_execution_time: current_time,
                is_active: if is_complete { false } else { twap_order_record.is_active },
                created_at: twap_order_record.created_at,
            };

            self.twap_orders.write(twap_order_commitment, updated_record);

            // 6. Emit event (no size to preserve privacy)
            self
                .event_emitter
                .read()
                .emit_twap_chunk_executed(
                    twap_order_commitment,
                    twap_order_record.market_id,
                    {
                        let price_u256: u256 = twap_price.into();
                        price_u256
                    },
                );
        }

        fn cancel_twap_order(ref self: ContractState, twap_order_commitment: felt252) {
            let twap_order_record: TWAPOrderRecord = self.twap_orders.read(twap_order_commitment);
            assert(twap_order_record.commitment != 0, 'TWAP_ORDER_NOT_FOUND');
            assert(twap_order_record.is_active, 'ORDER_ALREADY_COMPLETE');

            let caller = get_caller_address();
            // TODO: Add access control - only order creator can cancel
            // For now, anyone can cancel (should be restricted in production)

            // Mark as inactive - create updated record
            let updated_record: TWAPOrderRecord = TWAPOrderRecord {
                commitment: twap_order_record.commitment,
                market_id: twap_order_record.market_id,
                is_long: twap_order_record.is_long,
                duration: twap_order_record.duration,
                chunk_interval: twap_order_record.chunk_interval,
                start_time: twap_order_record.start_time,
                end_time: twap_order_record.end_time,
                last_execution_time: twap_order_record.last_execution_time,
                is_active: false,
                created_at: twap_order_record.created_at,
            };
            self.twap_orders.write(twap_order_commitment, updated_record);

            // Emit event (no size to preserve privacy)
            self
                .event_emitter
                .read()
                .emit_twap_order_cancelled(
                    twap_order_commitment,
                    twap_order_record.market_id,
                );
        }
    }
}

