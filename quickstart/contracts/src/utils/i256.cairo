//! i256 (signed 256-bit integer) utilities


#[derive(Copy, Drop, starknet::Store, Serde, PartialEq)]
pub struct i256 {
    pub low: felt252,
    pub high: felt252,
}

impl i256Zeroable of core::zeroable::Zeroable<i256> {
    fn zero() -> i256 {
        i256 { low: 0, high: 0 }
    }

    fn is_zero(self: i256) -> bool {
        self.low == 0 && self.high == 0
    }

    fn is_non_zero(self: i256) -> bool {
        !self.is_zero()
    }
}

#[generate_trait]
impl i256Impl of i256ImplTrait {
    fn is_zero(self: @i256) -> bool {
        self.low == 0 && self.high == 0
    }

    fn is_positive(self: @i256) -> bool {
        self.high == 0 || (self.high == 1 && self.low == 0)
    }

    fn is_negative(self: @i256) -> bool {
        !self.is_positive() && !self.is_zero()
    }

    fn neg(self: i256) -> i256 {
        // Two's complement negation
        let low_neg = !self.low;
        let high_neg = !self.high;
        i256 { low: low_neg + 1, high: high_neg }
    }
}

