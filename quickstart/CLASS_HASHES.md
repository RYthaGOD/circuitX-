# Contract Class Hashes

This file contains all class hashes for easy redeployment of contracts.

## Core Contracts

### CollateralVault
- **Class Hash**: `0x497cb0b76d7c3031264a28d338bc86dab11f86bd7ed72621170e9462618e5e6`
- **Last Updated**: Removed market_id from storage keys, removed balance checks, safe subtraction
- **Deployed Address**: `0x069ee1049980f5dbfbafe787fd5106f152d275290959cdaaebcd30ccb6b43c66`
- **Constructor**: `yusd_token_address`, `role_store_address`

### DataStore
- **Class Hash**: `0x00e317c44fbfda6a6695310f547cc166fe1ff5bfa7929ddde74c925ac3cfc400`
- **Constructor**: `oracle_address`, `data_store_address`

### EventEmitter
- **Class Hash**: (Check deployment guide or previous deployments)
- **Constructor**: None

### RoleStore
- **Class Hash**: (Check deployment guide or previous deployments)
- **Constructor**: `admin_address`

### Oracle (MockOracle)
- **Class Hash**: `0x5d1a434c58398d466f07fdda8f4857fdd6c4860af63f23ae86bd5e466c87f69`
- **Constructor**: `admin_address`

## Handler Contracts

### PositionHandler
- **Class Hash**: `0x55171e70019e0c1fcb873e1a2e5b99f9704c7de739ca6880665d8d92171f924`
- **Last Updated**: Removed all market_id checks, removed market enabled check
- **Deployed Address**: `0x07593362cf445551ecc052c70ea6f11b423577a24a708e3dd7d2dee1e9ae3fe0`
- **Constructor**: `data_store_address`, `event_emitter_address`, `verifier_address`, `yusd_token_address`, `collateral_vault_address`

### LiquidationHandler
- **Class Hash**: `0x15cf8fd3d5acde3a4b0a8f2e782a32a244086eac86fe0ccc8178ed325a859d1`
- **Last Updated**: Removed market_id mismatch check
- **Deployed Address**: `0x0697c390edb91969464e2c868944d37a4be32ddbb3d96e229cde28819ee1c68f`
- **Constructor**: `data_store_address`, `event_emitter_address`, `verifier_address`, `collateral_vault_address`

### OrderHandler
- **Class Hash**: `0x030e79af3f971b89e2430bbbc91f1f389d561fba4dfa71900c5267f57a23dd65`
- **Last Updated**: Redeployed with new PositionHandler
- **Deployed Address**: `0x01190b8b036ae40b724763878648f7328b658c315a7021ee2df188dcc01e1b4e`
- **Constructor**: `data_store_address`, `event_emitter_address`, `oracle_address`, `position_handler_address`

### RiskManager
- **Class Hash**: `0x00ee183269ea9ba0b38471217964e89d8965848406e71f21164e1c593e6968c3`
- **Last Updated**: Removed market_id dependencies, uses hardcoded defaults
- **Deployed Address**: `0x071a6f039fa6401482c9e55d061c6da6387b00c5cb0991299ab5ef124971b7da`
- **Constructor**: `data_store_address`, `oracle_address`

## Router Contracts

### PerpRouter
- **Class Hash**: `0x047cd3c28b8687dbe7ae5fd21ee2069590451841d40a5914501d3aeae92127b1`
- **Last Updated**: Redeployed with all new handler addresses (market_id checks removed)
- **Deployed Address**: `0x057c9a38d9cfe77f8f0965b84e99398dbb2722bdfa380c466f10b13f2d3f8c41`
- **Constructor**: `position_handler_address`, `order_handler_address`, `liquidation_handler_address`, `risk_manager_address`

## Optional Contracts

### MarketRegistry
- **Class Hash**: `0x00e317c44fbfda6a6695310f547cc166fe1ff5bfa7929ddde74c925ac3cfc400`
- **Constructor**: `oracle_address`, `data_store_address`

## Verifier

### UltraStarknetZKHonkVerifier
- **Class Hash**: `0x2802e21a97eb1adac9830f3f1075f0bbe62f0b23d969aed6f744f12a1e3539`
- **Deployed Address**: `0x3f5bd2451155beaa736a44d68a9fa6dc38be2a34e9403eb68beb83bcb67c839`
- **Last Updated**: Circuit Redeployment - No Noise Randomization

## Quick Redeployment Commands

### CollateralVault
```bash
sncast deploy \
  --class-hash 0x497cb0b76d7c3031264a28d338bc86dab11f86bd7ed72621170e9462618e5e6 \
  --constructor-calldata \
    0x0374317fb45421115f2b3b3df22dce36d922a00eb7b2f80966ebc23cb8b2cfda \
    0x005cd9ac7159f8b1c7e4e7994effe29c2e42305f26cfbe948c51826082b16819
```

### PositionHandler
```bash
sncast deploy \
  --class-hash 0x55171e70019e0c1fcb873e1a2e5b99f9704c7de739ca6880665d8d92171f924 \
  --constructor-calldata \
    0x02723d4149bfa4cafded35887532aa37d73669b502d46b9bb804e3ac1bd4aa91 \
    0x0056920a7aa0ed0516f33abade0b0ff4f5305a20cabd0117f49477eeb3be7e02 \
    0x3f5bd2451155beaa736a44d68a9fa6dc38be2a34e9403eb68beb83bcb67c839 \
    0x0374317fb45421115f2b3b3df22dce36d922a00eb7b2f80966ebc23cb8b2cfda \
    0x069ee1049980f5dbfbafe787fd5106f152d275290959cdaaebcd30ccb6b43c66
```

### LiquidationHandler
```bash
sncast deploy \
  --class-hash 0x15cf8fd3d5acde3a4b0a8f2e782a32a244086eac86fe0ccc8178ed325a859d1 \
  --constructor-calldata \
    0x02723d4149bfa4cafded35887532aa37d73669b502d46b9bb804e3ac1bd4aa91 \
    0x0056920a7aa0ed0516f33abade0b0ff4f5305a20cabd0117f49477eeb3be7e02 \
    0x3f5bd2451155beaa736a44d68a9fa6dc38be2a34e9403eb68beb83bcb67c839 \
    0x069ee1049980f5dbfbafe787fd5106f152d275290959cdaaebcd30ccb6b43c66
```

### OrderHandler
```bash
sncast deploy \
  --class-hash 0x030e79af3f971b89e2430bbbc91f1f389d561fba4dfa71900c5267f57a23dd65 \
  --constructor-calldata \
    0x02723d4149bfa4cafded35887532aa37d73669b502d46b9bb804e3ac1bd4aa91 \
    0x0056920a7aa0ed0516f33abade0b0ff4f5305a20cabd0117f49477eeb3be7e02 \
    0x055cdd0a72d3043de27149d71b842060af32934612718c2225aa215f9e825674 \
    0x07593362cf445551ecc052c70ea6f11b423577a24a708e3dd7d2dee1e9ae3fe0
```

### RiskManager
```bash
sncast deploy \
  --class-hash 0x00ee183269ea9ba0b38471217964e89d8965848406e71f21164e1c593e6968c3 \
  --constructor-calldata \
    0x02723d4149bfa4cafded35887532aa37d73669b502d46b9bb804e3ac1bd4aa91 \
    0x055cdd0a72d3043de27149d71b842060af32934612718c2225aa215f9e825674
```

### PerpRouter
```bash
sncast deploy \
  --class-hash 0x047cd3c28b8687dbe7ae5fd21ee2069590451841d40a5914501d3aeae92127b1 \
  --constructor-calldata \
    0x07593362cf445551ecc052c70ea6f11b423577a24a708e3dd7d2dee1e9ae3fe0 \
    0x01190b8b036ae40b724763878648f7328b658c315a7021ee2df188dcc01e1b4e \
    0x0697c390edb91969464e2c868944d37a4be32ddbb3d96e229cde28819ee1c68f \
    0x071a6f039fa6401482c9e55d061c6da6387b00c5cb0991299ab5ef124971b7da
```

## Notes

- All class hashes are from the latest deployment with market_id checks removed
- **Key Changes**: 
  - CollateralVault: Removed market_id from storage keys, removed balance checks, safe subtraction
  - PositionHandler: Removed all market_id and market enabled checks
  - LiquidationHandler: Removed market_id mismatch check
  - RiskManager: Removed market_id dependencies, uses hardcoded defaults
- If a contract is already declared, you can deploy directly using the class hash without declaring again
- Always update `quickstart/app/src/config/contracts.ts` after redeploying any contract

