# How to Mint yUSD Tokens

## Quick Mint Command

```bash
cd yusd-token

# Mint 1000 yUSD to your address (uses default account from snfoundry.toml)
sncast invoke \
  --contract-address 0x0374317fb45421115f2b3b3df22dce36d922a00eb7b2f80966ebc23cb8b2cfda \
  --function mint \
  --calldata 1000000000000000000000 0
```

## Two Ways to Mint

### 1. Mint to Your Address (`mint`)

Mints tokens directly to the caller's address (your account).

```bash
sncast invoke \
  --contract-address 0x0374317fb45421115f2b3b3df22dce36d922a00eb7b2f80966ebc23cb8b2cfda \
  --function mint \
  --calldata <AMOUNT_LOW> <AMOUNT_HIGH>
```

**Note**: Uses default account from `snfoundry.toml` (yieldstark). No `--account` flag needed.

### 2. Mint to Specific Address (`mint_to`)

Mints tokens to a specific recipient address.

```bash
sncast invoke \
  --contract-address 0x0374317fb45421115f2b3b3df22dce36d922a00eb7b2f80966ebc23cb8b2cfda \
  --function mint_to \
  --calldata <RECIPIENT_ADDRESS> <AMOUNT_LOW> <AMOUNT_HIGH>
```

**Note**: Uses default account from `snfoundry.toml` (yieldstark).

## Amount Format

**Important**: `u256` amounts must be passed as two values (low and high parts).

For most amounts, the high part is `0`. Only use a non-zero high part for very large amounts (> 2^128).

### Common Amounts

| Tokens | Amount (wei) | Low | High | Command |
|--------|--------------|-----|------|---------|
| 1 yUSD | 1,000,000,000,000,000,000 | `1000000000000000000` | `0` | `--calldata 1000000000000000000 0` |
| 100 yUSD | 100,000,000,000,000,000,000 | `100000000000000000000` | `0` | `--calldata 100000000000000000000 0` |
| 1,000 yUSD | 1,000,000,000,000,000,000,000 | `1000000000000000000000` | `0` | `--calldata 1000000000000000000000 0` |
| 10,000 yUSD | 10,000,000,000,000,000,000,000 | `10000000000000000000000` | `0` | `--calldata 10000000000000000000000 0` |
| 100,000 yUSD | 100,000,000,000,000,000,000,000 | `100000000000000000000000` | `0` | `--calldata 100000000000000000000000 0` |
| 1,000,000 yUSD | 1,000,000,000,000,000,000,000,000 | `1000000000000000000000000` | `0` | `--calldata 1000000000000000000000000 0` |

## Examples

### Example 1: Mint 1000 yUSD to Yourself

```bash
sncast invoke \
  --contract-address 0x0374317fb45421115f2b3b3df22dce36d922a00eb7b2f80966ebc23cb8b2cfda \
  --function mint \
  --calldata 1000000000000000000000 0
```

### Example 2: Mint 10,000 yUSD to Another Address

```bash
sncast invoke \
  --contract-address 0x0374317fb45421115f2b3b3df22dce36d922a00eb7b2f80966ebc23cb8b2cfda \
  --function mint_to \
  --calldata 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef 10000000000000000000000 0
```

## Verify Minting

After minting, check your balance:

```bash
# Check your balance
sncast call \
  --contract-address 0x0374317fb45421115f2b3b3df22dce36d922a00eb7b2f80966ebc23cb8b2cfda \
  --function balance_of \
  --calldata 0x027292ef24ba913a086183713992b43e781b681796a0bbdb00ae947ca21fa9c8

# Check total supply
sncast call \
  --contract-address 0x0374317fb45421115f2b3b3df22dce36d922a00eb7b2f80966ebc23cb8b2cfda \
  --function total_supply
```

## Notes

- ✅ **Anyone can mint** - The contract allows public minting (faucet functionality)
- ✅ **No limits** - You can mint any amount up to the total supply cap (10B yUSD)
- ✅ **18 decimals** - All amounts must account for 18 decimal places
- ✅ **Free minting** - No fees required (only gas for the transaction)

## Troubleshooting

### Error: "Insufficient balance"
- Make sure your account has enough funds for gas fees
- Get testnet tokens from: https://faucet.ztarknet.cash/

### Error: "Failed to deserialize"
- Make sure you're passing `u256` as two values (low and high)
- Check that the recipient address is valid (64 hex characters starting with 0x)

### Error: "Account not found"
- Make sure you're using the correct account name: `yieldstark`
- Check with: `sncast account list`

