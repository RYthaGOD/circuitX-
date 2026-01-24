# Step-by-Step Contract Redeployment with New Verifier

## Prerequisites
- ✅ New Verifier deployed: `0x171eb3059702908203fb75e2e28cbad3cb469de63b8b6e205f697f3e3568a10`
- ✅ Circuit compiled and verified
- ✅ All contract code reviewed and ready

## Current Contract Addresses (Reference)

- **DataStore:** `0x07528b96de355cfeb0358943484132ec60fdbda19ee71ea729c0e68b0dcc3e29`
- **EventEmitter:** `0x0056920a7aa0ed0516f33abade0b0ff4f5305a20cabd0117f49477eeb3be7e02`
- **Oracle:** `0x055cdd0a72d3043de27149d71b842060af32934612718c2225aa215f9e825674`
- **yUSD Token:** `0x26cb40ff6fda0e89fe50a7b229c5ffb172177406f85ac2fa96ac3e2a2cb7d2d`
- **CollateralVault:** `0x07a05cd688bb3c68d25a49c4882ecfdb3a2836f827fe0367592b994d12c2f13d`
- **NEW Verifier:** `0x171eb3059702908203fb75e2e28cbad3cb469de63b8b6e205f697f3e3568a10`

---

## Step 1: Redeploy CollateralVault (if locking functions are new)

**Check:** If `lock_collateral`, `unlock_collateral`, `get_locked_collateral` are new functions, redeploy.

```bash
cd quickstart/contracts

# Declare CollateralVault
sncast declare --contract-name CollateralVault

# Copy the class hash from output, then deploy:
sncast deploy \
  --class-hash <NEW_COLLATERAL_VAULT_CLASS_HASH> \
  --constructor-calldata \
  0x26cb40ff6fda0e89fe50a7b229c5ffb172177406f85ac2fa96ac3e2a2cb7d2d \  # yUSD Token
  0x005cd9ac7159f8b1c7e4e7994effe29c2e42305f26cfbe948c51826082b16819   # RoleStore
```

**Save the new CollateralVault address!** You'll need it for PositionHandler.

---

## Step 2: Declare and Deploy PositionHandler

```bash
cd quickstart/contracts

# Declare PositionHandler
sncast declare --contract-name PositionHandler

# Copy the class hash, then deploy with NEW verifier address:
sncast deploy \
  --class-hash <NEW_POSITION_HANDLER_CLASS_HASH> \
  --constructor-calldata \
  0x07528b96de355cfeb0358943484132ec60fdbda19ee71ea729c0e68b0dcc3e29 \  # DataStore
  0x0056920a7aa0ed0516f33abade0b0ff4f5305a20cabd0117f49477eeb3be7e02 \  # EventEmitter
  0x171eb3059702908203fb75e2e28cbad3cb469de63b8b6e205f697f3e3568a10 \  # NEW Verifier
  0x26cb40ff6fda0e89fe50a7b229c5ffb172177406f85ac2fa96ac3e2a2cb7d2d \  # yUSD Token
  <COLLATERAL_VAULT_ADDRESS>  # Use NEW address if redeployed, or old: 0x07a05cd688bb3c68d25a49c4882ecfdb3a2836f827fe0367592b994d12c2f13d
```

**Save the new PositionHandler address!** You'll need it for OrderHandler and PerpRouter.

---

## Step 3: Declare and Deploy LiquidationHandler

```bash
cd quickstart/contracts

# Declare LiquidationHandler
sncast declare --contract-name LiquidationHandler

# Copy the class hash, then deploy with NEW verifier address:
sncast deploy \
  --class-hash <NEW_LIQUIDATION_HANDLER_CLASS_HASH> \
  --constructor-calldata \
  0x07528b96de355cfeb0358943484132ec60fdbda19ee71ea729c0e68b0dcc3e29 \  # DataStore
  0x0056920a7aa0ed0516f33abade0b0ff4f5305a20cabd0117f49477eeb3be7e02 \  # EventEmitter
  0x26cb40ff6fda0e89fe50a7b229c5ffb172177406f85ac2fa96ac3e2a2cb7d2d \  # yUSD Token
  0x171eb3059702908203fb75e2e28cbad3cb469de63b8b6e205f697f3e3568a10 \  # NEW Verifier
  <COLLATERAL_VAULT_ADDRESS>  # Use NEW address if redeployed, or old: 0x07a05cd688bb3c68d25a49c4882ecfdb3a2836f827fe0367592b994d12c2f13d
```

**Save the new LiquidationHandler address!** You'll need it for PerpRouter.

---

## Step 4: Declare and Deploy OrderHandler

```bash
cd quickstart/contracts

# Declare OrderHandler
sncast declare --contract-name OrderHandler

# Copy the class hash, then deploy with NEW PositionHandler address:
sncast deploy \
  --class-hash <NEW_ORDER_HANDLER_CLASS_HASH> \
  --constructor-calldata \
  0x07528b96de355cfeb0358943484132ec60fdbda19ee71ea729c0e68b0dcc3e29 \  # DataStore
  0x0056920a7aa0ed0516f33abade0b0ff4f5305a20cabd0117f49477eeb3be7e02 \  # EventEmitter
  0x055cdd0a72d3043de27149d71b842060af32934612718c2225aa215f9e825674 \  # Oracle
  <NEW_POSITION_HANDLER_ADDRESS>  # From Step 2
```

**Save the new OrderHandler address!** You'll need it for PerpRouter.

---

## Step 5: Declare and Deploy RiskManager (if it uses verifier)

**Check if RiskManager uses verifier. If not, skip this step.**

```bash
cd quickstart/contracts

# Declare RiskManager
sncast declare --contract-name RiskManager

# Copy the class hash, then deploy:
sncast deploy \
  --class-hash <NEW_RISK_MANAGER_CLASS_HASH> \
  --constructor-calldata \
  0x07528b96de355cfeb0358943484132ec60fdbda19ee71ea729c0e68b0dcc3e29 \  # DataStore
  0x055cdd0a72d3043de27149d71b842060af32934612718c2225aa215f9e825674 \  # Oracle
```

**Save the new RiskManager address if deployed!**

---

## Step 6: Declare and Deploy PerpRouter

```bash
cd quickstart/contracts

# Declare PerpRouter
sncast declare --contract-name PerpRouter

# Copy the class hash, then deploy with ALL NEW handler addresses:
sncast deploy \
  --class-hash <NEW_PERP_ROUTER_CLASS_HASH> \
  --constructor-calldata \
  <NEW_POSITION_HANDLER_ADDRESS> \     # From Step 2
  <NEW_ORDER_HANDLER_ADDRESS> \        # From Step 4
  <NEW_LIQUIDATION_HANDLER_ADDRESS> \ # From Step 3
  <NEW_RISK_MANAGER_ADDRESS>           # From Step 5 (or old: 0x05bfcbb2c5564feb46ae0dd73d72b889ab2093fff3fc42bdca26437df525efc7)
```

**Save the new PerpRouter address!** This is the main entry point.

---

## Step 7: Update Frontend Config

After all deployments, update `quickstart/app/src/config/contracts.ts`:

```typescript
export const CONTRACTS = {
  PERP_ROUTER: '<NEW_PERP_ROUTER_ADDRESS>',
  POSITION_HANDLER: '<NEW_POSITION_HANDLER_ADDRESS>',
  ORDER_HANDLER: '<NEW_ORDER_HANDLER_ADDRESS>',
  LIQUIDATION_HANDLER: '<NEW_LIQUIDATION_HANDLER_ADDRESS>',
  RISK_MANAGER: '<NEW_RISK_MANAGER_ADDRESS>', // or old if not redeployed
  DATA_STORE: '0x07528b96de355cfeb0358943484132ec60fdbda19ee71ea729c0e68b0dcc3e29',
  COLLATERAL_VAULT: '<NEW_COLLATERAL_VAULT_ADDRESS>', // or old if not redeployed
  // ... rest of addresses
};
```

---

## Step 8: Update DEPLOYED_ADDRESSES.md

Add all new addresses to `quickstart/DEPLOYED_ADDRESSES.md` with:
- New contract addresses
- New class hashes
- Declaration transaction hashes
- Deployment transaction hashes
- Explorer links

---

## Quick Checklist

- [ ] Step 1: CollateralVault (if needed)
- [ ] Step 2: PositionHandler ✅ (MUST DO - uses new verifier)
- [ ] Step 3: LiquidationHandler ✅ (MUST DO - uses new verifier)
- [ ] Step 4: OrderHandler ✅ (MUST DO - uses new PositionHandler)
- [ ] Step 5: RiskManager (if uses verifier)
- [ ] Step 6: PerpRouter ✅ (MUST DO - uses all handlers)
- [ ] Step 7: Update frontend config
- [ ] Step 8: Update DEPLOYED_ADDRESSES.md

---

## Notes

- **Always save class hashes and addresses** from each step before proceeding
- **Test each deployment** before moving to the next
- **Keep old addresses** in DEPLOYED_ADDRESSES.md marked as deprecated
- **Verify transactions** on explorer before proceeding













