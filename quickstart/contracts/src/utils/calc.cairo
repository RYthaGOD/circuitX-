//! Calculation utilities

use core::traits::TryInto;
use private_perp::utils::i256::i256;

/// Convert u256 to signed i256
pub fn to_signed(value: u256, is_positive: bool) -> i256 {
    if is_positive {
        i256 { low: value.low.into(), high: value.high.into() }
    } else {
        i256 { low: value.low.into(), high: value.high.into() }
    }
}

/// Convert i256 to unsigned u256
pub fn to_unsigned(value: i256) -> u256 {
    u256 { low: value.low.try_into().unwrap(), high: value.high.try_into().unwrap() }
}

/// Calculate difference between two u256 values
pub fn diff(a: u256, b: u256) -> u256 {
    if a >= b {
        a - b
    } else {
        b - a
    }
}

/// Sum two u256 values and return u256
pub fn sum_return_uint_256(a: u256, b: i256) -> u256 {
    let b_low_u128: u128 = b.low.try_into().unwrap();
    let b_high_u128: u128 = b.high.try_into().unwrap();
    if b_high_u128 == 0 && b_low_u128 == 0 {
        return a;
    }
    // Simplified - in production, handle overflow properly
    u256 { low: a.low + b_low_u128, high: a.high + b_high_u128 }
}


