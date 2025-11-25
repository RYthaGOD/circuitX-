//! Decrease position utilities

use private_perp::position::position::Position;

/// Calculate partial position values after closing
pub fn calculate_partial_position(position: Position, closing_size: u256) -> (Position, u256) {
    // Calculate remaining size
    let remaining_size = position.size - closing_size;

    // Calculate remaining margin (proportional)
    let remaining_margin = (position.margin * remaining_size) / position.size;

    // Create updated position
    let updated_position = Position {
        commitment: position.commitment,
        account: position.account,
        market_id: position.market_id,
        is_long: position.is_long,
        entry_price: position.entry_price,
        size: remaining_size,
        margin: remaining_margin,
        created_at: position.created_at,
    };

    (updated_position, remaining_margin)
}


