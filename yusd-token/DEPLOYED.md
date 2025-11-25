# yUSD Token - Deployment Information

## ✅ Successfully Deployed

**Contract Address**: `0x0374317fb45421115f2b3b3df22dce36d922a00eb7b2f80966ebc23cb8b2cfda`

**Transaction Hash**: `0x00e02753abb5ce257b2cfc2b84d3141d664ec24a1cf751b2361103943902b389`

**Network**: Ztarknet (https://ztarknet-madara.d.karnot.xyz)

**Deployed By**: yieldstark (0x027292ef24ba913a086183713992b43e781b681796a0bbdb00ae947ca21fa9c8)

**Date**: $(date)

---

## Token Details

- **Name**: yUSD
- **Symbol**: yUSD  
- **Decimals**: 18
- **Initial Supply**: 0 (users mint via faucet)
- **Total Supply Cap**: 10,000,000,000 yUSD (10B)
- **Minting**: Public (anyone can mint)

---

## Quick Commands

### Verify Deployment

```bash
cd yusd-token

# Check token name
sncast call \
  --contract-address 0x0374317fb45421115f2b3b3df22dce36d922a00eb7b2f80966ebc23cb8b2cfda \
  --function name

# Check token symbol
sncast call \
  --contract-address 0x0374317fb45421115f2b3b3df22dce36d922a00eb7b2f80966ebc23cb8b2cfda \
  --function symbol

# Check total supply
sncast call \
  --contract-address 0x0374317fb45421115f2b3b3df22dce36d922a00eb7b2f80966ebc23cb8b2cfda \
  --function total_supply
```

### Mint Tokens

```bash
# Mint 1000 yUSD (1000 * 10^18)
sncast invoke \
  --contract-address 0x0374317fb45421115f2b3b3df22dce36d922a00eb7b2f80966ebc23cb8b2cfda \
  --function mint \
  --calldata 1000000000000000000000 0

# Mint to a specific address
sncast invoke \
  --contract-address 0x0374317fb45421115f2b3b3df22dce36d922a00eb7b2f80966ebc23cb8b2cfda \
  --function mint_to \
  --calldata <RECIPIENT_ADDRESS> <AMOUNT_LOW> <AMOUNT_HIGH>
```

### Check Balance

```bash
# Check your balance
sncast call \
  --contract-address 0x0374317fb45421115f2b3b3df22dce36d922a00eb7b2f80966ebc23cb8b2cfda \
  --function balance_of \
  --calldata 0x027292ef24ba913a086183713992b43e781b681796a0bbdb00ae947ca21fa9c8
```

### Transfer Tokens

```bash
# Transfer 100 yUSD to another address
sncast invoke \
  --contract-address 0x0374317fb45421115f2b3b3df22dce36d922a00eb7b2f80966ebc23cb8b2cfda \
  --function transfer \
  --calldata <RECIPIENT_ADDRESS> 100000000000000000000 0
```

---

## Common Amounts (in wei, 18 decimals)

- 1 yUSD = `1000000000000000000`
- 100 yUSD = `100000000000000000000`
- 1,000 yUSD = `1000000000000000000000`
- 10,000 yUSD = `10000000000000000000000`
- 100,000 yUSD = `100000000000000000000000`
- 1,000,000 yUSD = `1000000000000000000000000`

---

## Integration

Use this contract address in your frontend and perp trading platform:

```typescript
const YUSD_CONTRACT_ADDRESS = "0x0374317fb45421115f2b3b3df22dce36d922a00eb7b2f80966ebc23cb8b2cfda";
```

---

## Explorer Links

- **Contract**: [View on Explorer](https://explorer-zstarknet.d.karnot.xyz/contract/0x0374317fb45421115f2b3b3df22dce36d922a00eb7b2f80966ebc23cb8b2cfda)
- **Transaction**: [View Transaction](https://explorer-zstarknet.d.karnot.xyz/tx/0x00e02753abb5ce257b2cfc2b84d3141d664ec24a1cf751b2361103943902b389)

