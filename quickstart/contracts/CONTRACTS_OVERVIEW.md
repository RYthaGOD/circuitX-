# Contracts Overview - Deposit & Withdrawal

## Which Contracts Handle Deposits and Withdrawals?

### Primary Contract: **PositionHandler**

The `PositionHandler` contract (`handlers/position_handler.cairo`) is the **main contract** that handles deposits and withdrawals when opening and closing positions.

## Current Implementation

### Opening Position (Deposit)

**Contract:** `PositionHandler.open_position()`

**Flow:**
1. User approves `PositionHandler` to spend yUSD tokens
2. User calls `PositionHandler.open_position()`
3. Contract verifies ZK proof (validates margin)
4. Contract calls `ERC20.transfer_from()` to get collateral from user
5. Contract updates collateral pool in `DataStore`
6. Contract creates position

**Code Location:**
- `quickstart/contracts/src/handlers/position_handler.cairo` (lines 145-150)

### Closing Position (Withdrawal)

**Contract:** `PositionHandler.close_position()`

**Flow:**
1. User calls `PositionHandler.close_position()`
2. Contract verifies ZK proof (validates PnL)
3. Contract calculates payout = margin + PnL - fees
4. Contract updates collateral pool in `DataStore`
5. Contract calls `ERC20.transfer()` to send payout to user

**Code Location:**
- `quickstart/contracts/src/handlers/position_handler.cairo` (lines 256-260)

## Contract Responsibilities

| Contract | Responsibility | When Used |
|----------|---------------|-----------|
| **PositionHandler** | Direct token transfers | Opening/closing positions |
| **CollateralVault** | Vault-based deposits | Alternative pattern (not used) |
| **DataStore** | Tracks collateral pool | All operations |
| **ERC20 (yUSD)** | Token contract | All transfers |

## Token Transfer Methods

### Method 1: Direct Transfer (Current)

```cairo
// In PositionHandler.open_position()
let yusd = IERC20Dispatcher { contract_address: yusd_token_address };
yusd.transfer_from(
    sender: user_address,
    recipient: position_handler_address,
    amount: collateral_amount
);
```

**Used for:** Depositing collateral when opening positions

### Method 2: Direct Transfer Out (Current)

```cairo
// In PositionHandler.close_position()
let yusd = IERC20Dispatcher { contract_address: yusd_token_address };
yusd.transfer(
    recipient: user_address,
    amount: payout
);
```

**Used for:** Withdrawing funds when closing positions

## Alternative: Vault Pattern

If you want to use the vault pattern instead:

1. Deploy `CollateralVault`
2. User calls `vault.deposit(market_id, amount)`
3. `PositionHandler` validates deposit exists
4. On close, `PositionHandler` calls `vault.withdraw()`

**Benefits:**
- Better separation of concerns
- Can add features (insurance, staking)
- Easier to audit

**Current Status:** Not implemented in main flow

## Summary

**Answer:** The `PositionHandler` contract handles all deposit and withdrawal logic when opening and closing positions. It directly interacts with the ERC20 token contract to transfer funds, and updates the `DataStore` to track collateral pool balances.

**Files:**
- `quickstart/contracts/src/handlers/position_handler.cairo` - Main deposit/withdrawal logic
- `quickstart/contracts/src/vault/collateral_vault.cairo` - Alternative vault pattern (optional)
- `quickstart/contracts/DEPOSIT_WITHDRAWAL.md` - Detailed documentation

