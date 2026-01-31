# 🚀 Perpl (CircuitX) Launch Guide - Solana Devnet

This guide will help you launch the CircuitX Private DEX on **Solana Devnet** using **MagicBlock Ephemeral Rollups**.

## ✅ Pre-Launch Checklist

### 1. Network Configuration
- **Cluster**: Solana Devnet
- **Privacy Layer**: MagicBlock Devnet TEE (`https://devnet-us.magicblock.app`)
- **Wallet**: Phantom or Solflare (connected to Devnet)

### 2. Dependencies
Ensure you have the following installed:
- [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools)
- [Anchor](https://www.anchor-lang.com/docs/installation)
- Node.js 18+

## 🚀 Launch Steps

### Step 1: Deploy Smart Contracts
Deploy the settlement and privacy-enabled contracts to Devnet.

```bash
# Verify credentials
solana config set --url https://api.devnet.solana.com
solana balance # Ensure you have SOL

# Deploy
./deploy_devnet.sh
```

### Step 2: Start the Frontend
The interface provides the privacy controls (Delegation) and trading UI.

```bash
cd app-solana
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

### Step 3: Enable Privacy (MagicBlock Delegation)
**Critical Step**: For your orders to be processed privately in the TEE, you must delegate your vault.

1.  Connect Wallet on the frontend.
2.  Click **"Enable Privacy (Delegate)"**.
3.  Approve the signature request.
    - *Under the hood, this delegates your Vault Account to the MagicBlock TEE validator.*

### Step 4: Trade (Private)
1.  **Deposit**: Add USDC (or Devnet dummy tokens) to your vault.
2.  **Trade**: Place a Long/Short order.
    - The transaction is sent to the **Ephemeral Rollup**, not public Mainnet.
    - Order details are encrypted/hidden from the public chain.
3.  **Settle/Undelegate**: When finished, you can "Disable Privacy" to settle final balances back to Solana Devnet.

## 🔧 Troubleshooting

- **Delegation Fails**: Ensure you have SOL for rent exemption.
- **"Account not found"**: Ensure you initialized the Vault first (usually handled on Deposit if not exists).
- **Frontend Errors**: Check the console. If `@magicblock-labs` errors occur, try `npm install --legacy-peer-deps`.

## 📚 Resources
- [MagicBlock Docs](https://docs.magicblock.gg)
- [Solana Faucet](https://faucet.solana.com/)
