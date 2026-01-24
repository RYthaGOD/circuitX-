# 🚀 CircuitX Platform Launch Guide - Testnet

This guide will help you launch the CircuitX platform on Ztarknet testnet.

## ✅ Pre-Launch Checklist

### 1. Contract Deployment Status
Contracts are already deployed on Ztarknet testnet. Key addresses:

- **PerpRouter**: `0x057c9a38d9cfe77f8f0965b84e99398dbb2722bdfa380c466f10b13f2d3f8c41`
- **PositionHandler**: `0x07593362cf445551ecc052c70ea6f11b423577a24a708e3dd7d2dee1e9ae3fe0`
- **OrderHandler**: `0x01190b8b036ae40b724763878648f7328b658c315a7021ee2df188dcc01e1b4e`
- **yUSD Token**: `0x0374317fb45421115f2b3b3df22dce36d922a00eb7b2f80966ebc23cb8b2cfda`
- **Verifier**: `0x3f5bd2451155beaa736a44d68a9fa6dc38be2a34e9403eb68beb83bcb67c839`

All addresses are configured in `quickstart/app/src/config/contracts.ts`.

### 2. Network Configuration
- **RPC URL**: `https://ztarknet-madara.d.karnot.xyz`
- **Explorer**: `https://explorer-zstarknet.d.karnot.xyz`
- **Chain ID**: `0x534e5f4d41494e` (SN_MAIN)

### 3. Frontend Dependencies
✅ Dependencies are installed in `quickstart/app/node_modules`

## 🚀 Launch Steps

### Step 1: Start the Frontend Development Server

```bash
cd quickstart/app
bun run dev
# OR if you prefer npm:
# npm run dev
```

The server will start on `http://localhost:5173`

### Step 2: Access the Platform

1. Open your browser and navigate to `http://localhost:5173`
2. You should see the CircuitX landing page

### Step 3: Connect Your Wallet

1. Click "Connect Wallet" in the header
2. Select your Starknet wallet (ArgentX or Braavos)
3. Make sure your wallet is connected to **Ztarknet testnet**
   - Network: Ztarknet
   - RPC: `https://ztarknet-madara.d.karnot.xyz`

### Step 4: Get Test Tokens (yUSD)

1. Click "Faucet" in the navigation or header
2. Your wallet address will be pre-filled
3. Click "Request 1000 yUSD"
4. Confirm the transaction in your wallet
5. Wait for confirmation (~10-30 seconds)

### Step 5: Start Trading

1. Navigate to `/trade` or click "Start Trading"
2. Select a market (BTC/USD, ETH/USD, etc.)
3. Set your margin and leverage (up to 20x)
4. Choose direction (Long/Short)
5. Click "Buy Market" or "Sell Market"
6. Wait for ZK proof generation (~10-30 seconds)
7. Confirm the transaction in your wallet

## 🔧 Troubleshooting

### Frontend Won't Start

**Issue**: Port 5173 already in use
```bash
# Kill process on port 5173 (Windows)
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# Or use a different port
bun run dev -- --port 3000
```

**Issue**: Dependencies missing
```bash
cd quickstart/app
bun install
# OR
npm install
```

### Wallet Connection Issues

1. **Wallet not connecting**:
   - Make sure you have ArgentX or Braavos installed
   - Check that the wallet extension is enabled
   - Try refreshing the page

2. **Wrong network**:
   - In your wallet, switch to Ztarknet testnet
   - Network RPC: `https://ztarknet-madara.d.karnot.xyz`

### Contract Interaction Errors

1. **Insufficient funds**:
   - Get testnet ETH from faucet: https://faucet.ztarknet.cash/
   - Get yUSD from the platform faucet

2. **Transaction fails**:
   - Check that contracts are deployed (addresses in `contracts.ts`)
   - Verify network connection
   - Check browser console for detailed errors

### ZK Proof Generation Issues

1. **Proof generation slow**:
   - This is normal (10-30 seconds)
   - Make sure you're using a modern browser
   - Check browser console for errors

2. **Proof generation fails**:
   - Check browser console for detailed errors
   - Verify circuit files are present in `src/assets/`
   - Try refreshing the page

## 📋 Verification Checklist

After launching, verify:

- [ ] Frontend loads at `http://localhost:5173`
- [ ] Wallet connects successfully
- [ ] Can request yUSD from faucet
- [ ] Can view markets and prices
- [ ] Can open a position (with ZK proof)
- [ ] Position appears in portfolio
- [ ] Can close a position

## 🔄 Redeploying Contracts (If Needed)

If you need to redeploy contracts, see:
- `quickstart/admin/DEPLOY_NOW.md` - Quick redeployment guide
- `quickstart/admin/deploy-all-contracts.js` - Automated deployment script

## 📚 Additional Resources

- **Architecture**: `docs/ARCHITECTURE.md`
- **Smart Contracts**: `docs/SMART_CONTRACT.md`
- **Deployment**: `quickstart/contracts/DEPLOYMENT.md`
- **Circuit**: `quickstart/circuit/CIRCUIT_COMPLETE.md`

## 🎯 Next Steps After Launch

1. **Test Trading Flow**:
   - Open a long position
   - Open a short position
   - Close positions
   - Verify PnL calculations

2. **Test Privacy**:
   - Open a position
   - Check on-chain explorer
   - Verify only commitment hash is visible

3. **Test Multiple Markets**:
   - Try different markets (BTC, ETH, SOL, etc.)
   - Verify price feeds work correctly

4. **Share with Users**:
   - Share the localhost URL (if on same network)
   - Or deploy frontend to a hosting service
   - Provide testnet faucet links

---

**Platform Status**: ✅ Ready to Launch
**Last Updated**: January 24, 2026
