use anchor_lang::prelude::*;

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct FundingRate {
    pub rate: i64, // Scaling factor 1e9
    pub last_update: i64,
}

impl FundingRate {
    pub fn new() -> Self {
        Self { rate: 0, last_update: 0 }
    }

    pub fn update(&mut self, mark_price: u64, index_price: u64) {
        // Simple funding formula: (Mark - Index) / Index / 24h
        // Scaled for precision
        if index_price == 0 { return; }
        
        let diff = (mark_price as i128) - (index_price as i128);
        let funding_scalor = 1_000_000_000;
        
        // 8 hour funding interval
        let funding = (diff) * funding_scalor / (index_price as i128) / 3;
        
        self.rate = funding as i64;
        self.last_update = Clock::get().unwrap().unix_timestamp;
    }
}
