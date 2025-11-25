//! Precision utilities for price and fee calculations

/// Apply a factor (in basis points) to a u256 value
/// factor_bps: e.g., 100 = 1%, 500 = 5%
pub fn apply_factor_u256(value: u256, factor_bps: u256) -> u256 {
    (value * factor_bps) / 10000
}

/// Multiply and divide with precision
pub fn mul_div(a: u256, b: u256, c: u256) -> u256 {
    (a * b) / c
}

/// Convert difference to factor (basis points)
pub fn to_factor(diff: u256, base: u256) -> u256 {
    if base == 0 {
        return 0;
    }
    (diff * 10000) / base
}

/// FLOAT_PRECISION constant (10^30, like Satoru)
pub const FLOAT_PRECISION: u256 = 1000000000000000000000000000000;

/// FLOAT_PRECISION_SQRT constant (10^15)
pub const FLOAT_PRECISION_SQRT: u256 = 1000000000000000;

/// Multiply and divide with rounding
/// round_up: if true, round up; if false, round down
pub fn mul_div_roundup(a: u256, b: u256, c: u256, round_up: bool) -> u256 {
    if round_up {
        // Round up: (a * b + c - 1) / c
        let product = a * b;
        if product + c > product {
            (product + c - 1) / c
        } else {
            product / c
        }
    } else {
        // Round down: (a * b) / c
        (a * b) / c
    }
}

