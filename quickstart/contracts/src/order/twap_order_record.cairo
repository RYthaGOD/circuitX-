//! Minimal TWAP order metadata stored on-chain so that size/collateral remain private.

#[derive(Copy, Drop, Serde, starknet::Store)]
pub struct TWAPOrderRecord {
    pub commitment: felt252,
    pub market_id: felt252,
    pub is_long: bool,
    pub duration: u64, // Total duration in seconds
    pub chunk_interval: u64, // Interval between chunks in seconds
    pub start_time: u64,
    pub end_time: u64,
    pub last_execution_time: u64, // Last chunk execution timestamp
    pub is_active: bool,
    pub created_at: u64,
}

pub fn twap_order_record_new(
    commitment: felt252,
    market_id: felt252,
    is_long: bool,
    duration: u64,
    chunk_interval: u64,
    start_time: u64,
    end_time: u64,
    created_at: u64,
) -> TWAPOrderRecord {
    TWAPOrderRecord {
        commitment,
        market_id,
        is_long,
        duration,
        chunk_interval,
        start_time,
        end_time,
        last_execution_time: 0,
        is_active: true,
        created_at,
    }
}

pub fn twap_order_record_empty() -> TWAPOrderRecord {
    TWAPOrderRecord {
        commitment: 0,
        market_id: 0,
        is_long: false,
        duration: 0,
        chunk_interval: 0,
        start_time: 0,
        end_time: 0,
        last_execution_time: 0,
        is_active: false,
        created_at: 0,
    }
}

/// Check if TWAP order chunk should be executed (using record, not full order)
pub fn should_execute_chunk_record(record: TWAPOrderRecord, current_time: u64) -> bool {
    // Check if order is still active
    if !record.is_active {
        return false;
    }

    // Check if order has ended
    if current_time >= record.end_time {
        return false;
    }

    // Check if enough time has passed since last execution
    if record.last_execution_time == 0 {
        // First chunk - execute if start_time has passed
        return current_time >= record.start_time;
    }

    // Check if chunk_interval has passed
    let time_since_last = current_time - record.last_execution_time;
    time_since_last >= record.chunk_interval
}

