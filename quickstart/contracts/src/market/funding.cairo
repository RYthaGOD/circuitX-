//! Funding Rate Management - Real-time funding rate calculation and updates

use private_perp::core::data_store::{IDataStoreDispatcher, IDataStoreDispatcherTrait};
use private_perp::core::event_emitter::{IEventEmitterDispatcher, IEventEmitterDispatcherTrait};
use private_perp::utils::precision::{
    FLOAT_PRECISION, FLOAT_PRECISION_SQRT, apply_factor_u256, mul_div_roundup,
};
use starknet::ContractAddress;
use starknet::get_block_timestamp;
use starknet::storage::{
    Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess,
    StoragePointerWriteAccess,
};

#[starknet::interface]
pub trait IFunding<TContractState> {
    fn get_funding_rate(self: @TContractState, market_id: felt252) -> FundingRate;
    fn update_funding_rate(ref self: TContractState, market_id: felt252);
    fn get_funding_fee_for_position(
        self: @TContractState,
        market_id: felt252,
        position_size_usd: u256,
        position_funding_factor: u256,
        is_long: bool,
    ) -> u256;
}

#[derive(Drop, starknet::Store, Serde, Copy)]
pub struct FundingRate {
    pub rate_per_second: u256, // Funding rate per second (in FLOAT_PRECISION)
    pub last_updated: u64, // Timestamp of last update
    pub long_open_interest: u256, // Total long open interest (USD)
    pub short_open_interest: u256, // Total short open interest (USD)
    pub funding_factor_per_size: u256 // Cumulative funding factor per size
}

#[starknet::contract]
mod Funding {
    use private_perp::core::data_store::{IDataStoreDispatcher, IDataStoreDispatcherTrait};
    use private_perp::core::event_emitter::{IEventEmitterDispatcher, IEventEmitterDispatcherTrait};
    use private_perp::utils::calc;
    use private_perp::utils::precision::{
        FLOAT_PRECISION, FLOAT_PRECISION_SQRT, apply_factor_u256, mul_div_roundup,
    };
    use starknet::ContractAddress;
    use starknet::get_block_timestamp;
    use starknet::storage::{
        Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess,
        StoragePointerWriteAccess,
    };
    use super::IFunding;

    // Funding rate parameters
    const MAX_FUNDING_RATE_PER_SECOND: u256 = 1000000000000000000; // 0.1% per second max
    const FUNDING_RATE_PRECISION: u256 = 1000000000000000000000000; // 1e24
    const MIN_FUNDING_INTERVAL: u64 = 3600; // 1 hour minimum between updates

    #[storage]
    struct Storage {
        data_store: IDataStoreDispatcher,
        event_emitter: IEventEmitterDispatcher,
        funding_rates: Map<felt252, super::FundingRate>,
        funding_factor_per_size: Map<
            (felt252, bool), u256,
        >, // (market_id, is_long) -> cumulative factor
        last_funding_update: Map<felt252, u64>,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        data_store_address: ContractAddress,
        event_emitter_address: ContractAddress,
    ) {
        self.data_store.write(IDataStoreDispatcher { contract_address: data_store_address });
        self
            .event_emitter
            .write(IEventEmitterDispatcher { contract_address: event_emitter_address });
    }

    #[external(v0)]
    impl FundingImpl of super::IFunding<ContractState> {
        fn get_funding_rate(self: @ContractState, market_id: felt252) -> super::FundingRate {
            let rate: super::FundingRate = self.funding_rates.read(market_id);
            assert(rate.last_updated != 0, 'FUNDING_NOT_INIT');
            rate
        }

        fn update_funding_rate(ref self: ContractState, market_id: felt252) {
            let current_time = get_block_timestamp();
            let last_update = self.last_funding_update.read(market_id);

            // Prevent too frequent updates
            if last_update != 0 && current_time < last_update + MIN_FUNDING_INTERVAL {
                return;
            }

            // Get open interest from data store
            let long_oi = self
                .data_store
                .read()
                .get_u256(private_perp::core::keys::keys::long_open_interest_key(market_id));
            let short_oi = self
                .data_store
                .read()
                .get_u256(private_perp::core::keys::keys::short_open_interest_key(market_id));

            // If no open interest on either side, no funding
            if long_oi == 0 || short_oi == 0 {
                return;
            }

            // Calculate funding rate based on open interest imbalance
            // If longs > shorts, longs pay shorts (positive rate for shorts)
            // If shorts > longs, shorts pay longs (positive rate for longs)
            let total_oi = long_oi + short_oi;
            let imbalance = if long_oi > short_oi {
                long_oi - short_oi
            } else {
                short_oi - long_oi
            };

            // Funding rate = (imbalance / total_oi) * max_funding_rate
            // This creates a rate proportional to the imbalance
            let mut rate_per_second = mul_div_roundup(
                imbalance, MAX_FUNDING_RATE_PER_SECOND, total_oi, false,
            );

            // Cap the rate
            if rate_per_second > MAX_FUNDING_RATE_PER_SECOND {
                rate_per_second = MAX_FUNDING_RATE_PER_SECOND;
            }

            // Determine direction: positive for shorts if longs > shorts
            let is_long_paying = long_oi > short_oi;

            // Calculate time delta
            let time_delta = if last_update == 0 {
                3600 // Default to 1 hour for first update
            } else {
                current_time - last_update
            };

            // Update cumulative funding factors
            let funding_amount_per_size = mul_div_roundup(
                rate_per_second, time_delta.into(), FLOAT_PRECISION * FLOAT_PRECISION_SQRT, false,
            );

            // Update factors for both sides
            let mut long_factor = self.funding_factor_per_size.read((market_id, true));
            let mut short_factor = self.funding_factor_per_size.read((market_id, false));

            if is_long_paying {
                // Longs pay, shorts receive
                long_factor = long_factor + funding_amount_per_size;
                if short_factor >= funding_amount_per_size {
                    short_factor = short_factor - funding_amount_per_size;
                }
            } else {
                // Shorts pay, longs receive
                short_factor = short_factor + funding_amount_per_size;
                if long_factor >= funding_amount_per_size {
                    long_factor = long_factor - funding_amount_per_size;
                }
            }

            self.funding_factor_per_size.write((market_id, true), long_factor);
            self.funding_factor_per_size.write((market_id, false), short_factor);

            // Update funding rate struct
            let funding_rate: super::FundingRate = super::FundingRate {
                rate_per_second,
                last_updated: current_time,
                long_open_interest: long_oi,
                short_open_interest: short_oi,
                funding_factor_per_size: if is_long_paying {
                    long_factor
                } else {
                    short_factor
                },
            };

            self.funding_rates.write(market_id, funding_rate);
            self.last_funding_update.write(market_id, current_time);

            // TODO: Add emit_funding_rate_updated to event emitter
            // self
            //     .event_emitter
            //     .read()
            //     .emit_funding_rate_updated(
            //         market_id, rate_per_second, long_oi, short_oi, current_time,
            //     );
        }

        fn get_funding_fee_for_position(
            self: @ContractState,
            market_id: felt252,
            position_size_usd: u256,
            position_funding_factor: u256,
            is_long: bool,
        ) -> u256 {
            let current_factor = self.funding_factor_per_size.read((market_id, is_long));

            // If current factor < position factor, position is receiving funding
            // If current factor > position factor, position is paying funding
            let factor_diff = if current_factor > position_funding_factor {
                current_factor - position_funding_factor
            } else {
                position_funding_factor - current_factor
            };

            // Calculate funding fee: size * factor_diff / (FLOAT_PRECISION * FLOAT_PRECISION_SQRT)
            mul_div_roundup(
                position_size_usd,
                factor_diff,
                FLOAT_PRECISION * FLOAT_PRECISION_SQRT,
                true // Round up for fees
            )
        }
    }
}


