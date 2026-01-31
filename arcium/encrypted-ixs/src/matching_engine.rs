use crate::order_book::{Order, OrderBook, Side};

#[derive(Debug)]
pub struct TradeMatch {
    pub maker_order_id: u128,
    pub taker_order_id: u128,
    pub price: u64,
    pub size: u64,
}

pub fn match_orders(book: &mut OrderBook) -> Vec<TradeMatch> {
    let mut matches = Vec::new();

    // Simple matching: Check top Bid vs top Ask
    while let (Some(best_bid), Some(best_ask)) = (book.bids.first(), book.asks.first()) {
        if best_bid.price >= best_ask.price {
            // Match found!
            let match_price = best_ask.price; // Maker price (Ask was likely there, or Bid crossed)
            // Ideally we check timestamps for maker/taker logic, simplifying here to "price crossing"
            
            let size = std::cmp::min(best_bid.size, best_ask.size);
            
            matches.push(TradeMatch {
                maker_order_id: best_ask.id,
                taker_order_id: best_bid.id,
                price: match_price,
                size,
            });

            // Update/Remove orders
            if best_bid.size == size {
                book.bids.remove(0);
            } else {
                book.bids[0].size -= size;
            }

            if best_ask.size == size {
                book.asks.remove(0);
            } else {
                book.asks[0].size -= size;
            }
        } else {
            break; // No more overlaps
        }
    }

    matches
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::order_book::{Order, Side};
    use anchor_lang::prelude::Pubkey;

    fn mock_order(id: u128, side: Side, price: u64, size: u64) -> Order {
        Order {
            id,
            trader: Pubkey::default(),
            side,
            price,
            size,
            timestamp: 0,
        }
    }

    #[test]
    fn test_match_orders() {
        let mut book = OrderBook::new();
        
        // Add Ask @ 100
        book.add_order(mock_order(1, Side::Ask, 100, 10));
        // Add Bid @ 110 (Should Match!)
        book.add_order(mock_order(2, Side::Bid, 110, 5));

        let matches = match_orders(&mut book);
        
        assert_eq!(matches.len(), 1);
        let m = &matches[0];
        assert_eq!(m.price, 100); // Matches at Maker Price
        assert_eq!(m.size, 5);
        
        // Check Book State
        assert_eq!(book.bids.len(), 0); // Filled
        assert_eq!(book.asks[0].size, 5); // Partial Fill (10 - 5)
    }
}
