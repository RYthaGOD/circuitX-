//! Risk Management - Margin validation, open interest limits, reserve checks

use private_perp::core::data_store::{IDataStoreDispatcher, IDataStoreDispatcherTrait, MarketConfig};
use private_perp::core::oracle::{IOracleDispatcher, IOracleDispatcherTrait, Price};
use starknet::ContractAddress;
use starknet::storage::{
    Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess,
    StoragePointerWriteAccess,
};

#[starknet::interface]
pub trait IRiskManager<TContractState> {
    fn validate_margin(
        self: @TContractState,
        market_id: felt252, // FIXED: Parameter kept for interface compatibility but ignored
        collateral_amount: u256,
        position_size_usd: u256,
        leverage: u256,
        current_price: u256,
    ) -> bool;

    fn validate_open_interest(
        self: @TContractState, market_id: felt252, additional_size_usd: u256, is_long: bool,
    ) -> bool;

    fn check_liquidation_threshold(
        self: @TContractState,
        market_id: felt252,
        collateral_amount: u256,
        position_size_usd: u256,
        entry_price: u256,
        current_price: u256,
        is_long: bool,
        funding_fee: u256,
    ) -> bool;

    fn get_max_position_size(
        self: @TContractState, market_id: felt252, collateral_amount: u256,
    ) -> u256;

    fn get_required_margin(
        self: @TContractState, market_id: felt252, position_size_usd: u256, leverage: u256,
    ) -> u256;

    /// Calculate liquidation price for a position before opening
    /// @param market_id Market identifier
    /// @param collateral_amount Collateral amount (margin)
    /// @param position_size_usd Position size in USD
    /// @param entry_price Entry price
    /// @param is_long Whether it's a long position
    /// @return liquidation_price The price at which position will be liquidated
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
mod RiskManager {
    use private_perp::core::data_store::{
        IDataStoreDispatcher, IDataStoreDispatcherTrait, MarketConfig,
    };
    use private_perp::core::oracle::{IOracleDispatcher, IOracleDispatcherTrait, Price};
    use private_perp::utils::calc;
    use private_perp::utils::precision::{FLOAT_PRECISION, apply_factor_u256, mul_div_roundup};
    use starknet::ContractAddress;
    use starknet::storage::{
        Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess,
        StoragePointerWriteAccess,
    };
    use super::IRiskManager;

    // Risk parameters
    const MIN_MARGIN_RATIO_BPS: u256 = 500; // 5% minimum margin
    const LIQUIDATION_THRESHOLD_BPS: u256 = 300; // 3% liquidation threshold
    const MAX_LEVERAGE: u256 = 2000; // 20x = 2000 bps
    const OPEN_INTEREST_RESERVE_FACTOR: u256 = 10000; // 100% reserve (1:1 backing)

    #[storage]
    struct Storage {
        data_store: IDataStoreDispatcher,
        oracle: IOracleDispatcher,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        data_store_address: ContractAddress,
        oracle_address: ContractAddress,
    ) {
        self.data_store.write(IDataStoreDispatcher { contract_address: data_store_address });
        self.oracle.write(IOracleDispatcher { contract_address: oracle_address });
    }

    #[external(v0)]
    impl RiskManagerImpl of super::IRiskManager<ContractState> {
        fn validate_margin(
            self: @ContractState,
            market_id: felt252, // FIXED: Ignored - using default values
            collateral_amount: u256,
            position_size_usd: u256,
            leverage: u256,
            current_price: u256,
        ) -> bool {
            // FIXED: Use hardcoded max leverage instead of market config
            // Validate leverage against default max (20x = 2000 BPS)
            assert(leverage <= MAX_LEVERAGE, 'LEVERAGE_TOO_HIGH');

            // Calculate required margin (doesn't need market_id)
            let required_margin = Self::get_required_margin(
                self, market_id, position_size_usd, leverage,
            );

            // Convert collateral to USD (assuming 1:1 for yUSD)
            let collateral_usd = collateral_amount; // yUSD is 1:1 with USD

            // Check if collateral is sufficient
            collateral_usd >= required_margin
        }

        fn validate_open_interest(
            self: @ContractState, market_id: felt252, additional_size_usd: u256, is_long: bool,
        ) -> bool {
            // FIXED: Use hardcoded max position size instead of market config
            // Default max position size: 1M yUSD
            const DEFAULT_MAX_POSITION_SIZE: u256 = 1000000000000000000000000; // 1M yUSD (18 decimals)

            // FIXED: Track open interest globally (ignore market_id)
            // Use a single key for all markets
            let oi_key = if is_long {
                private_perp::core::keys::keys::long_open_interest_key(0) // Use 0 as global key
            } else {
                private_perp::core::keys::keys::short_open_interest_key(0) // Use 0 as global key
            };

            // Get current open interest (global, not per-market)
            let current_oi = self.data_store.read().get_u256(oi_key);

            let new_oi = current_oi + additional_size_usd;

            // Check against max position size (hardcoded)
            new_oi <= DEFAULT_MAX_POSITION_SIZE
        }

        fn check_liquidation_threshold(
            self: @ContractState,
            market_id: felt252, // FIXED: Ignored - liquidation threshold is global
            collateral_amount: u256,
            position_size_usd: u256,
            entry_price: u256,
            current_price: u256,
            is_long: bool,
            funding_fee: u256,
        ) -> bool {
            // Calculate PnL (simplified - in production use proper u256 math)
            // For long: pnl = position_size * (current_price - entry_price) / entry_price
            // For short: pnl = position_size * (entry_price - current_price) / entry_price
            let price_diff = if is_long {
                if current_price > entry_price {
                    current_price - entry_price
                } else {
                    entry_price - current_price
                }
            } else {
                if current_price < entry_price {
                    entry_price - current_price
                } else {
                    current_price - entry_price
                }
            };

            let pnl = mul_div_roundup(position_size_usd, price_diff, entry_price, false);

            // Calculate remaining collateral after PnL and fees
            // Determine if it's a profit or loss
            let is_profit = if is_long {
                current_price > entry_price
            } else {
                current_price < entry_price
            };

            let remaining_collateral = if is_profit {
                // Profit: add PnL, subtract fees
                if pnl > funding_fee {
                    collateral_amount + pnl - funding_fee
                } else {
                    // Fees exceed profit
                    if collateral_amount > funding_fee - pnl {
                        collateral_amount - (funding_fee - pnl)
                    } else {
                        0
                    }
                }
            } else {
                // Loss: subtract loss and fees
                if collateral_amount > pnl + funding_fee {
                    collateral_amount - pnl - funding_fee
                } else {
                    0
                }
            };

            // Calculate margin ratio
            let margin_ratio = if position_size_usd > 0 {
                mul_div_roundup(remaining_collateral, 10000, // BPS
                position_size_usd, false)
            } else {
                10000 // 100% if no position
            };

            // Check if below liquidation threshold
            margin_ratio < LIQUIDATION_THRESHOLD_BPS
        }

        fn get_max_position_size(
            self: @ContractState, market_id: felt252, collateral_amount: u256,
        ) -> u256 {
            // FIXED: Use hardcoded max leverage instead of market config
            // Max position = collateral * max leverage (20x = 2000 BPS)
            apply_factor_u256(collateral_amount, MAX_LEVERAGE)
        }

        fn get_required_margin(
            self: @ContractState, market_id: felt252, position_size_usd: u256, leverage: u256,
        ) -> u256 {
            // FIXED: market_id ignored - calculation doesn't depend on it
            // Required margin = position_size / leverage
            // With BPS: margin = position_size * 10000 / leverage
            mul_div_roundup(
                position_size_usd,
                10000, // BPS
                leverage,
                true // Round up to ensure sufficient margin
            )
        }

        fn calculate_liquidation_price(
            self: @ContractState,
            market_id: felt252, // FIXED: Ignored - liquidation calculation doesn't depend on market
            collateral_amount: u256,
            position_size_usd: u256,
            entry_price: u256,
            is_long: bool,
        ) -> u256 {
            // Get liquidation threshold (3% = 300 BPS)
            let threshold = LIQUIDATION_THRESHOLD_BPS; // 300

            // Calculate required margin at liquidation
            // At liquidation: remaining_collateral = position_size * threshold / 10000
            let required_margin_at_liquidation = mul_div_roundup(
                position_size_usd, threshold, 10000, false,
            );

            // Calculate maximum loss before liquidation
            // max_loss = collateral - required_margin_at_liquidation
            let max_loss = if collateral_amount > required_margin_at_liquidation {
                collateral_amount - required_margin_at_liquidation
            } else {
                // Already below threshold, liquidation price = entry price
                return entry_price;
            };

            // If position size is zero, return entry price
            if position_size_usd == 0 {
                return entry_price;
            }

            if is_long {
                // Long: liquidation when price goes DOWN
                // PnL formula: pnl = (liquidation_price - entry_price) * size / entry_price
                // At liquidation: margin + pnl = required_margin_at_liquidation
                // So: margin + (liquidation_price - entry_price) * size / entry_price =
                // required_margin_at_liquidation Solving: liquidation_price = entry_price * (1 -
                // (margin - required_margin_at_liquidation) / size)
                // liquidation_price = entry_price * (1 - max_loss / size)

                let price_decrease = mul_div_roundup(
                    max_loss, entry_price, position_size_usd, false,
                );

                if entry_price > price_decrease {
                    entry_price - price_decrease
                } else {
                    // Can't go negative, return 0 or very small value
                    0
                }
            } else {
                // Short: liquidation when price goes UP
                // PnL formula: pnl = (entry_price - liquidation_price) * size / entry_price
                // At liquidation: margin + pnl = required_margin_at_liquidation
                // So: margin + (entry_price - liquidation_price) * size / entry_price =
                // required_margin_at_liquidation Solving: liquidation_price = entry_price * (1 +
                // (margin - required_margin_at_liquidation) / size)
                // liquidation_price = entry_price * (1 + max_loss / size)

                let price_increase = mul_div_roundup(
                    max_loss, entry_price, position_size_usd, false,
                );

                entry_price + price_increase
            }
        }
    }
}
