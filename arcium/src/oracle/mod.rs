use anchor_lang::prelude::*;

#[derive(Clone, Copy, AnchorSerialize, AnchorDeserialize, Debug)]
pub struct OraclePrice {
    pub price: u64,
    pub conf: u64,
    pub exponent: i32,
    pub timestamp: i64,
}

impl OraclePrice {
    // Mock Pyth Price
    pub fn get_price(&self) -> f64 {
        self.price as f64 * 10f64.powi(self.exponent)
    }
}

pub struct Oracle {
    pub prices: Vec<(Pubkey, OraclePrice)>, // Asset -> Price
}

impl Oracle {
    pub fn new() -> Self {
        Self { prices: Vec::new() }
    }

    pub fn update_price(&mut self, asset: Pubkey, price: LinkOraclePrice) {
         // Logic to ingest Encrypted Oracle update
         // For now we just store the mock
         self.prices.push((asset, price.into()));
    }
}

// Wrapper for incoming updates
#[derive(Clone, Copy, AnchorSerialize, AnchorDeserialize)]
pub struct LinkOraclePrice {
    pub price: u64,
    pub conf: u64,
    pub expo: i32,
    pub publish_time: i64,
}

impl From<LinkOraclePrice> for OraclePrice {
    fn from(p: LinkOraclePrice) -> Self {
        Self {
            price: p.price,
            conf: p.conf,
            exponent: p.expo,
            timestamp: p.publish_time,
        }
    }
}
