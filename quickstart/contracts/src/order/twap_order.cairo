//! TWAP Order data structures and utilities

use starknet::ContractAddress;

#[derive(Drop, starknet::Store, Serde, Copy)]
pub struct TWAPOrder {
    pub commitment: felt252,
    pub market_id: felt252,
    pub is_long: bool,
    pub total_size: u256,
    pub chunk_size: u256, // Size per chunk
    pub duration: u64, // Total duration in seconds
    pub chunk_interval: u64, // Interval between chunks in seconds (e.g., 300 = 5 minutes)
    pub start_time: u64,
    pub end_time: u64,
    pub executed_size: u256, // Total size executed so far
    pub last_execution_time: u64, // Last chunk execution timestamp
    pub total_collateral: u256, // Total collateral for the order
    pub executed_collateral: u256, // Collateral used so far
    pub is_active: bool,
    pub created_at: u64,
}

/// Calculate chunk size for TWAP order
pub fn calculate_chunk_size(total_size: u256, duration: u64, chunk_interval: u64) -> u256 {
    // Number of chunks = duration / chunk_interval
    let num_chunks = if chunk_interval > 0 {
        duration / chunk_interval
    } else {
        1 // At least 1 chunk
    };

    // Chunk size = total_size / num_chunks
    if num_chunks > 0 {
        total_size / num_chunks.into()
    } else {
        total_size // Single chunk if duration is 0
    }
}

/// Check if TWAP order chunk should be executed
pub fn should_execute_chunk(order: TWAPOrder, current_time: u64) -> bool {
    // Check if order is still active
    if !order.is_active {
        return false;
    }

    // Check if order has ended
    if current_time >= order.end_time {
        return false;
    }

    // Check if enough time has passed since last execution
    if order.last_execution_time == 0 {
        // First chunk - execute if start_time has passed
        return current_time >= order.start_time;
    }

    // Check if chunk_interval has passed
    let time_since_last = current_time - order.last_execution_time;
    time_since_last >= order.chunk_interval
}

/// Get remaining size for TWAP order
pub fn get_remaining_size(order: TWAPOrder) -> u256 {
    if order.total_size > order.executed_size {
        order.total_size - order.executed_size
    } else {
        0
    }
}

impl TWAPOrderDefault of core::traits::Default<TWAPOrder> {
    fn default() -> TWAPOrder {
        TWAPOrder {
            commitment: 0,
            market_id: 0,
            is_long: false,
            total_size: 0,
            chunk_size: 0,
            duration: 0,
            chunk_interval: 0,
            start_time: 0,
            end_time: 0,
            executed_size: 0,
            last_execution_time: 0,
            total_collateral: 0,
            executed_collateral: 0,
            is_active: false,
            created_at: 0,
        }
    }
}

