use arcis_imports::prelude::*;
use borsh::{BorshDeserialize, BorshSerialize};

pub mod order_book;
pub mod matching_engine;
pub mod oracle;
pub mod funding;

pub use order_book::*;
pub use matching_engine::*;
pub use oracle::*;
pub use funding::*;

// This is the entry point specific to Arcis framework
#[no_mangle]
pub extern "C" fn entry() {
    // Encrypted entry logic would go here in a real Arcium environment
}
