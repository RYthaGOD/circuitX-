//! Order Handler Contract - Handles market, limit, and TWAP orders

use core::array::SpanTrait;
use private_perp::core::data_store::{IDataStoreDispatcher, IDataStoreDispatcherTrait};
use private_perp::core::event_emitter::{IEventEmitterDispatcher, IEventEmitterDispatcherTrait};
use private_perp::core::oracle::{IOracleDispatcher, IOracleDispatcherTrait};
use private_perp::handlers::position_handler::IPositionHandlerDispatcher;
use private_perp::order::order::{Order, OrderType};
use private_perp::order::order_utils::check_trigger_price;
use private_perp::order::twap_order::{
    TWAPOrder, calculate_chunk_size, get_remaining_size, should_execute_chunk,
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
    use private_perp::core::oracle::{IOracleDispatcher, IOracleDispatcherTrait};
    use private_perp::handlers::position_handler::{IPositionHandlerDispatcher, IPositionHandlerDispatcherTrait};
    use private_perp::order::order::{Order, OrderType};
    use private_perp::order::order_utils::check_trigger_price;
    use private_perp::order::twap_order::{
        TWAPOrder, calculate_chunk_size, get_remaining_size, should_execute_chunk,
    };
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
        orders: Map<felt252, Order>,
        twap_orders: Map<felt252, TWAPOrder>,
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
            let current_price = self.oracle.read().get_price(market_id);

            // 3. Execute position immediately via PositionHandler
            self.position_handler.read().open_position(proof, public_inputs);

            // 4. Generate order commitment for tracking
            let mut counter = self.order_counter.read();
            counter += 1;
            self.order_counter.write(counter);

            let commitment = counter.low.into(); // Use counter for unique commitment

            let order = Order {
                commitment,
                market_id,
                is_long,
                order_type: OrderType::MarketOpen,
                trigger_price: current_price.value.into(), // Store execution price
                size,
                collateral_amount,
                created_at: get_block_timestamp(),
            };

            self.orders.write(commitment, order);

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

            let commitment = counter.into();

            let order = Order {
                commitment,
                market_id,
                is_long,
                order_type: OrderType::LimitOpen,
                trigger_price,
                size,
                collateral_amount,
                created_at: get_block_timestamp(),
            };

            self.orders.write(commitment, order);

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
            let order = self.orders.read(order_commitment);
            assert(order.commitment != 0, 'ORDER_NOT_FOUND');
            assert(order.order_type == OrderType::LimitOpen, 'NOT_LIMIT_ORDER');

            // 1. Update price from Pragma
            self.oracle.read().update_price_from_pragma(order.market_id);

            // 2. Get current price
            let current_price = self.oracle.read().get_price(order.market_id);
            let current_price_u256 = current_price.value.into();

            // 3. Check trigger price
            // For long: execute when price <= trigger_price (buy at or below)
            // For short: execute when price >= trigger_price (sell at or above)
            let trigger_reached = if order.is_long {
                current_price_u256 <= order.trigger_price
            } else {
                current_price_u256 >= order.trigger_price
            };
            assert(trigger_reached, 'TRIGGER_NOT_REACHED');

            // 4. Execute position via PositionHandler
            self.position_handler.read().open_position(proof, public_inputs);

            // 5. Remove order
            self.orders.write(order_commitment, Order::default());

            // 7. Emit event (no size to preserve privacy)
            self
                .event_emitter
                .read()
                .emit_limit_order_executed(
                    order_commitment,
                    order.market_id,
                    order.is_long,
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

            // Calculate chunk size
            let chunk_size = calculate_chunk_size(total_size, duration, chunk_interval);
            assert(chunk_size > 0, 'CHUNK_SIZE_ZERO');

            // Generate unique commitment
            let mut counter = self.order_counter.read();
            counter += 1;
            self.order_counter.write(counter);

            let commitment = counter.into();

            let current_time = get_block_timestamp();
            let start_time = current_time;
            let end_time = start_time + duration;

            let twap_order = TWAPOrder {
                commitment,
                market_id,
                is_long,
                total_size,
                chunk_size,
                duration,
                chunk_interval,
                start_time,
                end_time,
                executed_size: 0,
                last_execution_time: 0,
                total_collateral: collateral_amount,
                executed_collateral: 0,
                is_active: true,
                created_at: current_time,
            };

            self.twap_orders.write(commitment, twap_order);

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
            let mut twap_order = self.twap_orders.read(twap_order_commitment);
            assert(twap_order.commitment != 0, 'TWAP_ORDER_NOT_FOUND');
            assert(twap_order.is_active, 'ORDER_NOT_ACTIVE');

            let current_time = get_block_timestamp();

            // Check if chunk should be executed
            assert(should_execute_chunk(twap_order, current_time), 'CHUNK_NOT_READY');

            // Calculate remaining size
            let remaining_size = get_remaining_size(twap_order);
            assert(remaining_size > 0, 'ORDER_COMPLETE');

            // Determine chunk size to execute
            let chunk_to_execute = if remaining_size < twap_order.chunk_size {
                remaining_size // Last chunk might be smaller
            } else {
                twap_order.chunk_size
            };

            // 1. Get TWAP price from Pragma
            // Calculate TWAP over the period from start_time to now
            let twap_duration = if twap_order.last_execution_time == 0 {
                // First chunk - use time since start
                current_time - twap_order.start_time
            } else {
                // Subsequent chunks - use time since last execution
                current_time - twap_order.last_execution_time
            };

            let (twap_price, _decimals) = self
                .oracle
                .read()
                .get_twap(
                    twap_order.market_id,
                    twap_duration,
                    if twap_order.last_execution_time == 0 {
                        twap_order.start_time
                    } else {
                        twap_order.last_execution_time
                    },
                );

            // 2. Update regular price cache (for consistency)
            self.oracle.read().update_price_from_pragma(twap_order.market_id);

            // 3. Calculate collateral for this chunk
            // collateral_per_chunk = (chunk_size / total_size) * total_collateral
            let chunk_collateral = if twap_order.total_size > 0 {
                (chunk_to_execute * twap_order.total_collateral) / twap_order.total_size
            } else {
                0
            };

            // 4. Execute position chunk via PositionHandler
            // Note: For TWAP, each chunk opens a new position or increases existing position
            // The frontend should handle accumulating these into a single position view
            self.position_handler.read().open_position(proof, public_inputs);

            // 5. Update TWAP order state
            twap_order.executed_size += chunk_to_execute;
            twap_order.executed_collateral += chunk_collateral;
            twap_order.last_execution_time = current_time;

            // Check if order is complete
            if twap_order.executed_size >= twap_order.total_size {
                twap_order.is_active = false;
            }

            self.twap_orders.write(twap_order_commitment, twap_order);

            // 6. Emit event (no size to preserve privacy)
            self
                .event_emitter
                .read()
                .emit_twap_chunk_executed(
                    twap_order_commitment,
                    twap_order.market_id,
                    twap_price.into(),
                );
        }

        fn cancel_twap_order(ref self: ContractState, twap_order_commitment: felt252) {
            let mut twap_order = self.twap_orders.read(twap_order_commitment);
            assert(twap_order.commitment != 0, 'TWAP_ORDER_NOT_FOUND');
            assert(twap_order.is_active, 'ORDER_ALREADY_COMPLETE');

            let caller = get_caller_address();
            // TODO: Add access control - only order creator can cancel
            // For now, anyone can cancel (should be restricted in production)

            // Mark as inactive
            twap_order.is_active = false;
            self.twap_orders.write(twap_order_commitment, twap_order);

            // Emit event (no size to preserve privacy)
            self
                .event_emitter
                .read()
                .emit_twap_order_cancelled(
                    twap_order_commitment,
                    twap_order.market_id,
                );
        }
    }
}

