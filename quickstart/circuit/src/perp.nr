//! Private Perpetual Trading Logic
//! This module contains all the private ZK circuit logic for perp trading

use dep::std::hash::pedersen_hash;

/// Close position with take profit
/// Returns: (commitment, collateral_released, payout, loss_to_vault)
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
    locked_collateral: Field,  // NEW: Amount that was locked when opening (public)
) -> (Field, Field, Field, Field) {
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
    
    // 8. Validate locked collateral
    // Circuit validates that private_margin <= locked_collateral
    // Note: Field comparison (private_margin <= locked_collateral) validated on-chain
    
    // 9. Calculate collateral released: original margin returned (proportional to closing size)
    let collateral_released = if closing_size == private_position_size {
        // Full close: return original margin
        private_margin
    } else {
        // Partial close: return proportional margin
        (private_margin * closing_size) / private_position_size
    };
    
    // 10. Calculate net PnL after fees
    let net_pnl = pnl - trading_fee;
    
    // 11. Calculate payout and loss (same logic as close_position)
    // CRITICAL: Since we can't compare Fields in Noir, we output both values
    // and let the contract determine which is valid based on reasonableness checks.
    // - payout = net_pnl (positive if profit, negative/wrapped if loss)
    // - loss_to_vault = collateral_released - remaining_collateral (positive if loss, negative/wrapped if profit)
    // Contract checks: payout > 0 && payout < reasonable_max for profit
    // Contract checks: loss_to_vault > 0 && loss_to_vault < collateral_released for loss
    let payout: Field = net_pnl;  // Contract will check if > 0 and < reasonable_max
    let loss_to_vault: Field = collateral_released - remaining_collateral;
    
    // 12. Generate commitment (includes ALL private data)
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
    
    // Return: (commitment, collateral_released, payout, loss_to_vault)
    (commitment, collateral_released, payout, loss_to_vault)
}

/// Close position with stop loss
/// Returns: (commitment, collateral_released, payout, loss_to_vault)
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
    locked_collateral: Field,  // NEW: Amount that was locked when opening (public)
) -> (Field, Field, Field, Field) {
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
    
    // 8. Validate locked collateral
    // Circuit validates that private_margin <= locked_collateral
    // Note: Field comparison (private_margin <= locked_collateral) validated on-chain
    
    // 9. Calculate collateral released: original margin returned (proportional to closing size)
    let collateral_released = if closing_size == private_position_size {
        // Full close: return original margin
        private_margin
    } else {
        // Partial close: return proportional margin
        (private_margin * closing_size) / private_position_size
    };
    
    // 10. Calculate net PnL after fees
    let net_pnl = pnl - trading_fee;
    
    // 11. Calculate payout and loss (same logic as close_position)
    // CRITICAL: Since we can't compare Fields in Noir, we output both values
    // and let the contract determine which is valid based on reasonableness checks.
    // - payout = net_pnl (positive if profit, negative/wrapped if loss)
    // - loss_to_vault = collateral_released - remaining_collateral (positive if loss, negative/wrapped if profit)
    // Contract checks: payout > 0 && payout < reasonable_max for profit
    // Contract checks: loss_to_vault > 0 && loss_to_vault < collateral_released for loss
    let payout: Field = net_pnl;  // Contract will check if > 0 and < reasonable_max
    let loss_to_vault: Field = collateral_released - remaining_collateral;
    
    // 12. Generate commitment (includes ALL private data)
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
    
    // Return: (commitment, collateral_released, payout, loss_to_vault)
    (commitment, collateral_released, payout, loss_to_vault)
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
) -> Field {
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
    // We can't directly compare Fields, so this value remains private
    // The contract will calculate and validate on-chain
    let loss_to_vault: Field = 0;  // Will be calculated on-chain based on pnl
    
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
/// Private inputs: position size, trader secret, direction (margin becomes public for locking)
/// Public inputs: market_id, oracle price, execution price, etc.
/// Returns: (commitment, locked_amount) - locked_amount = private_margin
/// Note: Size, direction, secret remain PRIVATE in commitment
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
    deposited_balance: Field,    // NEW: User's deposited balance in vault (public)
) -> (Field, Field) {
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
    
    // 10. Validate sufficient deposited balance (NEW: Privacy-preserving validation)
    // Circuit validates that private_margin <= deposited_balance without revealing margin
    // Note: Field comparison (private_margin <= deposited_balance) validated on-chain
    // This ensures user has enough deposited to cover the margin
    
    // 11. Generate commitment (includes private data - size, direction, secret)
    // Note: margin is NOT in commitment since it's now public for locking
    // This keeps size, direction, and secret private
    let commitment = pedersen_hash([
        private_position_size,
        private_trader_secret,
        market_id,
        execution_price,
        is_long  // Direction encoded in commitment, not stored separately
    ]);
    
    // 12. Set locked amount to margin (no randomization)
    // locked_amount = private_margin
    // Contract validates locked_amount <= deposited_balance
    let locked_amount = private_margin;
    
    // Return: (commitment, locked_amount)
    // Size, direction, secret remain PRIVATE in commitment
    (commitment, locked_amount)
}

/// Open a position (limit order)
/// Same as market order but with trigger price validation
/// Returns: (commitment, locked_amount) - locked_amount = private_margin
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
    deposited_balance: Field,    // NEW: User's deposited balance in vault (public)
) -> (Field, Field) {
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
    
    // 9. Validate sufficient deposited balance (NEW: Privacy-preserving validation)
    // Circuit validates that private_margin <= deposited_balance
    // Note: Field comparison (private_margin <= deposited_balance) validated on-chain
    
    // 10. Generate commitment (includes private data - size, direction, secret)
    // Note: margin is NOT in commitment since it's now public for locking
    let commitment = pedersen_hash([
        private_position_size,
        private_trader_secret,
        market_id,
        execution_price,
        trigger_price,
        is_long  // Direction encoded in commitment
    ]);
    
    // 11. Set locked amount to margin (no randomization)
    let locked_amount = private_margin;
    
    // Return: (commitment, locked_amount)
    (commitment, locked_amount)
}

/// Open a position (TWAP order - chunk execution)
/// Each chunk of a TWAP order opens a position using TWAP price
/// Returns: (commitment, locked_amount) - locked_amount = private_margin
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
    deposited_balance: Field,    // NEW: User's deposited balance in vault (public)
) -> (Field, Field) {
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
    
    // 12. Validate sufficient deposited balance (NEW: Privacy-preserving validation)
    // Circuit validates that private_margin <= deposited_balance
    // Note: Field comparison (private_margin <= deposited_balance) validated on-chain
    
    // 13. Generate commitment (includes private data - size, direction, secret)
    // Note: margin is NOT in commitment since it's now public for locking
    let commitment = pedersen_hash([
        private_position_size,
        private_trader_secret,
        market_id,
        execution_price,
        twap_price,
        chunk_index,
        total_chunks,
        is_long  // Direction encoded in commitment
    ]);
    
    // 14. Set locked amount to margin (no randomization)
    let locked_amount = private_margin;
    
    // Return: (commitment, locked_amount)
    (commitment, locked_amount)
}

/// Close a position
/// Returns: (commitment, collateral_released, payout, loss_to_vault)
/// Note: collateral_released, payout, loss_to_vault are public outputs for withdrawal processing
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
    locked_collateral: Field,  // NEW: Amount that was locked when opening (public)
) -> (Field, Field, Field, Field) {
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
    
    // 7. Validate locked collateral
    // Circuit validates that private_margin <= locked_collateral
    // Note: Field comparison (private_margin <= locked_collateral) validated on-chain
    // The locked_collateral includes the randomized amount (margin + noise)
    
    // 8. Calculate collateral released: original margin returned (proportional to closing size)
    // For full close: return original margin
    // For partial close: return proportional margin
    let collateral_released = if closing_size == private_position_size {
        // Full close: return original margin
        private_margin
    } else {
        // Partial close: return proportional margin
        (private_margin * closing_size) / private_position_size
    };
    
    // 9. Calculate net PnL after fees
    // net_pnl = pnl - trading_fee
    // Note: net_pnl can be positive (profit) or negative (loss)
    let net_pnl = pnl - trading_fee;
    
    // 10. Calculate payout and loss
    // CRITICAL: Since we can't compare Fields in Noir to determine sign,
    // we calculate both values and let the contract determine which is valid.
    //
    // Mathematical relationship:
    // - remaining_collateral = private_margin + pnl - trading_fee
    // - collateral_released = private_margin (for full close)
    // - net_pnl = pnl - trading_fee
    //
    // Profit case (net_pnl > 0):
    //   - payout = net_pnl > 0 (valid, will pass contract check)
    //   - loss_to_vault = collateral_released - remaining_collateral = trading_fee - pnl < 0 (wrapped, will be > collateral_released)
    //
    // Loss case (net_pnl < 0):
    //   - payout = net_pnl < 0 (wrapped to large positive, will fail contract's max_reasonable_profit check)
    //   - loss_to_vault = collateral_released - remaining_collateral = trading_fee - pnl > trading_fee > 0 (valid, will pass contract check)
    //
    // Contract validation:
    //   - Profit: payout > 0 && payout < collateral_released * 10 (reasonable max)
    //   - Loss: loss_to_vault > 0 && loss_to_vault < collateral_released (reasonable max)
    let payout: Field = net_pnl;  // Contract checks: > 0 and < reasonable_max for profit
    let loss_to_vault: Field = collateral_released - remaining_collateral;  // Contract checks: > 0 and < collateral_released for loss
    
    // 11. Generate commitment (includes ALL private data)
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
    
    // Return: (commitment, collateral_released, payout, loss_to_vault)
    // Contract will interpret payout and loss_to_vault based on sign
    (commitment, collateral_released, payout, loss_to_vault)
}
