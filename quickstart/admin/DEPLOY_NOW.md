# 🚀 Direct Redeployment Commands - Execute in Order

## ⚠️ IMPORTANT: New Verifier Address
**Verifier:** `0x171eb3059702908203fb75e2e28cbad3cb469de63b8b6e205f697f3e3568a10`

## 📋 Fixed Addresses (Use These)
- **DataStore:** `0x07528b96de355cfeb0358943484132ec60fdbda19ee71ea729c0e68b0dcc3e29`
- **EventEmitter:** `0x0056920a7aa0ed0516f33abade0b0ff4f5305a20cabd0117f49477eeb3be7e02`
- **Oracle:** `0x055cdd0a72d3043de27149d71b842060af32934612718c2225aa215f9e825674`
- **yUSD Token:** `0x26cb40ff6fda0e89fe50a7b229c5ffb172177406f85ac2fa96ac3e2a2cb7d2d`
- **RoleStore:** `0x005cd9ac7159f8b1c7e4e7994effe29c2e42305f26cfbe948c51826082b16819`
- **CollateralVault (OLD):** `0x07a05cd688bb3c68d25a49c4882ecfdb3a2836f827fe0367592b994d12c2f13d`

---

## Step 1: CollateralVault (if locking functions are new)

```bash
cd quickstart/contracts

# Declare
sncast declare --contract-name CollateralVault

# Copy class hash from output, then deploy:
sncast deploy \
  --class-hash <CLASS_HASH_FROM_DECLARE> \
  --constructor-calldata \
  0x26cb40ff6fda0e89fe50a7b229c5ffb172177406f85ac2fa96ac3e2a2cb7d2d \
  0x005cd9ac7159f8b1c7e4e7994effe29c2e42305f26cfbe948c51826082b16819
```

**📝 SAVE:** New CollateralVault address = `_________________`

---

## Step 2: PositionHandler (MUST DO)

```bash
cd quickstart/contracts

# Declare
sncast declare --contract-name PositionHandler

# Deploy with NEW verifier (replace <CLASS_HASH> and <COLLATERAL_VAULT>):
sncast deploy \
  --class-hash <CLASS_HASH_FROM_DECLARE> \
  --constructor-calldata \
  0x07528b96de355cfeb0358943484132ec60fdbda19ee71ea729c0e68b0dcc3e29 \
  0x0056920a7aa0ed0516f33abade0b0ff4f5305a20cabd0117f49477eeb3be7e02 \
  0x171eb3059702908203fb75e2e28cbad3cb469de63b8b6e205f697f3e3568a10 \
  0x26cb40ff6fda0e89fe50a7b229c5ffb172177406f85ac2fa96ac3e2a2cb7d2d \
  <COLLATERAL_VAULT_ADDRESS>
```

**📝 SAVE:** New PositionHandler address = `_________________`

---

## Step 3: LiquidationHandler (MUST DO)

```bash
cd quickstart/contracts

# Declare
sncast declare --contract-name LiquidationHandler

# Deploy with NEW verifier (replace <CLASS_HASH> and <COLLATERAL_VAULT>):
sncast deploy \
  --class-hash <CLASS_HASH_FROM_DECLARE> \
  --constructor-calldata \
  0x07528b96de355cfeb0358943484132ec60fdbda19ee71ea729c0e68b0dcc3e29 \
  0x0056920a7aa0ed0516f33abade0b0ff4f5305a20cabd0117f49477eeb3be7e02 \
  0x26cb40ff6fda0e89fe50a7b229c5ffb172177406f85ac2fa96ac3e2a2cb7d2d \
  0x171eb3059702908203fb75e2e28cbad3cb469de63b8b6e205f697f3e3568a10 \
  <COLLATERAL_VAULT_ADDRESS>
```

**📝 SAVE:** New LiquidationHandler address = `_________________`

---

## Step 4: OrderHandler (MUST DO)

```bash
cd quickstart/contracts

# Declare
sncast declare --contract-name OrderHandler

# Deploy with NEW PositionHandler (replace <CLASS_HASH> and <POSITION_HANDLER>):
sncast deploy \
  --class-hash <CLASS_HASH_FROM_DECLARE> \
  --constructor-calldata \
  0x07528b96de355cfeb0358943484132ec60fdbda19ee71ea729c0e68b0dcc3e29 \
  0x0056920a7aa0ed0516f33abade0b0ff4f5305a20cabd0117f49477eeb3be7e02 \
  0x055cdd0a72d3043de27149d71b842060af32934612718c2225aa215f9e825674 \
  <POSITION_HANDLER_ADDRESS>
```

**📝 SAVE:** New OrderHandler address = `_________________`

---

## Step 5: RiskManager (Check if uses verifier - if not, skip)

```bash
cd quickstart/contracts

# Declare
sncast declare --contract-name RiskManager

# Deploy (replace <CLASS_HASH>):
sncast deploy \
  --class-hash <CLASS_HASH_FROM_DECLARE> \
  --constructor-calldata \
  0x07528b96de355cfeb0358943484132ec60fdbda19ee71ea729c0e68b0dcc3e29 \
  0x055cdd0a72d3043de27149d71b842060af32934612718c2225aa215f9e825674
```

**📝 SAVE:** New RiskManager address = `_________________` (or use old: `0x05bfcbb2c5564feb46ae0dd73d72b889ab2093fff3fc42bdca26437df525efc7`)

---

## Step 6: PerpRouter (MUST DO - Final Step)

```bash
cd quickstart/contracts

# Declare
sncast declare --contract-name PerpRouter

# Deploy with ALL NEW addresses (replace all <ADDRESS> placeholders):
sncast deploy \
  --class-hash <CLASS_HASH_FROM_DECLARE> \
  --constructor-calldata \
  <POSITION_HANDLER_ADDRESS> \
  <ORDER_HANDLER_ADDRESS> \
  <LIQUIDATION_HANDLER_ADDRESS> \
  <RISK_MANAGER_ADDRESS>
```

**📝 SAVE:** New PerpRouter address = `_________________`

---

## Step 7: Update Frontend Config

Edit `quickstart/app/src/config/contracts.ts`:

```typescript
export const CONTRACTS = {
  PERP_ROUTER: '<NEW_PERP_ROUTER_ADDRESS>',
  POSITION_HANDLER: '<NEW_POSITION_HANDLER_ADDRESS>',
  ORDER_HANDLER: '<NEW_ORDER_HANDLER_ADDRESS>',
  LIQUIDATION_HANDLER: '<NEW_LIQUIDATION_HANDLER_ADDRESS>',
  RISK_MANAGER: '<NEW_RISK_MANAGER_ADDRESS>', // or old if not redeployed
  COLLATERAL_VAULT: '<NEW_COLLATERAL_VAULT_ADDRESS>', // or old if not redeployed
  // ... rest stays same
};
```

---

## Step 8: Update DEPLOYED_ADDRESSES.md

Add all new addresses with:
- Contract addresses
- Class hashes
- Transaction hashes
- Explorer links

---

## ✅ Quick Checklist

- [ ] Step 1: CollateralVault (if needed)
- [ ] Step 2: PositionHandler ✅
- [ ] Step 3: LiquidationHandler ✅
- [ ] Step 4: OrderHandler ✅
- [ ] Step 5: RiskManager (optional)
- [ ] Step 6: PerpRouter ✅
- [ ] Step 7: Update frontend
- [ ] Step 8: Update DEPLOYED_ADDRESSES.md

---

## 🎯 Start Here

**Begin with Step 2 (PositionHandler)** - it's the most critical. You can do Step 1 (CollateralVault) later if the locking functions were already in the deployed version.

**Ready? Start with:**
```bash
cd quickstart/contracts
sncast declare --contract-name PositionHandler
```









