# yUSD Token Deployment Guide

## Prerequisites

1. **Account Setup**: You need a deployed account on Ztarknet
2. **Funds**: Your account needs funds for gas fees (get from faucet: https://faucet.ztarknet.cash/)

## Step 0: Add Existing Account (if you have one)

If you already have an account (private key + address), import it to sncast:

```bash
sncast account import \
  --name myaccount \
  --address <YOUR_ACCOUNT_ADDRESS> \
  --private-key <YOUR_PRIVATE_KEY> \
  --url https://ztarknet-madara.d.karnot.xyz \
  --class-hash 0x01484c93b9d6cf61614d698ed069b3c6992c32549194fc3465258c2194734189 \
  --type oz
```

**Or use account directly without adding:**
```bash
# Use --private-key and --account-address flags in each command
sncast declare \
  --contract-name yUSD \
  --private-key <YOUR_PRIVATE_KEY> \
  --account-address <YOUR_ACCOUNT_ADDRESS> \
  --url https://ztarknet-madara.d.karnot.xyz
```

See [ADD_ACCOUNT.md](./ADD_ACCOUNT.md) for detailed instructions.

## Step 1: Create/Deploy Account (if not done)

```bash
# Create account
sncast account create \
  --name ztarknet \
  --class-hash 0x01484c93b9d6cf61614d698ed069b3c6992c32549194fc3465258c2194734189 \
  --type oz \
  --url https://ztarknet-madara.d.karnot.xyz

# Get funds from faucet
# Visit: https://faucet.ztarknet.cash/
# Enter your account address

# Deploy account
sncast account deploy \
  --url https://ztarknet-madara.d.karnot.xyz \
  --name ztarknet

# Check balance
sncast balance \
  --token-address 0x1ad102b4c4b3e40a51b6fb8a446275d600555bd63a95cdceed3e5cef8a6bc1d \
  --url https://ztarknet-madara.d.karnot.xyz
```

## Step 2: Declare the Contract

```bash
cd yusd-token

# Option A: Using account name (if you added account)
sncast declare \
  --contract-name yUSD \
  --url https://ztarknet-madara.d.karnot.xyz \
  --account myaccount

# Option B: Using private key directly
sncast declare \
  --contract-name yUSD \
  --url https://ztarknet-madara.d.karnot.xyz \
  --private-key <YOUR_PRIVATE_KEY> \
  --account-address <YOUR_ACCOUNT_ADDRESS>
```

**Save the `class_hash` from the output!** (It will be displayed in the terminal)

## Step 3: Deploy the Contract

```bash
# Replace <CLASS_HASH> with the class hash from Step 2
# Replace <YOUR_ADDRESS> with your account address

# Option A: Using account name (with initial_supply = 0)
sncast deploy \
  --class-hash <CLASS_HASH> \
  --constructor-calldata \
    0x79555344 \
    0x79555344 \
    0 \
    0 \
    <YOUR_ADDRESS> \
  --url https://ztarknet-madara.d.karnot.xyz \
  --account myaccount

# Option B: Using private key directly (with initial_supply = 0)
sncast deploy \
  --class-hash <CLASS_HASH> \
  --constructor-calldata \
    0x79555344 \
    0x79555344 \
    0 \
    0 \
    <YOUR_ADDRESS> \
  --url https://ztarknet-madara.d.karnot.xyz \
  --private-key <YOUR_PRIVATE_KEY> \
  --account-address <YOUR_ACCOUNT_ADDRESS>
```

**Save the `contract_address` from the output!**

## Step 4: Verify Deployment

```bash
# Check contract address (replace with your deployed address)
sncast call \
  --contract-address <CONTRACT_ADDRESS> \
  --function name \
  --url https://ztarknet-madara.d.karnot.xyz

# Should return: "yUSD"
```

## Step 5: Test Minting

```bash
# Mint 1000 yUSD (1000 * 10^18)
sncast invoke \
  --contract-address <CONTRACT_ADDRESS> \
  --function mint \
  --calldata 1000000000000000000000 \
  --url https://ztarknet-madara.d.karnot.xyz \
  --account ztarknet

# Check your balance
sncast call \
  --contract-address <CONTRACT_ADDRESS> \
  --function balance_of \
  --calldata <YOUR_ADDRESS> \
  --url https://ztarknet-madara.d.karnot.xyz
```

## Quick Reference

### Constructor Parameters (from ABI):
- `name`: `0x79555344` (felt252 - hex-encoded "yUSD")
- `symbol`: `0x79555344` (felt252 - hex-encoded "yUSD")
- `initial_supply`: `0 0` (u256 - passed as two felt252: low and high) - Start with 0, users mint via faucet
- `recipient`: Your account address (ContractAddress)

**Note:** `u256` values must be passed as two felt252 values (low and high parts). For example:
- `0` = `0 0`
- `1` = `1 0`
- `1000000000000000000` (1 token with 18 decimals) = `1000000000000000000 0`
- `1000000000000000000000000` (1M tokens) = `1000000000000000000000000 0`

**Example with initial supply of 10,000 tokens:**
```bash
sncast deploy \
  --class-hash <CLASS_HASH> \
  --constructor-calldata \
    0x79555344 \
    0x79555344 \
    10000000000000000000000 \
    0 \
    <YOUR_ADDRESS>
```

**Note:** Short strings in Cairo must be passed as hex-encoded felt252 values:
- "yUSD" = `0x79555344` (y=0x79, U=0x55, S=0x53, D=0x44)

### Common Amounts (in wei, 18 decimals):
- 1 yUSD = `1000000000000000000`
- 100 yUSD = `100000000000000000000`
- 1,000 yUSD = `1000000000000000000000`
- 10,000 yUSD = `10000000000000000000000`
- 1,000,000 yUSD = `1000000000000000000000000`

## Network Configuration

The `snfoundry.toml` file is already configured for Ztarknet:
```toml
[sncast.starknet]
network_url = "https://ztarknet-madara.d.karnot.xyz"
```

You can also set it explicitly:
```bash
export STARKNET_RPC_URL="https://ztarknet-madara.d.karnot.xyz"
```

## Troubleshooting

### Error: "Account not found"
- Make sure you've created and deployed your account
- Check account name matches: `sncast account list`

### Error: "Insufficient balance"
- Get funds from faucet: https://faucet.ztarknet.cash/
- Check balance: `sncast balance --url https://ztarknet-madara.d.karnot.xyz`

### Error: "Class hash not found"
- Make sure you declared the contract first
- Check the class hash is correct

## Next Steps

After deployment:
1. Save the contract address
2. Share it with users for faucet requests
3. Integrate into your frontend
4. Use in your perp trading platform

