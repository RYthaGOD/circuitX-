# Redeploy Contracts with New Verifier (Randomized Locking)

## ⚠️ IMPORTANT: New Verifier Deployed

**New Verifier Address:** `0x171eb3059702908203fb75e2e28cbad3cb469de63b8b6e205f697f3e3568a10`

**Class Hash:** `0x3de9e41616aaef99cd184bd14e48b805f3a0944a2179757af8a3599dd9e4214`

**Circuit Changes:**
- Added `deposited_balance` public input (for opening positions)
- Added `locked_collateral` public input (for closing positions)
- Returns `(commitment, locked_amount)` for open operations
- Returns `(commitment, collateral_released, payout, loss_to_vault)` for close operations

---

## Contracts to Redeploy (in dependency order)

### 1. PositionHandler ✅ MUST REDEPLOY

**Why:** Uses verifier directly for proof verification

**Current Address:** `0x067cc28c5c154c38dece68f21416f0da3db3741b0a4436e7e6a1917a79ee9192`

**Constructor Parameters:**
```bash
sncast deploy \
  --class-hash <NEW_POSITION_HANDLER_CLASS_HASH> \
  --constructor-calldata \
  0x07528b96de355cfeb0358943484132ec60fdbda19ee71ea729c0e68b0dcc3e29 \  # DataStore
  0x0056920a7aa0ed0516f33abade0b0ff4f5305a20cabd0117f49477eeb3be7e02 \  # EventEmitter
  0x171eb3059702908203fb75e2e28cbad3cb469de63b8b6e205f697f3e3568a10 \  # NEW Verifier
  0x26cb40ff6fda0e89fe50a7b229c5ffb172177406f85ac2fa96ac3e2a2cb7d2d \  # yUSD Token
  0x0374317fb45421115f2b3b3df22dce36d922a00eb7b2f80966ebc23cb8b2cfda   # CollateralVault
```

**Steps:**
1. Declare: `sncast declare --contract-name PositionHandler`
2. Deploy with new verifier address (see above)
3. Update `DEPLOYED_ADDRESSES.md` with new address

---

### 2. LiquidationHandler ✅ MUST REDEPLOY

**Why:** Uses verifier for liquidation proof verification

**Current Address:** `0x00bbd58ea83c743c669e96619af72542252abbc3f011b9b983449a76268187b2`

**Constructor Parameters:**
```bash
sncast deploy \
  --class-hash <NEW_LIQUIDATION_HANDLER_CLASS_HASH> \
  --constructor-calldata \
  0x07528b96de355cfeb0358943484132ec60fdbda19ee71ea729c0e68b0dcc3e29 \  # DataStore
  0x0056920a7aa0ed0516f33abade0b0ff4f5305a20cabd0117f49477eeb3be7e02 \  # EventEmitter
  0x26cb40ff6fda0e89fe50a7b229c5ffb172177406f85ac2fa96ac3e2a2cb7d2d \  # yUSD Token
  0x171eb3059702908203fb75e2e28cbad3cb469de63b8b6e205f697f3e3568a10 \  # NEW Verifier
  0x0374317fb45421115f2b3b3df22dce36d922a00eb7b2f80966ebc23cb8b2cfda   # CollateralVault
```

**Steps:**
1. Declare: `sncast declare --contract-name LiquidationHandler`
2. Deploy with new verifier address
3. Update `DEPLOYED_ADDRESSES.md`

---

### 3. OrderHandler ✅ MUST REDEPLOY

**Why:** Calls PositionHandler (which uses new verifier)

**Current Address:** `0x00f8d5b52b18f0041524b80f775cb9a56f9428a8cd5db2aaaf8765bd3b9ec87f`

**Constructor Parameters:**
```bash
sncast deploy \
  --class-hash <NEW_ORDER_HANDLER_CLASS_HASH> \
  --constructor-calldata \
  0x07528b96de355cfeb0358943484132ec60fdbda19ee71ea729c0e68b0dcc3e29 \  # DataStore
  0x0056920a7aa0ed0516f33abade0b0ff4f5305a20cabd0117f49477eeb3be7e02 \  # EventEmitter
  0x055cdd0a72d3043de27149d71b842060af32934612718c2225aa215f9e825674 \  # Oracle
  <NEW_POSITION_HANDLER_ADDRESS> \  # NEW PositionHandler address
```

**Steps:**
1. Wait for PositionHandler redeployment
2. Declare: `sncast declare --contract-name OrderHandler`
3. Deploy with new PositionHandler address
4. Update `DEPLOYED_ADDRESSES.md`

---

### 4. PerpRouter ✅ MUST REDEPLOY

**Why:** Calls PositionHandler and OrderHandler (which use new verifier)

**Current Address:** `0x056ae8ddbb1ae512cf96458d4cf758036913ae849fc2fa0d40a03f8fbd120ffe`

**Constructor Parameters:**
```bash
sncast deploy \
  --class-hash <NEW_PERP_ROUTER_CLASS_HASH> \
  --constructor-calldata \
  <NEW_POSITION_HANDLER_ADDRESS> \  # NEW PositionHandler
  <NEW_ORDER_HANDLER_ADDRESS> \     # NEW OrderHandler
  <NEW_LIQUIDATION_HANDLER_ADDRESS> \  # NEW LiquidationHandler
  <NEW_RISK_MANAGER_ADDRESS>        # NEW RiskManager (if redeployed)
```

**Steps:**
1. Wait for all handler redeployments
2. Declare: `sncast declare --contract-name PerpRouter`
3. Deploy with new handler addresses
4. Update `DEPLOYED_ADDRESSES.md`
5. **Update frontend config:** `quickstart/app/src/config/contracts.ts`

---

### 5. RiskManager (Optional - if it uses verifier)

**Current Address:** `0x05bfcbb2c5564feb46ae0dd73d72b889ab2093fff3fc42bdca26437df525efc7`

**Check if RiskManager uses verifier:**
- If yes: Redeploy with new verifier address
- If no: Can skip (but update PerpRouter if RiskManager address changes)

---

## Frontend Updates Required

After redeployment, update:

**File:** `quickstart/app/src/config/contracts.ts`

Update these addresses:
- `PERP_ROUTER` → New PerpRouter address
- `POSITION_HANDLER` → New PositionHandler address
- `ORDER_HANDLER` → New OrderHandler address
- `LIQUIDATION_HANDLER` → New LiquidationHandler address
- `RISK_MANAGER` → New RiskManager address (if redeployed)

---

## Testing After Redeployment

1. **Test Open Position:**
   - Verify `deposited_balance` is passed correctly
   - Verify `locked_amount` is returned and randomized
   - Verify collateral is locked in vault

2. **Test Close Position:**
   - Verify `locked_collateral` is passed correctly
   - Verify `collateral_released`, `payout`, `loss_to_vault` are returned
   - Verify collateral is unlocked and profits are distributed

3. **Verify Privacy:**
   - Check that `locked_amount` is different from `private_margin` (randomized)
   - Verify position size, direction, and trader secret remain private

---

## Quick Reference: Current Contract Addresses

- **DataStore:** `0x07528b96de355cfeb0358943484132ec60fdbda19ee71ea729c0e68b0dcc3e29`
- **EventEmitter:** `0x0056920a7aa0ed0516f33abade0b0ff4f5305a20cabd0117f49477eeb3be7e02`
- **Oracle:** `0x055cdd0a72d3043de27149d71b842060af32934612718c2225aa215f9e825674`
- **yUSD Token:** `0x26cb40ff6fda0e89fe50a7b229c5ffb172177406f85ac2fa96ac3e2a2cb7d2d`
- **CollateralVault:** `0x0374317fb45421115f2b3b3df22dce36d922a00eb7b2f80966ebc23cb8b2cfda`
- **NEW Verifier:** `0x171eb3059702908203fb75e2e28cbad3cb469de63b8b6e205f697f3e3568a10`

---

## Notes

- All contracts that use the verifier MUST be redeployed
- Contracts that call redeployed contracts MUST also be redeployed
- Update frontend config after all redeployments are complete
- Test thoroughly before using in production













