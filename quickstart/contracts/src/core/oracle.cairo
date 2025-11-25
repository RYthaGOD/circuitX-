//! Oracle contract with Pragma integration

use pragma_lib::abi::{
    IPragmaABIDispatcher, IPragmaABIDispatcherTrait, ISummaryStatsABIDispatcher,
    ISummaryStatsABIDispatcherTrait,
};
use pragma_lib::types::{AggregationMode, DataType, PragmaPricesResponse};
use starknet::ContractAddress;
use starknet::get_block_timestamp;
use starknet::storage::{
    Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess,
    StoragePointerWriteAccess,
};

#[starknet::interface]
pub trait IOracle<TContractState> {
    fn get_price(self: @TContractState, market_id: felt252) -> Price;
    fn update_price_from_pragma(ref self: TContractState, market_id: felt252);
    fn register_market(ref self: TContractState, market_id: felt252, asset_id: felt252);

    /// Get TWAP (Time Weighted Average Price) from Pragma
    /// @param market_id Market identifier
    /// @param duration Duration in seconds over which to calculate TWAP
    /// @param start_time Start time (timestamp) for TWAP calculation
    /// @return twap_price TWAP price
    /// @return decimals Number of decimals
    fn get_twap(
        self: @TContractState, market_id: felt252, duration: u64, start_time: u64,
    ) -> (u128, u32);
}

#[derive(Drop, starknet::Store, Serde, Copy)]
pub struct Price {
    pub value: u128,
    pub timestamp: u64,
    pub decimals: u32,
    pub num_sources: u32,
}

#[starknet::contract]
mod Oracle {
    use pragma_lib::abi::{
        IPragmaABIDispatcher, IPragmaABIDispatcherTrait, ISummaryStatsABIDispatcher,
        ISummaryStatsABIDispatcherTrait,
    };
    use pragma_lib::types::{AggregationMode, DataType, PragmaPricesResponse};
    use private_perp::core::event_emitter::{IEventEmitterDispatcher, IEventEmitterDispatcherTrait};
    use core::traits::TryInto;
    use starknet::ContractAddress;
    use starknet::get_block_timestamp;
    use starknet::storage::{
        Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess,
        StoragePointerWriteAccess,
    };
    use super::Price;

    // Asset IDs (felt252 conversions) - Pragma Oracle pair IDs
    const BTC_USD: felt252 = 18669995996566340; // BTC/USD
    const ETH_USD: felt252 = 19514442401534788; // ETH/USD
    const WBTC_USD: felt252 = 6287680677296296772; // WBTC/USD
    const LORDS_USD: felt252 = 1407668255603079598916; // LORDS/USD
    const STRK_USD: felt252 = 6004514686061859652; // STRK/USD
    const EKUBO_USD: felt252 = 1278253658919688033092; // EKUBO/USD
    const DOG_USD: felt252 = 19227465571717956; // DOG/USD

    // Pragma Summary Stats contract address (for TWAP)
    // Note: Using a hardcoded address - in production, this should be configurable
    // Using a function instead of const due to Cairo limitations
    #[generate_trait]
    impl OracleInternal of OracleInternalTrait {
        fn get_summary_stats_address() -> ContractAddress {
            starknet::contract_address_const::<
                0x6421fdd068d0dc56b7f5edc956833ca0ba66b2d5f9a8fea40932f226668b5c4,
            >()
        }
    }

    #[storage]
    struct Storage {
        pragma_contract: ContractAddress,
        event_emitter: IEventEmitterDispatcher,
        market_to_asset: Map<felt252, felt252>,
        prices: Map<felt252, Price>,
        max_price_age: u64,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        pragma_address: ContractAddress,
        event_emitter_address: ContractAddress,
        max_price_age: u64,
    ) {
        self.pragma_contract.write(pragma_address);
        self
            .event_emitter
            .write(IEventEmitterDispatcher { contract_address: event_emitter_address });
        self.max_price_age.write(max_price_age);
    }

    #[external(v0)]
    impl OracleImpl of super::IOracle<ContractState> {
        fn get_price(self: @ContractState, market_id: felt252) -> super::Price {
            let price: super::Price = self.prices.read(market_id);
            assert(price.timestamp != 0, 'PRICE_NOT_SET');

            // Validate price is not too stale
            let current_time = get_block_timestamp();
            let max_age = self.max_price_age.read();
            assert(current_time <= price.timestamp + max_age, 'STALE_PRICE');

            price
        }

        fn update_price_from_pragma(ref self: ContractState, market_id: felt252) {
            // Get asset_id for this market
            let asset_id = self.market_to_asset.read(market_id);
            assert(asset_id != 0, 'MARKET_NOT_REGISTERED');

            // Retrieve the oracle dispatcher
            let oracle_dispatcher = IPragmaABIDispatcher {
                contract_address: self.pragma_contract.read(),
            };

            // Call the Oracle contract for a spot entry
            let asset_data_type: DataType = DataType::SpotEntry(asset_id);
            let output: PragmaPricesResponse = oracle_dispatcher
                .get_data_median(asset_data_type);

            // Validate response
            assert(output.price > 0, 'INVALID_PRICE');

            // Create Price struct
            let price: super::Price = super::Price {
                value: output.price,
                timestamp: get_block_timestamp(),
                decimals: output.decimals,
                num_sources: output.num_sources_aggregated,
            };

            self.prices.write(market_id, price);

            // Emit event
            self
                .event_emitter
                .read()
                .emit_price_updated(
                    market_id,
                    u256 { low: output.price.into(), high: 0 }, // Convert u128 to u256
                    price.timestamp,
                );
        }

        fn register_market(ref self: ContractState, market_id: felt252, asset_id: felt252) {
            self.market_to_asset.write(market_id, asset_id);
        }

        fn get_twap(
            self: @ContractState, market_id: felt252, duration: u64, start_time: u64,
        ) -> (u128, u32) {
            // Get asset_id for this market
            let asset_id = self.market_to_asset.read(market_id);
            assert(asset_id != 0, 'MARKET_NOT_REGISTERED');

            // Get Summary Stats dispatcher
            let summary_dispatcher = ISummaryStatsABIDispatcher {
                contract_address: OracleInternalTrait::get_summary_stats_address(),
            };

            // Calculate TWAP using Pragma Summary Stats
            // Using SpotEntry for perp markets (no expiration timestamp)
            let (twap, decimals) = summary_dispatcher
                .calculate_twap(
                    DataType::SpotEntry(asset_id),
                    AggregationMode::Median(()),
                    duration,
                    start_time,
                );

            (twap, decimals)
        }
    }
}

