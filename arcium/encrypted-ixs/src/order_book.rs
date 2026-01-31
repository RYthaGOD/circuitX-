use anchor_lang::prelude::*;

#[derive(Clone, Copy, Debug, PartialEq, AnchorSerialize, AnchorDeserialize)]
pub enum Side {
    Bid,
    Ask,
}

#[derive(Clone, Copy, Debug, PartialEq, AnchorSerialize, AnchorDeserialize)]
pub struct Order {
    pub id: u128,
    pub trader: Pubkey,
    pub side: Side,
    pub price: u64,
    pub size: u64,
    pub timestamp: i64,
}

#[derive(Clone, Debug, Default)]
pub struct OrderBook {
    pub bids: Vec<Order>, // Sorted High to Low
    pub asks: Vec<Order>, // Sorted Low to High
}

impl OrderBook {
    pub fn new() -> Self {
        Self {
            bids: Vec::new(),
            asks: Vec::new(),
        }
    }

    pub fn add_order(&mut self, order: Order) {
        match order.side {
            Side::Bid => {
                self.bids.push(order);
                self.bids.sort_by(|a, b| b.price.cmp(&a.price)); // Descending
            },
            Side::Ask => {
                self.asks.push(order);
                self.asks.sort_by(|a, b| a.price.cmp(&b.price)); // Ascending
            }
        }
    }

    pub fn remove_order(&mut self, order_id: u128, side: Side) {
        match side {
            Side::Bid => self.bids.retain(|o| o.id != order_id),
            Side::Ask => self.asks.retain(|o| o.id != order_id),
        }
    }
}
