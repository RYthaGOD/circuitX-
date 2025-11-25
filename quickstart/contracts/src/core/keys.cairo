//! Storage keys for DataStore

/// Generate storage keys for various data types
pub mod keys {

    /// Position commitment key
    pub fn position_key(commitment: felt252) -> felt252 {
        'position' + commitment
    }

    /// Market config key
    pub fn market_config_key(market_id: felt252) -> felt252 {
        'market_config' + market_id
    }

    /// Long open interest key
    pub fn long_open_interest_key(market_id: felt252) -> felt252 {
        'long_oi' + market_id
    }

    /// Short open interest key
    pub fn short_open_interest_key(market_id: felt252) -> felt252 {
        'short_oi' + market_id
    }

    /// Collateral pool key
    pub fn collateral_pool_key(market_id: felt252) -> felt252 {
        'collateral_pool' + market_id
    }

    /// Insurance fund key
    pub fn insurance_fund_key() -> felt252 {
        'insurance_fund'
    }

    /// Total fees collected key
    pub fn total_fees_key(market_id: felt252) -> felt252 {
        'total_fees' + market_id
    }

    /// Funding updated timestamp key
    pub fn funding_updated_at_key(market_id: felt252) -> felt252 {
        'funding_updated' + market_id
    }
}




