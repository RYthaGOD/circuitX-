//! Market Registry - Helper contract to register markets with Pragma asset IDs

use private_perp::core::data_store::MarketConfig;

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

    // Pragma Asset IDs - Only the 5 supported markets
    // These match the frontend PRAGMA_ASSET_IDS mapping exactly
    // Market IDs are stored using the Pragma asset ID constant (not string literals)
    // This ensures consistency with frontend which sends hex values like 0x4254432f555344
    // Decimal values calculated from hex: BigInt('0x...').toString()
    const BTC_USD: felt252 = 18669995996566340; // 0x4254432f555344 = "BTC/USD"
    const ETH_USD: felt252 = 19514442401534788; // 0x4554482f555344 = "ETH/USD"
    const STRK_USD: felt252 = 6004514686061859652; // 0x5354524b2f555344 = "STRK/USD"
    const SOL_USD: felt252 = 36829707248068212; // 0x534f4c2f555344 = "SOL/USD"
    const BNB_USD: felt252 = 28734208008801092; // 0x424e422f555344 = "BNB/USD"

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

            // Register BTC/USD - Use Pragma asset ID constant as market_id (matches frontend)
            self.register_market(BTC_USD, BTC_USD, default_config);

            // Register ETH/USD - Use Pragma asset ID constant as market_id (matches frontend)
            self.register_market(ETH_USD, ETH_USD, default_config);

            // Register STRK/USD - Use Pragma asset ID constant as market_id (matches frontend)
            self.register_market(STRK_USD, STRK_USD, default_config);

            // Register SOL/USD - Use Pragma asset ID constant as market_id (matches frontend)
            self.register_market(SOL_USD, SOL_USD, default_config);

            // Register BNB/USD - Use Pragma asset ID constant as market_id (matches frontend)
            self.register_market(BNB_USD, BNB_USD, default_config);
        }
    }
}


