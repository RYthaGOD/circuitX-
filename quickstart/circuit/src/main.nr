//! Main entry point for private perp trading circuit
//! Routes to appropriate perp functions based on action type

mod perp;

/// Main function that routes to different perp actions
/// action: 0 = open_market, 1 = open_limit, 2 = open_twap, 3 = close, 4 = close_tp, 5 = close_sl, 6 = liquidation
/// Returns: commitment hash (ALL position details are PRIVATE)
/// Note: Size, collateral, direction, PnL, fees are all validated in circuit but NOT revealed
fn main(
    action: pub Field,
    // Private inputs (common) - ALL PRIVATE
    private_margin: Field,
    private_position_size: Field,
    private_entry_price: Field,
    private_trader_secret: Field,
    is_long: Field,  // Now private - encoded in commitment
    
    // Public inputs (common)
    market_id: pub Field,
    oracle_price: pub Field,
    current_time: pub Field,        // Current block timestamp
    price_timestamp: pub Field,
    num_sources: pub Field,
    min_sources: pub Field,
    max_price_age: pub Field,
    
    // Additional inputs based on action
    price_impact: pub Field,
    execution_price: pub Field,
    acceptable_slippage: pub Field,
    leverage: pub Field,
    min_margin_ratio: pub Field,
    max_position_size: pub Field,
    trigger_price: pub Field,
    current_price: pub Field,
    closing_size: pub Field,
    take_profit_price: pub Field,
    stop_loss_price: pub Field,
    trading_fee_bps: pub Field,
    // TWAP-specific inputs
    twap_price: pub Field,
    twap_duration: pub Field,
    chunk_index: pub Field,
    total_chunks: pub Field,
) -> pub Field {
    // Return: Only commitment hash
    // All position details (size, collateral, direction, PnL, fees) are PRIVATE
    
    if action == 0 {
        // Open position (market order)
        let commitment = perp::open_position_market(
            private_margin,
            private_position_size,
            private_trader_secret,
            is_long,  // Now private
            market_id,
            oracle_price,
            price_impact,
            execution_price,
            acceptable_slippage,
            leverage,
            min_margin_ratio,
            max_position_size,
            current_time,
            price_timestamp,
            num_sources,
            min_sources,
            max_price_age,
        );
        commitment
    } else if action == 1 {
        // Open position (limit order)
        let commitment = perp::open_position_limit(
            private_margin,
            private_position_size,
            private_trader_secret,
            is_long,  // Now private
            market_id,
            oracle_price,
            trigger_price,
            price_impact,
            execution_price,
            acceptable_slippage,
            leverage,
            min_margin_ratio,
            max_position_size,
            current_time,
            price_timestamp,
            num_sources,
            min_sources,
            max_price_age,
        );
        commitment
    } else if action == 2 {
        // Open position (TWAP order)
        let commitment = perp::open_position_twap(
            private_margin,
            private_position_size,
            private_trader_secret,
            is_long,  // Now private
            market_id,
            twap_price,
            price_impact,
            execution_price,
            acceptable_slippage,
            leverage,
            min_margin_ratio,
            max_position_size,
            current_time,
            price_timestamp,
            twap_duration,
            num_sources,
            min_sources,
            max_price_age,
            chunk_index,
            total_chunks,
        );
        commitment
    } else if action == 3 {
        // Close position
        let commitment = perp::close_position(
            private_margin,
            private_position_size,
            private_entry_price,
            private_trader_secret,
            is_long,  // Now private
            market_id,
            current_price,
            current_time,
            price_timestamp,
            closing_size,
            num_sources,
            min_sources,
            max_price_age,
            trading_fee_bps,
        );
        commitment
    } else if action == 4 {
        // Close position (take profit)
        let commitment = perp::close_position_take_profit(
            private_margin,
            private_position_size,
            private_entry_price,
            private_trader_secret,
            is_long,  // Now private
            market_id,
            current_price,
            take_profit_price,
            current_time,
            price_timestamp,
            closing_size,
            num_sources,
            min_sources,
            max_price_age,
            trading_fee_bps,
        );
        commitment
    } else if action == 5 {
        // Close position (stop loss)
        let commitment = perp::close_position_stop_loss(
            private_margin,
            private_position_size,
            private_entry_price,
            private_trader_secret,
            is_long,  // Now private
            market_id,
            current_price,
            stop_loss_price,
            current_time,
            price_timestamp,
            closing_size,
            num_sources,
            min_sources,
            max_price_age,
            trading_fee_bps,
        );
        commitment
    } else if action == 6 {
        // Check liquidation
        let commitment = perp::check_liquidation(
            private_margin,
            private_position_size,
            private_entry_price,
            private_trader_secret,
            is_long,  // Now private
            market_id,
            current_price,
            current_time,
            price_timestamp,
            min_margin_ratio,
            max_price_age,
            num_sources,
            min_sources,
        );
        commitment
    } else {
        // Invalid action - return zero commitment (will be rejected on-chain)
        0
    }
}

#[test]
fn test_open_position_twap() {
    let commitment = perp::open_position_twap(
        100,      // private_margin
        1000,     // private_position_size (chunk size)
        12345,    // private_trader_secret
        1,        // is_long (now private)
        1,        // market_id
        50000,    // twap_price
        50,       // price_impact
        50050,    // execution_price
        100,      // acceptable_slippage (1%)
        10,       // leverage (10x)
        5,        // min_margin_ratio (5%)
        10000,    // max_position_size
        1000000,  // current_time
        1000000,  // price_timestamp
        1800,     // twap_duration (30 minutes)
        5,        // num_sources
        3,        // min_sources
        60,       // max_price_age
        0,        // chunk_index (first chunk)
        6,        // total_chunks
    );
    assert(commitment != 0);
}

#[test]
fn test_open_position_market() {
    let commitment = perp::open_position_market(
        100,      // private_margin
        1000,     // private_position_size
        12345,    // private_trader_secret
        1,        // is_long (now private)
        1,        // market_id
        50000,    // oracle_price
        50,       // price_impact
        50050,    // execution_price
        100,      // acceptable_slippage (1%)
        10,       // leverage (10x)
        5,        // min_margin_ratio (5%)
        10000,    // max_position_size
        1000000,  // current_time
        1000000,  // price_timestamp
        5,        // num_sources
        3,        // min_sources
        60,       // max_price_age
    );
    assert(commitment != 0);
}

#[test]
fn test_close_position() {
    let commitment = perp::close_position(
        100,      // private_margin
        1000,     // private_position_size
        50000,    // private_entry_price
        12345,    // private_trader_secret
        1,        // is_long (now private)
        1,        // market_id
        51000,    // current_price
        1000000,  // current_time
        1000000,  // price_timestamp
        1000,     // closing_size
        5,        // num_sources
        3,        // min_sources
        60,       // max_price_age
        10,       // trading_fee_bps (0.1%)
    );
    assert(commitment != 0);
}

#[test]
fn test_check_liquidation() {
    let commitment = perp::check_liquidation(
        100,      // private_margin
        1000,     // private_position_size
        50000,    // private_entry_price
        12345,    // private_trader_secret
        1,        // is_long (now private)
        1,        // market_id
        49000,    // current_price (loss)
        1000000,  // current_time
        1000000,  // price_timestamp
        5,        // min_margin_ratio (5%)
        60,       // max_price_age
        5,        // num_sources
        3,        // min_sources
    );
    assert(commitment != 0);
}
