# ✅ Correct Redeployment Order - Based on Actual Changes

## 📋 Contracts I Actually Modified

1. **CollateralVault** - Added `lock_collateral`, `unlock_collateral`, `get_locked_collateral` functions
2. **PositionHandler** - Modified to use locking functions + new verifier + new proof parsing
3. **LiquidationHandler** - Uses verifier (needs new verifier address)
4. **OrderHandler** - Calls PositionHandler (needs new PositionHandler address)
5. **PerpRouter** - Calls all handlers (needs new handler addresses)

**RiskManager** - NOT modified, does NOT use verifier - can keep old address

---

## 🎯 Fixed Addresses (Never Change)

- **DataStore:** `0x07528b96de355cfeb0358943484132ec60fdbda19ee71ea729c0e68b0dcc3e29`
- **EventEmitter:** `0x0056920a7aa0ed0516f33abade0b0ff4f5305a20cabd0117f49477eeb3be7e02`
- **Oracle:** `0x055cdd0a72d3043de27149d71b842060af32934612718c2225aa215f9e825674`
- **yUSD Token:** `0x0374317fb45421115f2b3b3df22dce36d922a00eb7b2f80966ebc23cb8b2cfda`
- **RoleStore:** `0x005cd9ac7159f8b1c7e4e7994effe29c2e42305f26cfbe948c51826082b16819`
- **NEW Verifier:** `0x171eb3059702908203fb75e2e28cbad3cb469de63b8b6e205f697f3e3568a10`

---

## Step 1: CollateralVault (MUST DO FIRST)

**Why:** Added new locking functions that PositionHandler needs

```bash
cd quickstart/contracts

# Declare
sncast declare --contract-name CollateralVault

# Deploy (replace <CLASS_HASH>):
sncast deploy \
  --class-hash <CLASS_HASH> \
  --constructor-calldata \
  0x0374317fb45421115f2b3b3df22dce36d922a00eb7b2f80966ebc23cb8b2cfda \
  0x005cd9ac7159f8b1c7e4e7994effe29c2e42305f26cfbe948c51826082b16819
```

**📝 SAVE:** New CollateralVault = `0x0379bd97c79feca626947ed63ceb390796b05c2bc98ef0fc0654cc2a186afb45` ✅

---

## Step 2: PositionHandler (MUST DO - Uses New Verifier + New CollateralVault)

**Why:** Modified to use locking functions + new verifier + new proof format

```bash
cd quickstart/contracts

# Declare
sncast declare --contract-name PositionHandler

# Deploy (replace <CLASS_HASH> and <NEW_COLLATERAL_VAULT>):
sncast deploy \
  --class-hash <CLASS_HASH> \
  --constructor-calldata \
  0x07528b96de355cfeb0358943484132ec60fdbda19ee71ea729c0e68b0dcc3e29 \
  0x0056920a7aa0ed0516f33abade0b0ff4f5305a20cabd0117f49477eeb3be7e02 \
  0x171eb3059702908203fb75e2e28cbad3cb469de63b8b6e205f697f3e3568a10 \
  0x0374317fb45421115f2b3b3df22dce36d922a00eb7b2f80966ebc23cb8b2cfda \
  <NEW_COLLATERAL_VAULT>
```

**📝 SAVE:** New PositionHandler = `0x002304423ec3e6dc51a553552373abf70a2d41ae5207eef86c69053e18418e04` ✅

---

## Step 3: LiquidationHandler (MUST DO - Uses New Verifier)

**Why:** Uses verifier, needs new verifier address

**Constructor:** `(data_store, event_emitter, verifier, collateral_vault)` - 4 params (NO yUSD token!)

```bash
cd quickstart/contracts

# Declare
sncast declare --contract-name LiquidationHandler

# Deploy (replace <CLASS_HASH> and <NEW_COLLATERAL_VAULT>):
sncast deploy \
  --class-hash <CLASS_HASH> \
  --constructor-calldata \
  0x07528b96de355cfeb0358943484132ec60fdbda19ee71ea729c0e68b0dcc3e29 \
  0x0056920a7aa0ed0516f33abade0b0ff4f5305a20cabd0117f49477eeb3be7e02 \
  0x171eb3059702908203fb75e2e28cbad3cb469de63b8b6e205f697f3e3568a10 \
  <NEW_COLLATERAL_VAULT>
```

**📝 SAVE:** New LiquidationHandler = `0x07de6911a02f3de91b4a41ffca1523d3ac6d8742c5fa7c02254bd747d04e3a67` ✅

---

## Step 4: OrderHandler (MUST DO - Calls New PositionHandler)

**Why:** Calls PositionHandler, needs new PositionHandler address

```bash
cd quickstart/contracts

# Declare
sncast declare --contract-name OrderHandler

# Deploy (replace <CLASS_HASH> and <NEW_POSITION_HANDLER>):
sncast deploy \
  --class-hash <CLASS_HASH> \
  --constructor-calldata \
  0x07528b96de355cfeb0358943484132ec60fdbda19ee71ea729c0e68b0dcc3e29 \
  0x0056920a7aa0ed0516f33abade0b0ff4f5305a20cabd0117f49477eeb3be7e02 \
  0x055cdd0a72d3043de27149d71b842060af32934612718c2225aa215f9e825674 \
  <NEW_POSITION_HANDLER>
```

**📝 SAVE:** New OrderHandler = `0x0372f7d1637fcbf86e6044ae5e11bf740c954bb6b112ab553b335c4db57773c6` ✅

---

## Step 5: PerpRouter (MUST DO - Final Step)

**Why:** Calls all handlers, needs all new handler addresses

```bash
cd quickstart/contracts

# Declare
sncast declare --contract-name PerpRouter

# Deploy (replace <CLASS_HASH> and all addresses):
sncast deploy \
  --class-hash <CLASS_HASH> \
  --constructor-calldata \
  <NEW_POSITION_HANDLER> \
  <NEW_ORDER_HANDLER> \
  <NEW_LIQUIDATION_HANDLER> \
  0x05bfcbb2c5564feb46ae0dd73d72b889ab2093fff3fc42bdca26437df525efc7
```

**Note:** RiskManager address stays the same (not modified, doesn't use verifier)

**📝 SAVE:** New PerpRouter = `0x0139557a6d9b63aead3ac75bfb0988f2235dd10bc1cdb594211662cb469b1562` ✅

---

## Step 6: Mint 1B yUSD to NEW CollateralVault

After Step 1, mint tokens to the new vault:

```bash
sncast invoke \
  --contract-address 0x0374317fb45421115f2b3b3df22dce36d922a00eb7b2f80966ebc23cb8b2cfda \
  --function "mint" \
  --calldata <NEW_COLLATERAL_VAULT_ADDRESS> 1000000000000000000000000000 0x0
```

---

## Step 7: Update Frontend Config

Edit `quickstart/app/src/config/contracts.ts`:

```typescript
export const CONTRACTS = {
  PERP_ROUTER: '<NEW_PERP_ROUTER>',
  POSITION_HANDLER: '<NEW_POSITION_HANDLER>',
  ORDER_HANDLER: '<NEW_ORDER_HANDLER>',
  LIQUIDATION_HANDLER: '<NEW_LIQUIDATION_HANDLER>',
  COLLATERAL_VAULT: '<NEW_COLLATERAL_VAULT>',
  RISK_MANAGER: '0x05bfcbb2c5564feb46ae0dd73d72b889ab2093fff3fc42bdca26437df525efc7', // OLD (not modified)
  // ... rest stays same
};
```

---

## ✅ Summary: 5 Contracts to Redeploy

1. ✅ CollateralVault (new locking functions)
2. ✅ PositionHandler (new verifier + locking)
3. ✅ LiquidationHandler (new verifier)
4. ✅ OrderHandler (new PositionHandler)
5. ✅ PerpRouter (new handlers)

**RiskManager:** ❌ Skip (not modified, doesn't use verifier)

---

## 🚀 Start Here

```bash
cd quickstart/contracts
sncast declare --contract-name CollateralVault
```

