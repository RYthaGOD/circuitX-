# Balance System Explanation

## Overview

The perpetual trading system uses a collateral vault to manage user funds. Understanding the different balance types is crucial for trading.

## Balance Types

### 1. Vault Balance (Total Balance)
- **What it is**: Your total balance deposited in the CollateralVault contract
- **Where to see it**: Deposit Modal → "Vault Balance"
- **Example**: 820.44 yUSD

This represents all the yUSD tokens you have deposited into the vault, regardless of whether they're locked in positions or available for trading.

### 2. Locked Collateral
- **What it is**: The amount of your vault balance that is currently locked as margin for open positions
- **Why it's locked**: When you open a position, the required margin is locked to cover potential losses
- **When it's unlocked**: When you close the position, the locked collateral is released back to your available balance
- **Example**: 179.56 yUSD (locked in open positions)

### 3. Available Balance (Available to Trade)
- **What it is**: The amount you can use to open new positions
- **Calculation**: `Available Balance = Vault Balance - Locked Collateral`
- **Where to see it**: Trading Interface → "Available to Trade"
- **Example**: 640.88 yUSD

This is the amount you can actually use for new trades. It's your total vault balance minus any collateral currently locked in open positions.

## Example Scenario

Let's say you have:
- **Vault Balance**: 820.44 yUSD
- **Locked Collateral**: 179.56 yUSD (from 1 open position with 179.56 yUSD margin)
- **Available Balance**: 640.88 yUSD

**Calculation**: 820.44 - 179.56 = 640.88 yUSD

This means:
- You can open new positions using up to 640.88 yUSD
- 179.56 yUSD is currently locked in your open position(s)
- If you close all positions, the 179.56 yUSD will be unlocked and added back to your available balance

## How It Works

### Opening a Position
1. You specify a margin amount (e.g., 100 yUSD)
2. The system locks this amount from your available balance
3. Your available balance decreases by 100 yUSD
4. Your locked collateral increases by 100 yUSD
5. Your vault balance remains the same (no funds leave the vault)

### Closing a Position
1. The position is closed (profit/loss is calculated)
2. The locked collateral is unlocked
3. Your available balance increases by the unlocked amount
4. Your locked collateral decreases
5. Your vault balance may change if there was profit/loss

## Important Notes

- **Vault Balance** never decreases when opening positions (funds stay in the vault)
- **Available Balance** decreases when opening positions (margin is locked)
- **Locked Collateral** increases when opening positions
- When you close a position, locked collateral is released back to available balance
- If you have multiple positions, all their locked collateral is summed together

## Visual Representation

```
┌─────────────────────────────────────┐
│     Vault Balance: 820.44 yUSD     │
│  (Total funds in CollateralVault)  │
└─────────────────────────────────────┘
           │
           ├─ Locked Collateral: 179.56 yUSD
           │  (Margin for open positions)
           │
           └─ Available Balance: 640.88 yUSD
              (Can use for new trades)
```

## FAQ

**Q: Why is my available balance less than my vault balance?**  
A: Because you have open positions that are using margin. The difference is your locked collateral.

**Q: Can I use my locked collateral for new trades?**  
A: No, locked collateral is reserved for your open positions. You must close positions to unlock the collateral.

**Q: What happens if I close all my positions?**  
A: All locked collateral is released, and your available balance will equal your vault balance (minus any losses or plus any profits).

**Q: Can my available balance be negative?**  
A: No, available balance cannot go below zero. You cannot open a position if you don't have enough available balance.

**Q: Does vault balance include profits/losses?**  
A: Yes, when you close a position, any profit is added to your vault balance, and any loss is deducted from it.

## Technical Details

### Contract Functions

- `get_user_balance(user, market_id)`: Returns the user's total balance in the vault (ignores market_id, returns per-user balance)
- `get_locked_collateral(user, market_id)`: Returns the user's locked collateral (ignores market_id, returns per-user locked amount)
- `lock_collateral(user, market_id, amount)`: Locks collateral for a position
- `unlock_collateral(user, market_id, amount)`: Unlocks collateral when a position closes

### Frontend Calculation

```typescript
availableBalance = vaultBalance - lockedCollateral
```

This calculation is done in `fetchAvailableBalance()` in `balanceUtils.ts`.

## Summary

- **Vault Balance** = Total funds in vault
- **Locked Collateral** = Funds locked in open positions
- **Available Balance** = Vault Balance - Locked Collateral

The available balance is what you can actually use for new trades. It's always less than or equal to your vault balance, and the difference is your locked collateral.

