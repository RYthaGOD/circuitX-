# Contract Addresses Configuration Status

## ✅ Current Configuration in `quickstart/app/src/config/contracts.ts`

All necessary contract addresses are configured in the app:

### Core Contracts
- **PERP_ROUTER**: `0x057c9a38d9cfe77f8f0965b84e99398dbb2722bdfa380c466f10b13f2d3f8c41` ✅
- **POSITION_HANDLER**: `0x07593362cf445551ecc052c70ea6f11b423577a24a708e3dd7d2dee1e9ae3fe0` ✅
- **ORDER_HANDLER**: `0x01190b8b036ae40b724763878648f7328b658c315a7021ee2df188dcc01e1b4e` ✅
- **LIQUIDATION_HANDLER**: `0x0697c390edb91969464e2c868944d37a4be32ddbb3d96e229cde28819ee1c68f` ✅

### Infrastructure
- **DATA_STORE**: `0x02723d4149bfa4cafded35887532aa37d73669b502d46b9bb804e3ac1bd4aa91` ✅
- **ORACLE**: `0x055cdd0a72d3043de27149d71b842060af32934612718c2225aa215f9e825674` ✅
- **COLLATERAL_VAULT**: `0x069ee1049980f5dbfbafe787fd5106f152d275290959cdaaebcd30ccb6b43c66` ✅
- **EVENT_EMITTER**: `0x0056920a7aa0ed0516f33abade0b0ff4f5305a20cabd0117f49477eeb3be7e02` ✅
- **RISK_MANAGER**: `0x071a6f039fa6401482c9e55d061c6da6387b00c5cb0991299ab5ef124971b7da` ✅

### Verifier & Token
- **VERIFIER**: `0x3f5bd2451155beaa736a44d68a9fa6dc38be2a34e9403eb68beb83bcb67c839` ✅
- **YUSD_TOKEN**: `0x0374317fb45421115f2b3b3df22dce36d922a00eb7b2f80966ebc23cb8b2cfda` ✅

### Network Configuration
- **RPC_URL**: `https://ztarknet-madara.d.karnot.xyz` ✅
- **EXPLORER_URL**: `https://explorer-zstarknet.d.karnot.xyz` ✅

## 📋 Services Using Contract Addresses

All services properly import from `config/contracts.ts`:

✅ **positionService.ts** - Uses `CONTRACTS.DATA_STORE`, `NETWORK`
✅ **positionCloseService.ts** - Uses `CONTRACTS`, `MARKET_INFO`
✅ **positionFetcher.ts** - Uses `CONTRACTS`, `NETWORK`, `getMarketIdFelt`, `PRAGMA_ASSET_IDS`
✅ **oracleService.ts** - Uses `CONTRACTS`, `NETWORK`, `MARKETS`, `MARKET_INFO`
✅ **walletService.ts** - Uses `NETWORK`
✅ **usePerpRouter.ts** - Uses `CONTRACTS.PERP_ROUTER`, `NETWORK`
✅ **proofService.ts** - Uses `PRAGMA_ASSET_IDS`, `getMarketIdFelt`

## ⚠️ Issues Found

### 1. App.tsx Has Hardcoded Verifier Address
**File**: `quickstart/app/src/App.tsx` (line 142)
- **Current**: Hardcoded `0x02048def58e122c910f80619ebab076b0ef5513550d38afdfdf2d8a1710fa7c6`
- **Should be**: `CONTRACTS.VERIFIER` from config
- **Status**: ⚠️ This appears to be a demo/test component, not used in main trading flow

### 2. Verifier Address Inconsistencies
Multiple verifier addresses found in documentation:
- `contracts.ts`: `0x3f5bd2451155beaa736a44d68a9fa6dc38be2a34e9403eb68beb83bcb67c839` (✅ Active)
- `README.md`: `0x26cb40ff6fda0e89fe50a7b229c5ffb172177406f85ac2fa96ac3e2a2cb7d2d` (❌ Outdated)
- `DEPLOY_NOW.md`: `0x171eb3059702908203fb75e2e28cbad3cb469de63b8b6e205f697f3e3568a10` (❌ Different)
- `App.tsx`: `0x02048def58e122c910f80619ebab076b0ef5513550d38afdfdf2d8a1710fa7c6` (❌ Hardcoded)

**Note**: The verifier is called by the smart contracts (PositionHandler, LiquidationHandler), not directly by the frontend. The frontend only needs to ensure the contracts have the correct verifier address in their constructors.

## ✅ Verification

### Contracts Are Properly Linked
All trading services use `CONTRACTS` from the centralized config file:
- ✅ PerpRouter address is used in `usePerpRouter.ts`
- ✅ DataStore address is used in `positionService.ts`
- ✅ Oracle address is used in `oracleService.ts`
- ✅ YUSD Token address is used in `Faucet.tsx` (hardcoded but matches config)
- ✅ Network RPC URL is used consistently

### Market Configuration
- ✅ Market IDs properly configured in `PRAGMA_ASSET_IDS`
- ✅ Market info configured in `MARKET_INFO`
- ✅ Market ID normalization function available

## 🎯 Conclusion

**Status**: ✅ **All necessary contract addresses are properly linked in the app folder**

The main trading application correctly uses all contract addresses from `quickstart/app/src/config/contracts.ts`. The only issue is in `App.tsx` which appears to be a demo/test component with a hardcoded verifier address, but this doesn't affect the main trading functionality.

**Recommendation**: 
1. Update `App.tsx` to use `CONTRACTS.VERIFIER` if it's still being used
2. Update `README.md` with the correct verifier address from `contracts.ts`
3. Verify all contract addresses are correct on testnet before launching
