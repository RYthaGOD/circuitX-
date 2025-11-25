# yUSD Faucet Frontend

A web-based faucet interface for requesting 1000 yUSD tokens on Ztarknet testnet.

## Features

- 🎯 **Simple Interface**: Enter any address and request tokens
- 🔗 **Wallet Integration**: Connect Argent or Braavos wallet
- 💰 **Fixed Amount**: Always sends exactly 1000 yUSD per request
- 📊 **Transaction Tracking**: View transaction status and explorer links
- 🎨 **Modern UI**: Clean, responsive design

## How It Works

1. **Connect Wallet**: Click "Connect Wallet" to connect your Argent or Braavos wallet
   - Your wallet address will auto-fill, but you can change it
   - You need to connect to sign the transaction (you pay gas fees)

2. **Enter Recipient Address**: 
   - If wallet is connected, your address is pre-filled
   - You can change it to send tokens to any address
   - Must be a valid Starknet address (0x + 64 hex characters)

3. **Request Tokens**: Click "Request 1000 yUSD"
   - Your wallet will prompt you to sign the transaction
   - You pay the gas fees
   - 1000 yUSD is minted to the specified address

## Contract Details

- **Contract Address**: `0x0374317fb45421115f2b3b3df22dce36d922a00eb7b2f80966ebc23cb8b2cfda`
- **Network**: Ztarknet Testnet (https://ztarknet-madara.d.karnot.xyz)
- **Amount per Request**: 1000 yUSD (1,000 * 10^18 wei)
- **Function Used**: `mint_to(to: ContractAddress, amount: u256)`

## Running the App

```bash
cd quickstart/app
npm install
npm run dev
```

Then navigate to the app and click on "yUSD Faucet" in the navigation.

## Technical Details

### Components

- **Faucet.tsx**: Main faucet component with wallet connection and token request logic
- **Faucet.css**: Styling for the faucet interface
- **App.tsx**: Updated with navigation to switch between Proof Generation and Faucet

### Dependencies

- `@starknet-io/get-starknet`: Wallet connection
- `starknet`: Contract interaction
- `react`: UI framework

### Contract Interaction

The faucet uses the `mint_to` function from the yUSD contract:

```typescript
mint_to(
  to: ContractAddress,      // Recipient address
  amount: u256              // Amount (1000 * 10^18)
)
```

The `u256` amount is passed as two `felt252` values (low and high):
- Low: `1000000000000000000000` (1000 * 10^18)
- High: `0`

## Notes

- ⚠️ **Gas Fees**: The connected wallet pays for transaction gas fees
- ✅ **No Limits**: Anyone can request tokens (contract allows public minting)
- 🔄 **Multiple Requests**: You can request tokens multiple times
- 📝 **Transaction History**: All transactions are visible on the explorer

## Troubleshooting

### "No wallet found"
- Install [Argent](https://www.argent.xyz/) or [Braavos](https://braavos.app/) browser extension
- Make sure the extension is enabled

### "Failed to connect wallet"
- Check that your wallet is unlocked
- Make sure you're on the Ztarknet network (or the wallet will prompt to switch)

### "Invalid address format"
- Address must start with `0x`
- Address must be exactly 66 characters (0x + 64 hex chars)
- Example: `0x027292ef24ba913a086183713992b43e781b681796a0bbdb00ae947ca21fa9c8`

### "Failed to request tokens"
- Make sure you have enough funds for gas fees
- Check that the contract address is correct
- Verify you're connected to Ztarknet testnet

