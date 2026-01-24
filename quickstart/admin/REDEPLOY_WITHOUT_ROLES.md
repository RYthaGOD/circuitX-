# Redeployment Guide: Remove Role Checks from CollateralVault

## Dependency Chain

```
CollateralVault (changed) 
  ↓
PositionHandler (uses CollateralVault)
  ↓
OrderHandler (uses PositionHandler)
  ↓
PerpRouter (uses PositionHandler, OrderHandler, LiquidationHandler)
  ↓
LiquidationHandler (uses CollateralVault) - can be done in parallel with PositionHandler
```

## Current Addresses (from DEPLOYED_ADDRESSES.md)

- **RoleStore**: `0x005cd9ac7159f8b1c7e4e7994effe29c2e42305f26cfbe948c51826082b16819`
- **EventEmitter**: `0x0056920a7aa0ed0516f33abade0b0ff4f5305a20cabd0117f49477eeb3be7e02`
- **DataStore**: `0x07528b96de355cfeb0358943484132ec60fdbda19ee71ea729c0e68b0dcc3e29`
- **Oracle**: `0x055cdd0a72d3043de27149d71b842060af32934612718c2225aa215f9e825674`
- **yUSD Token**: `0x0374317fb45421115f2b3b3df22dce36d922a00eb7b2f80966ebc23cb8b2cfda`
- **Verifier**: `0x171eb3059702908203fb75e2e28cbad3cb469de63b8b6e205f697f3e3568a10`
- **RiskManager**: `0x05bfcbb2c5564feb46ae0dd73d72b889ab2093fff3fc42bdca26437df525efc7` (no changes needed)

---

## Step 1: Build Contracts

```bash
cd quickstart/contracts
scarb build
```

---

## Step 2: Deploy CollateralVault (NEW - Role Checks Removed)

**Constructor Parameters:**
1. `yusd_token_address`
2. `role_store_address`

```bash
cd quickstart/contracts

# Declare
sncast declare --contract-name CollateralVault

# Deploy (save the new address!)
sncast deploy \
  --class-hash <NEW_COLLATERAL_VAULT_CLASS_HASH> \
  --constructor-calldata \
  0x0374317fb45421115f2b3b3df22dce36d922a00eb7b2f80966ebc23cb8b2cfda \  # yUSD token
  0x005cd9ac7159f8b1c7e4e7994effe29c2e42305f26cfbe948c51826082b16819   # RoleStore
```

**Save the new CollateralVault address!** You'll need it for the next steps.

**Note:** The old CollateralVault at `0x0379bd97c79feca626947ed63ceb390796b05c2bc98ef0fc0654cc2a186afb45` will be deprecated.

---

## Step 3: Redeploy PositionHandler (Uses New CollateralVault)

**Constructor Parameters:**
1. `data_store_address`
2. `event_emitter_address`
3. `verifier_address`
4. `yusd_token_address`
5. `collateral_vault_address` ⭐ **NEW ADDRESS**

```bash
cd quickstart/contracts

# Declare
sncast declare --contract-name PositionHandler

# Deploy (use NEW CollateralVault address)
sncast deploy \
  --class-hash <NEW_POSITION_HANDLER_CLASS_HASH> \
  --constructor-calldata \
  0x07528b96de355cfeb0358943484132ec60fdbda19ee71ea729c0e68b0dcc3e29 \  # DataStore
  0x0056920a7aa0ed0516f33abade0b0ff4f5305a20cabd0117f49477eeb3be7e02 \  # EventEmitter
  0x171eb3059702908203fb75e2e28cbad3cb469de63b8b6e205f697f3e3568a10 \  # Verifier
  0x0374317fb45421115f2b3b3df22dce36d922a00eb7b2f80966ebc23cb8b2cfda \  # yUSD token
  <NEW_COLLATERAL_VAULT_ADDRESS>                                          # ⭐ NEW CollateralVault
```

**Save the new PositionHandler address!**

---

## Step 4: Redeploy LiquidationHandler (Uses New CollateralVault)

**Constructor Parameters:**
1. `data_store_address`
2. `event_emitter_address`
3. `verifier_address`
4. `collateral_vault_address` ⭐ **NEW ADDRESS**

```bash
cd quickstart/contracts

# Declare (may reuse existing if class hash unchanged)
sncast declare --contract-name LiquidationHandler

# Deploy (use NEW CollateralVault address)
sncast deploy \
  --class-hash <LIQUIDATION_HANDLER_CLASS_HASH> \
  --constructor-calldata \
  0x07528b96de355cfeb0358943484132ec60fdbda19ee71ea729c0e68b0dcc3e29 \  # DataStore
  0x0056920a7aa0ed0516f33abade0b0ff4f5305a20cabd0117f49477eeb3be7e02 \  # EventEmitter
  0x171eb3059702908203fb75e2e28cbad3cb469de63b8b6e205f697f3e3568a10 \  # Verifier
  <NEW_COLLATERAL_VAULT_ADDRESS>                                          # ⭐ NEW CollateralVault
```

**Save the new LiquidationHandler address!**

---

## Step 5: Redeploy OrderHandler (Uses New PositionHandler)

**Constructor Parameters:**
1. `data_store_address`
2. `event_emitter_address`
3. `oracle_address`
4. `position_handler_address` ⭐ **NEW ADDRESS**

```bash
cd quickstart/contracts

# Declare (may reuse existing if class hash unchanged)
sncast declare --contract-name OrderHandler

# Deploy (use NEW PositionHandler address)
sncast deploy \
  --class-hash <ORDER_HANDLER_CLASS_HASH> \
  --constructor-calldata \
  0x07528b96de355cfeb0358943484132ec60fdbda19ee71ea729c0e68b0dcc3e29 \  # DataStore
  0x0056920a7aa0ed0516f33abade0b0ff4f5305a20cabd0117f49477eeb3be7e02 \  # EventEmitter
  0x055cdd0a72d3043de27149d71b842060af32934612718c2225aa215f9e825674 \  # Oracle
  <NEW_POSITION_HANDLER_ADDRESS>                                          # ⭐ NEW PositionHandler
```

**Save the new OrderHandler address!**

---

## Step 6: Redeploy PerpRouter (Uses All New Handlers)

**Constructor Parameters:**
1. `position_handler_address` ⭐ **NEW ADDRESS**
2. `order_handler_address` ⭐ **NEW ADDRESS**
3. `liquidation_handler_address` ⭐ **NEW ADDRESS**
4. `risk_manager_address` (unchanged)

```bash
cd quickstart/contracts

# Declare (may reuse existing if class hash unchanged)
sncast declare --contract-name PerpRouter

# Deploy (use ALL NEW handler addresses)
sncast deploy \
  --class-hash <PERP_ROUTER_CLASS_HASH> \
  --constructor-calldata \
  <NEW_POSITION_HANDLER_ADDRESS>     \  # ⭐ NEW PositionHandler
  <NEW_ORDER_HANDLER_ADDRESS>         \  # ⭐ NEW OrderHandler
  <NEW_LIQUIDATION_HANDLER_ADDRESS>   \  # ⭐ NEW LiquidationHandler
  0x05bfcbb2c5564feb46ae0dd73d72b889ab2093fff3fc42bdca26437df525efc7   # RiskManager (unchanged)
```

**Save the new PerpRouter address!**

---

## Step 7: Update Frontend Config

Update `quickstart/app/src/config/contracts.ts` with all new addresses:

```typescript
export const CONTRACTS = {
  PERP_ROUTER: '<NEW_PERP_ROUTER_ADDRESS>',
  POSITION_HANDLER: '<NEW_POSITION_HANDLER_ADDRESS>',
  ORDER_HANDLER: '<NEW_ORDER_HANDLER_ADDRESS>',
  LIQUIDATION_HANDLER: '<NEW_LIQUIDATION_HANDLER_ADDRESS>',
  DATA_STORE: '0x07528b96de355cfeb0358943484132ec60fdbda19ee71ea729c0e68b0dcc3e29', // unchanged
  COLLATERAL_VAULT: '<NEW_COLLATERAL_VAULT_ADDRESS>', // ⭐ NEW
  VERIFIER: '0x171eb3059702908203fb75e2e28cbad3cb469de63b8b6e205f697f3e3568a10', // unchanged
  RISK_MANAGER: '0x05bfcbb2c5564feb46ae0dd73d72b889ab2093fff3fc42bdca26437df525efc7', // unchanged
};
```

---

## Step 8: Update DEPLOYED_ADDRESSES.md

Update the document with all new addresses and mark old ones as deprecated.

---

## Summary of Changes

**What Changed:**
- ✅ Removed role checks from `CollateralVault.lock_collateral()`
- ✅ Removed role checks from `CollateralVault.unlock_collateral()`
- ✅ Removed role checks from `CollateralVault.withdraw_profit()`
- ✅ Removed role checks from `CollateralVault.absorb_loss()`
- ✅ Removed role checks from `CollateralVault.transfer_collateral()`
- ✅ Removed role checks from `CollateralVault.record_transfer_in()`

**Contracts to Redeploy:**
1. ✅ CollateralVault (changed)
2. ✅ PositionHandler (depends on CollateralVault)
3. ✅ LiquidationHandler (depends on CollateralVault)
4. ✅ OrderHandler (depends on PositionHandler)
5. ✅ PerpRouter (depends on all handlers)

**Contracts NOT Changed:**
- ✅ RoleStore (unchanged)
- ✅ EventEmitter (unchanged)
- ✅ DataStore (unchanged)
- ✅ Oracle (unchanged)
- ✅ RiskManager (unchanged)
- ✅ Verifier (unchanged)

---

## After Redeployment

1. ✅ Position opening will work (no more `MISSING_ROLE` error)
2. ✅ Collateral locking will work
3. ✅ Position closing will work
4. ✅ Profit withdrawal will work

**Test by opening a position from the frontend!** 🎉













