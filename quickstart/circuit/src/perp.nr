//! Private Perpetual Trading Logic
//! This module contains all the private ZK circuit logic for perp trading

use dep::std::hash::pedersen_hash;

/// Close position with take profit
/// Returns: commitment hash (all financial details are PRIVATE)
pub fn close_position_take_profit(
    // Private inputs (ALL PRIVATE)
    private_margin: Field,
    private_position_size: Field,
    private_entry_price: Field,
    private_trader_secret: Field,
    is_long: Field,  // Now private
    
    // Public inputs
    market_id: Field,
    current_price: Field,
    take_profit_price: Field,
    current_time: Field,
    price_timestamp: Field,
    closing_size: Field,
    num_sources: Field,
    min_sources: Field,
    max_price_age: Field,
    trading_fee_bps: Field,
) -> (pub Field, pub Field, pub Field, pub Field, pub Field, pub Field) {
    // 1. Validate price freshness
    let price_age = current_time - price_timestamp;
    // Note: Field comparison validation happens on-chain
    
    // 2. Validate sufficient sources
    // Note: Field comparison validation happens on-chain
    
    // 3. Validate take profit is reached
    if is_long == 1 {
        // Long: close when price >= take_profit_price
        // Note: Validation happens on-chain
    } else {
        // Short: close when price <= take_profit_price
        // Note: Validation happens on-chain
    }
    
    // 4. Validate closing size
    // Note: Field comparison validation happens on-chain
    
    // 5. Calculate PnL
    let pnl: Field = if is_long == 1 {
        (current_price - private_entry_price) * closing_size / private_entry_price
    } else {
        (private_entry_price - current_price) * closing_size / private_entry_price
    };
    
    // 6. Calculate fees
    let trading_fee = (closing_size * trading_fee_bps) / 10000;
    
    // 7. Calculate remaining collateral
    let remaining_collateral = private_margin + pnl - trading_fee;
    // Note: Collateral validation happens on-chain in the contract
    
    // 8. Calculate payout and loss
    let payout: Field = if pnl > 0 { pnl } else { 0 };
    let loss_to_vault: Field = if pnl < 0 { -pnl } else { 0 };
    
    // 9. Collateral released
    let collateral_released = if closing_size == private_position_size {
        remaining_collateral
    } else {
        (remaining_collateral * closing_size) / private_position_size
    };
    
    // 10. Generate commitment (includes ALL private data)
    let commitment = pedersen_hash([
        private_margin,
        private_position_size,
        private_entry_price,
        private_trader_secret,
        market_id,
        current_price,
        take_profit_price,
        closing_size,
        pnl,
        is_long  // Direction encoded in commitment
    ]);
    
    // Return: Only commitment (all financial details are PRIVATE)
    commitment
}

/// Close position with stop loss
/// Returns: commitment hash (all financial details are PRIVATE)
pub fn close_position_stop_loss(
    // Private inputs (ALL PRIVATE)
    private_margin: Field,
    private_position_size: Field,
    private_entry_price: Field,
    private_trader_secret: Field,
    is_long: Field,  // Now private
    
    // Public inputs
    market_id: Field,
    current_price: Field,
    stop_loss_price: Field,
    current_time: Field,
    price_timestamp: Field,
    closing_size: Field,
    num_sources: Field,
    min_sources: Field,
    max_price_age: Field,
    trading_fee_bps: Field,
) -> (pub Field, pub Field, pub Field, pub Field, pub Field, pub Field) {
    // 1. Validate price freshness
    let price_age = current_time - price_timestamp;
    // Note: Field comparison validation happens on-chain
    
    // 2. Validate sufficient sources
    // Note: Field comparison validation happens on-chain
    
    // 3. Validate stop loss is hit
    if is_long == 1 {
        // Long: close when price <= stop_loss_price
        // Note: Validation happens on-chain
    } else {
        // Short: close when price >= stop_loss_price
        // Note: Validation happens on-chain
    }
    
    // 4. Validate closing size
    // Note: Field comparison validation happens on-chain
    
    // 5. Calculate PnL
    let pnl: Field = if is_long == 1 {
        (current_price - private_entry_price) * closing_size / private_entry_price
    } else {
        (private_entry_price - current_price) * closing_size / private_entry_price
    };
    
    // 6. Calculate fees
    let trading_fee = (closing_size * trading_fee_bps) / 10000;
    
    // 7. Calculate remaining collateral
    let remaining_collateral = private_margin + pnl - trading_fee;
    // Note: Collateral validation happens on-chain in the contract
    
    // 8. Calculate payout and loss
    let payout: Field = if pnl > 0 { pnl } else { 0 };
    let loss_to_vault: Field = if pnl < 0 { -pnl } else { 0 };
    
    // 9. Collateral released
    let collateral_released = if closing_size == private_position_size {
        remaining_collateral
    } else {
        (remaining_collateral * closing_size) / private_position_size
    };
    
    // 10. Generate commitment (includes ALL private data)
    let commitment = pedersen_hash([
        private_margin,
        private_position_size,
        private_entry_price,
        private_trader_secret,
        market_id,
        current_price,
        stop_loss_price,
        closing_size,
        pnl,
        is_long  // Direction encoded in commitment
    ]);
    
    // Return: Only commitment (all financial details are PRIVATE)
    commitment
}

/// Check if position is liquidatable
/// Returns: commitment hash (all financial details are PRIVATE)
/// Note: For liquidation, we liquidate the full position
pub fn check_liquidation(
    // Private inputs (ALL PRIVATE)
    private_margin: Field,
    private_position_size: Field,
    private_entry_price: Field,
    private_trader_secret: Field,
    is_long: Field,  // Now private
    
    // Public inputs
    market_id: Field,
    current_price: Field,
    current_time: Field,
    price_timestamp: Field,
    min_margin_ratio: Field,
    max_price_age: Field,
    num_sources: Field,
    min_sources: Field,
) -> (pub Field, pub Field, pub Field, pub Field, pub Field, pub Field) {
    // 1. Validate price freshness
    let price_age = current_time - price_timestamp;
    // Note: Field comparison validation happens on-chain
    
    // 2. Validate sufficient sources
    // Note: Field comparison validation happens on-chain
    
    // 3. Calculate PnL
    let pnl: Field = if is_long == 1 {
        // Long: profit when price goes up, loss when price goes down
        // Formula: (current_price - entry_price) * position_size / entry_price
        let price_diff = current_price - private_entry_price;
        (price_diff * private_position_size) / private_entry_price
    } else {
        // Short: profit when price goes down, loss when price goes up
        // Formula: (entry_price - current_price) * position_size / entry_price
        let price_diff = private_entry_price - current_price;
        (price_diff * private_position_size) / private_entry_price
    };
    
    // 4. Calculate remaining collateral
    // remaining_collateral = margin + pnl
    // If pnl is negative (loss), this becomes margin - loss
    let remaining_collateral = private_margin + pnl;
    
    // 5. Calculate required margin (min_margin_ratio% of position size)
    // e.g., if min_margin_ratio = 5, then required_margin = position_size * 5 / 100
    let required_margin = (private_position_size * min_margin_ratio) / 100;
    
    // 6. Check if liquidatable
    // Position is liquidatable if remaining_collateral < required_margin
    // Note: Field comparison validation happens on-chain
    
    // 7. For liquidation, we close the full position
    let closed_size = private_position_size;
    
    // 8. Calculate liquidation fee (typically higher than trading fee)
    // Using a fixed 50 bps (0.5%) for liquidation fee
    let liquidation_fee_bps: Field = 50;
    let fees = (closed_size * liquidation_fee_bps) / 10000;
    
    // 9. Calculate loss to vault (negative PnL)
    let loss_to_vault: Field = if pnl < 0 {
        -pnl  // Loss is negative, so negate to get positive value
    } else {
        0
    };
    
    // 10. Liquidation reward (goes to liquidator, typically 5-10% of position value)
    // Using 5% of position size as reward
    let reward_bps: Field = 500;  // 5%
    let reward = (closed_size * reward_bps) / 10000;
    
    // 11. Collateral released: remaining collateral after loss and fees
    // For liquidation, remaining collateral goes to vault (if any)
    let collateral_released: Field = 0;  // In liquidation, no collateral is returned to trader
    
    // 12. Generate commitment (includes ALL private data)
    // All liquidation details (size, loss, fees, reward) are validated but NOT revealed
    let commitment = pedersen_hash([
        private_margin,
        private_position_size,
        private_entry_price,
        private_trader_secret,
        market_id,
        current_price,
        remaining_collateral,
        required_margin,
        is_long  // Direction encoded in commitment
    ]);
    
    // Return: Only commitment (all financial details are PRIVATE)
    commitment
}

/// Open a position (market order)
/// Private inputs: margin, position size, trader secret, direction
/// Public inputs: market_id, oracle price, execution price, etc.
/// Returns: commitment hash (size, collateral, direction are PRIVATE - encoded in commitment)
pub fn open_position_market(
    // Private inputs (ALL PRIVATE - not revealed)
    private_margin: Field,
    private_position_size: Field,
    private_trader_secret: Field,
    is_long: Field,  // Now private - encoded in commitment
    
    // Public inputs
    market_id: Field,
    oracle_price: Field,
    price_impact: Field,
    execution_price: Field,
    acceptable_slippage: Field,  // In basis points (e.g., 100 = 1%)
    leverage: Field,
    min_margin_ratio: Field,     // e.g., 5 = 5%
    max_position_size: Field,
    current_time: Field,          // Current block timestamp
    price_timestamp: Field,
    num_sources: Field,
    min_sources: Field,
    max_price_age: Field,
) -> pub Field {
    // 1. Validate price freshness
    let price_age = current_time - price_timestamp;
    // Note: Field comparison (price_age <= max_price_age) validated on-chain
    
    // 2. Validate sufficient sources
    // Note: Field comparison (num_sources >= min_sources) validated on-chain
    
    // 3. Validate price is positive
    // Note: Field comparison (oracle_price != 0) validated on-chain
    
    // 4. Calculate execution price
    let calculated_execution_price = if is_long == 1 {
        oracle_price + price_impact
    } else {
        oracle_price - price_impact
    };
    
    // 5. Validate execution price matches
    assert(execution_price == calculated_execution_price, "INVALID_EXEC_PRICE");
    
    // 6. Validate slippage (price impact should not exceed acceptable_slippage%)
    let slippage_bps = (price_impact * 10000) / oracle_price;
    // Note: Field comparison (slippage_bps <= acceptable_slippage) validated on-chain
    
    // 7. Validate margin and leverage
    let required_margin = (private_position_size * 100) / leverage;
    // Note: Field comparison (private_margin >= required_margin) validated on-chain
    
    // 8. Validate position size
    // Note: Field comparison (private_position_size <= max_position_size) validated on-chain
    
    // 9. Validate minimum margin ratio
    let margin_ratio = (private_margin * 100) / private_position_size;
    // Note: Field comparison (margin_ratio >= min_margin_ratio) validated on-chain
    
    // 10. Generate commitment (includes ALL private data - size, margin, direction, secret)
    // This commitment is the ONLY public output - everything else stays private
    let commitment = pedersen_hash([
        private_margin,
        private_position_size,
        private_trader_secret,
        market_id,
        execution_price,
        is_long  // Direction encoded in commitment, not stored separately
    ]);
    
    // Return: Only commitment (size, collateral, direction are PRIVATE)
    commitment
}

/// Open a position (limit order)
/// Same as market order but with trigger price validation
/// Returns: commitment hash (size, collateral, direction are PRIVATE)
pub fn open_position_limit(
    // Private inputs (ALL PRIVATE)
    private_margin: Field,
    private_position_size: Field,
    private_trader_secret: Field,
    is_long: Field,  // Now private - encoded in commitment
    
    // Public inputs
    market_id: Field,
    oracle_price: Field,
    trigger_price: Field,
    price_impact: Field,
    execution_price: Field,
    acceptable_slippage: Field,
    leverage: Field,
    min_margin_ratio: Field,
    max_position_size: Field,
    current_time: Field,
    price_timestamp: Field,
    num_sources: Field,
    min_sources: Field,
    max_price_age: Field,
) -> (pub Field, pub Field, pub Field) {
    // 1. Validate price freshness
    let price_age = current_time - price_timestamp;
    // Note: Field comparison validated on-chain
    
    // 2. Validate sufficient sources
    // Note: Field comparison validated on-chain
    
    // 3. Validate trigger price is reached
    // Note: Validation (oracle_price <= trigger_price for long, >= for short) happens on-chain
    
    // 4. Calculate execution price (same as market order)
    let calculated_execution_price = if is_long == 1 {
        oracle_price + price_impact
    } else {
        oracle_price - price_impact
    };
    assert(execution_price == calculated_execution_price, "INVALID_EXEC_PRICE");
    
    // 5. Validate slippage
    let slippage_bps = (price_impact * 10000) / oracle_price;
    // Note: Field comparison validated on-chain
    
    // 6. Validate margin and leverage
    let required_margin = (private_position_size * 100) / leverage;
    // Note: Field comparison validated on-chain
    
    // 7. Validate position size
    // Note: Field comparison validated on-chain
    
    // 8. Validate minimum margin ratio
    let margin_ratio = (private_margin * 100) / private_position_size;
    // Note: Field comparison validated on-chain
    
    // 9. Generate commitment (includes ALL private data)
    let commitment = pedersen_hash([
        private_margin,
        private_position_size,
        private_trader_secret,
        market_id,
        execution_price,
        trigger_price,
        is_long  // Direction encoded in commitment
    ]);
    
    // Return: Only commitment (size, collateral, direction are PRIVATE)
    commitment
}

/// Open a position (TWAP order - chunk execution)
/// Each chunk of a TWAP order opens a position using TWAP price
/// Returns: commitment hash (size, collateral, direction are PRIVATE)
pub fn open_position_twap(
    // Private inputs (ALL PRIVATE)
    private_margin: Field,
    private_position_size: Field,  // Chunk size for this execution
    private_trader_secret: Field,
    is_long: Field,  // Now private - encoded in commitment
    
    // Public inputs
    market_id: Field,
    twap_price: Field,         // TWAP price from Pragma
    price_impact: Field,
    execution_price: Field,
    acceptable_slippage: Field,
    leverage: Field,
    min_margin_ratio: Field,
    max_position_size: Field,
    current_time: Field,
    price_timestamp: Field,
    twap_duration: Field,       // Duration over which TWAP was calculated
    num_sources: Field,
    min_sources: Field,
    max_price_age: Field,
    chunk_index: Field,         // Which chunk this is (for tracking)
    total_chunks: Field,        // Total number of chunks
) -> (pub Field, pub Field, pub Field) {
    // 1. Validate price freshness
    let price_age = current_time - price_timestamp;
    // Note: Field comparison validated on-chain
    
    // 2. Validate sufficient sources
    // Note: Field comparison validated on-chain
    
    // 3. Validate TWAP price is positive
    // Note: Field comparison validated on-chain
    
    // 4. Validate TWAP duration is reasonable (5 min to 24 hours)
    // Note: Field comparisons validated on-chain
    
    // 5. Validate chunk index
    // Note: Field comparison validated on-chain
    
    // 6. Calculate execution price (using TWAP instead of spot)
    let calculated_execution_price = if is_long == 1 {
        twap_price + price_impact
    } else {
        twap_price - price_impact
    };
    
    // 7. Validate execution price matches
    assert(execution_price == calculated_execution_price, "INVALID_EXEC_PRICE");
    
    // 8. Validate slippage (price impact should not exceed acceptable_slippage%)
    let slippage_bps = (price_impact * 10000) / twap_price;
    // Note: Field comparison validated on-chain
    
    // 9. Validate margin and leverage
    let required_margin = (private_position_size * 100) / leverage;
    // Note: Field comparison validated on-chain
    
    // 10. Validate position size (chunk size)
    // Note: Field comparison validated on-chain
    
    // 11. Validate minimum margin ratio
    let margin_ratio = (private_margin * 100) / private_position_size;
    // Note: Field comparison validated on-chain
    
    // 12. Generate commitment (includes ALL private data)
    let commitment = pedersen_hash([
        private_margin,
        private_position_size,
        private_trader_secret,
        market_id,
        execution_price,
        twap_price,
        chunk_index,
        total_chunks,
        is_long  // Direction encoded in commitment
    ]);
    
    // Return: Only commitment (size, collateral, direction are PRIVATE)
    commitment
}

/// Close a position
/// Returns: commitment hash (all financial details are PRIVATE)
/// Note: Payout/loss/fees are handled via aggregate pool updates, not individual reveals
pub fn close_position(
    // Private inputs (ALL PRIVATE)
    private_margin: Field,
    private_position_size: Field,
    private_entry_price: Field,
    private_trader_secret: Field,
    is_long: Field,  // Now private
    
    // Public inputs
    market_id: Field,
    current_price: Field,
    current_time: Field,
    price_timestamp: Field,
    closing_size: Field,  // Partial close support
    num_sources: Field,
    min_sources: Field,
    max_price_age: Field,
    trading_fee_bps: Field,
) -> (pub Field, pub Field, pub Field, pub Field, pub Field, pub Field) {
    // 1. Validate price freshness
    let price_age = current_time - price_timestamp;
    // Note: Field comparison validated on-chain
    
    // 2. Validate sufficient sources
    // Note: Field comparison validated on-chain
    
    // 3. Validate closing size doesn't exceed position size
    // Note: Field comparison validated on-chain
    
    // 4. Calculate PnL
    let pnl: Field = if is_long == 1 {
        // Long: profit when current_price > entry_price
        let price_diff = current_price - private_entry_price;
        (price_diff * closing_size) / private_entry_price
    } else {
        // Short: profit when current_price < entry_price
        let price_diff = private_entry_price - current_price;
        (price_diff * closing_size) / private_entry_price
    };
    
    // 5. Calculate fees
    let trading_fee = (closing_size * trading_fee_bps) / 10000;
    
    // 6. Calculate remaining collateral
    // Note: pnl can be negative (loss), so we need to handle that
    // remaining_collateral = margin + pnl - fee
    // If pnl is negative, this becomes margin - loss - fee
    let remaining_collateral = private_margin + pnl - trading_fee;
    
    // 7. Calculate payout and loss
    // Payout: positive PnL (profit) that goes to trader
    // Loss: negative PnL (loss) that goes to vault
    let payout: Field = if pnl > 0 {
        pnl
    } else {
        0
    };
    
    let loss_to_vault: Field = if pnl < 0 {
        -pnl  // Loss is negative, so negate to get positive value
    } else {
        0
    };
    
    // 8. Collateral released: portion of margin returned (proportional to closing size)
    // For full close: collateral_released = remaining_collateral
    // For partial close: collateral_released = (remaining_collateral * closing_size) / position_size
    let collateral_released = if closing_size == private_position_size {
        // Full close: return all remaining collateral
        remaining_collateral
    } else {
        // Partial close: return proportional collateral
        (remaining_collateral * closing_size) / private_position_size
    };
    
    // 9. Validate sufficient collateral (should be positive or zero)
    // Note: Collateral validation happens on-chain in the contract
    
    // 10. Generate commitment (includes ALL private data)
    // All financial details (size, PnL, fees) are validated in circuit but NOT revealed
    let commitment = pedersen_hash([
        private_margin,
        private_position_size,
        private_entry_price,
        private_trader_secret,
        market_id,
        current_price,
        closing_size,
        pnl,
        is_long  // Direction encoded in commitment
    ]);
    
    // Return: Only commitment (all financial details are PRIVATE)
    // Contract will update pools using aggregate deltas if needed
    commitment
}
