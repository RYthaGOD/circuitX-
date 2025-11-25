# yUSD Token Contract

A mintable ERC20 token for Ztarknet testnet, designed for use as a test asset and faucet token.

## Token Details

- **Name**: yUSD
- **Symbol**: yUSD
- **Decimals**: 18
- **Total Supply**: 10,000,000,000 yUSD (10 billion)
- **Network**: Ztarknet Testnet (https://ztarknet-madara.d.karnot.xyz)

## Features

- ✅ Standard ERC20 interface
- ✅ Public minting (anyone can mint tokens)
- ✅ Faucet-friendly design
- ✅ Full transfer and approval functionality

## Functions

### Standard ERC20
- `name()` - Returns token name
- `symbol()` - Returns token symbol
- `decimals()` - Returns token decimals (18)
- `total_supply()` - Returns total supply
- `balance_of(account)` - Returns balance of an account
- `transfer(recipient, amount)` - Transfers tokens
- `transfer_from(sender, recipient, amount)` - Transfers from another address
- `approve(spender, amount)` - Approves spender
- `allowance(owner, spender)` - Returns allowance

### Minting Functions
- `mint(amount)` - Mints tokens to caller's address
- `mint_to(to, amount)` - Mints tokens to a specific address

**Note**: Anyone can call minting functions - no restrictions!

## Deployment

### Prerequisites

1. Install Scarb:
```bash
curl --proto '=https' --tlsv1.2 -sSf https://docs.swmansion.com/scarb/install.sh | sh
```

2. Install Starknet Foundry:
```bash
curl -L https://raw.githubusercontent.com/foundry-rs/starknet-foundry/master/scripts/install.sh | sh
```

### Build

```bash
cd yusd-token
scarb build
```

### Deploy

```bash
# Declare the contract
sncast declare --contract-name yUSD

# Deploy with constructor parameters
# name: "yUSD"
# symbol: "yUSD"
# initial_supply: 0 (or any amount you want initially)
# recipient: <your_address>

sncast deploy \
  --class-hash <class_hash_from_declare> \
  --constructor-calldata \
    "yUSD" \
    "yUSD" \
    0 \
    <recipient_address>
```

### Example: Mint Tokens

```bash
# Mint 1000 yUSD to your address (with 18 decimals)
sncast invoke \
  --contract-address <yusd_contract_address> \
  --function mint \
  --calldata 1000000000000000000000  # 1000 * 10^18
```

## Usage as Faucet

Users can request tokens by calling:
```bash
sncast invoke \
  --contract-address <yusd_contract_address> \
  --function mint \
  --calldata <amount_in_wei>
```

Or mint to a specific address:
```bash
sncast invoke \
  --contract-address <yusd_contract_address> \
  --function mint_to \
  --calldata <recipient_address> <amount_in_wei>
```

## Network Configuration

Update `snfoundry.toml` or use:
```bash
sncast --url https://ztarknet-madara.d.karnot.xyz <command>
```

## License

MIT

