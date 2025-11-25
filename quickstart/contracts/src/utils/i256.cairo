//! i256 (signed 256-bit integer) utilities

use core::num::traits::Zero;

#[derive(Copy, Drop, starknet::Store, Serde, PartialEq)]
pub struct i256 {
    pub low: felt252,
    pub high: felt252,
}

impl i256Zeroable of Zero<i256> {
    fn zero() -> i256 {
        i256 { low: 0, high: 0 }
    }

    fn is_zero(self: @i256) -> bool {
        *self.low == 0 && *self.high == 0
    }

    fn is_non_zero(self: @i256) -> bool {
        !self.is_zero()
    }
}

#[generate_trait]
impl i256Impl of i256ImplTrait {

    fn is_positive(self: @i256) -> bool {
        let zero_val: felt252 = 0;
        let one_val: felt252 = 1;
        *self.high == zero_val || (*self.high == one_val && *self.low == zero_val)
    }

    fn is_negative(self: @i256) -> bool {
        !self.is_positive() && !self.is_zero()
    }

    // Note: neg() is commented out because bitwise NOT (!) is not supported for felt252
    // If needed, implement two's complement negation using subtraction instead
    // fn neg(self: i256) -> i256 {
    //     // Two's complement negation: -x = ~x + 1
    //     // Since ! is not available for felt252, use alternative implementation
    //     // For now, this function is not used in the codebase
    // }
}

