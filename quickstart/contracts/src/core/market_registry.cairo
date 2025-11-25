//! Market Registry - Helper contract to register markets with Pragma asset IDs

use private_perp::core::data_store::{IDataStoreDispatcher, IDataStoreDispatcherTrait, MarketConfig};
use private_perp::core::oracle::{IOracleDispatcher, IOracleDispatcherTrait};
use starknet::ContractAddress;

#[starknet::interface]
pub trait IMarketRegistry<TContractState> {
    fn register_market(
        ref self: TContractState, market_id: felt252, asset_id: felt252, config: MarketConfig,
    );

    fn register_default_markets(ref self: TContractState);
}

#[starknet::contract]
mod MarketRegistry {
    use private_perp::core::data_store::{
        IDataStoreDispatcher, IDataStoreDispatcherTrait, MarketConfig,
    };
    use private_perp::core::oracle::{IOracleDispatcher, IOracleDispatcherTrait};
    use starknet::ContractAddress;
    use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};
    use super::IMarketRegistry;

    // Pragma Asset IDs
    const BTC_USD: felt252 = 18669995996566340;
    const ETH_USD: felt252 = 19514442401534788;
    const WBTC_USD: felt252 = 6287680677296296772;
    const LORDS_USD: felt252 = 1407668255603079598916;
    const STRK_USD: felt252 = 6004514686061859652;
    const EKUBO_USD: felt252 = 1278253658919688033092;
    const DOG_USD: felt252 = 19227465571717956;

    #[storage]
    struct Storage {
        oracle: IOracleDispatcher,
        data_store: IDataStoreDispatcher,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        oracle_address: ContractAddress,
        data_store_address: ContractAddress,
    ) {
        self.oracle.write(IOracleDispatcher { contract_address: oracle_address });
        self.data_store.write(IDataStoreDispatcher { contract_address: data_store_address });
    }

    #[external(v0)]
    impl MarketRegistryImpl of super::IMarketRegistry<ContractState> {
        fn register_market(
            ref self: ContractState, market_id: felt252, asset_id: felt252, config: MarketConfig,
        ) {
            // Register with Oracle
            self.oracle.read().register_market(market_id, asset_id);

            // Register market config
            self.data_store.read().set_market_config(market_id, config);
        }

        fn register_default_markets(ref self: ContractState) {
            // Default market config
            let default_config = MarketConfig {
                max_leverage: 20, // 20x leverage
                min_margin_ratio: 5, // 5% minimum margin
                max_position_size: 1000000000000000000000000, // 1M yUSD max
                price_impact_factor: 1000, // Price impact factor
                trading_fee_bps: 10, // 0.1% trading fee
                liquidation_fee_bps: 50, // 0.5% liquidation fee
                enabled: true,
            };

            // Register BTC/USD
            self.register_market('BTC/USD', BTC_USD, default_config);

            // Register ETH/USD
            self.register_market('ETH/USD', ETH_USD, default_config);

            // Register WBTC/USD
            self.register_market('WBTC/USD', WBTC_USD, default_config);

            // Register LORDS/USD
            self.register_market('LORDS/USD', LORDS_USD, default_config);

            // Register STRK/USD
            self.register_market('STRK/USD', STRK_USD, default_config);

            // Register EKUBO/USD
            self.register_market('EKUBO/USD', EKUBO_USD, default_config);

            // Register DOG/USD
            self.register_market('DOG/USD', DOG_USD, default_config);
        }
    }
}


