#!/bin/bash

# yUSD Token Deployment Script for Ztarknet
# This script automates the deployment process

set -e

NETWORK_URL="https://ztarknet-madara.d.karnot.xyz"
ACCOUNT_NAME="ztarknet"
TOKEN_NAME="yUSD"
TOKEN_SYMBOL="yUSD"
INITIAL_SUPPLY=0

echo "🚀 Deploying yUSD Token to Ztarknet..."
echo ""

# Step 1: Build
echo "📦 Building contract..."
scarb build
echo "✅ Build complete"
echo ""

# Step 2: Declare
echo "📝 Declaring contract..."
echo "   (Please save the class hash from the output below)"
DECLARE_OUTPUT=$(sncast declare \
  --contract-name yUSD \
  --url $NETWORK_URL \
  --account $ACCOUNT_NAME)

# Extract class hash from output (format: "Class hash declared: 0x...")
CLASS_HASH=$(echo "$DECLARE_OUTPUT" | grep -i "class hash" | grep -oE "0x[a-fA-F0-9]{64}" | head -1)

if [ -z "$CLASS_HASH" ]; then
    echo "❌ Error: Could not extract class hash from output"
    echo "   Please run manually: sncast declare --contract-name yUSD"
    echo "   Then use the class hash in the deploy command"
    exit 1
fi

echo "✅ Contract declared"
echo "   Class Hash: $CLASS_HASH"
echo ""

# Step 3: Get recipient address
echo "📋 Getting account address..."
ACCOUNT_ADDRESS=$(sncast account list | grep -A 10 "$ACCOUNT_NAME" | grep "address:" | awk '{print $2}')

if [ -z "$ACCOUNT_ADDRESS" ]; then
    echo "❌ Error: Account '$ACCOUNT_NAME' not found"
    echo "   Please create an account first:"
    echo "   sncast account create --name $ACCOUNT_NAME --url $NETWORK_URL"
    exit 1
fi

echo "   Account: $ACCOUNT_ADDRESS"
echo ""

# Step 4: Deploy
echo "📤 Deploying contract..."
echo "   Name: $TOKEN_NAME"
echo "   Symbol: $TOKEN_SYMBOL"
echo "   Initial Supply: $INITIAL_SUPPLY"
echo "   Recipient: $ACCOUNT_ADDRESS"
echo ""

DEPLOY_OUTPUT=$(sncast deploy \
  --class-hash $CLASS_HASH \
  --constructor-calldata \
    0x79555344 \
    0x79555344 \
    0 \
    0 \
    $ACCOUNT_ADDRESS \
  --url $NETWORK_URL \
  --account $ACCOUNT_NAME)

# Extract contract address and tx hash from output
CONTRACT_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep -i "contract address" | grep -oE "0x[a-fA-F0-9]{64}" | head -1)
TX_HASH=$(echo "$DEPLOY_OUTPUT" | grep -i "transaction hash" | grep -oE "0x[a-fA-F0-9]{64}" | head -1)

echo "✅ Contract deployed!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Deployment Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Contract Address: $CONTRACT_ADDRESS"
echo "Transaction Hash: $TX_HASH"
echo "Network: Ztarknet ($NETWORK_URL)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 5: Verify
echo "🔍 Verifying deployment..."
NAME_RESULT=$(sncast call \
  --contract-address $CONTRACT_ADDRESS \
  --function name \
  --url $NETWORK_URL \
  --json 2>/dev/null || echo "[]")

if echo $NAME_RESULT | jq -e '.result[0]' > /dev/null 2>&1; then
    echo "✅ Contract verified - name() returns: $(echo $NAME_RESULT | jq -r '.result[0]')"
else
    echo "⚠️  Could not verify contract (may need to wait for block confirmation)"
fi
echo ""

# Step 6: Test mint (optional)
read -p "Would you like to test mint 1000 yUSD? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "💰 Minting 1000 yUSD..."
    MINT_AMOUNT=1000000000000000000000  # 1000 * 10^18
    
    sncast invoke \
      --contract-address $CONTRACT_ADDRESS \
      --function mint \
      --calldata $MINT_AMOUNT \
      --url $NETWORK_URL \
      --account $ACCOUNT_NAME
    
    echo "✅ Mint transaction submitted"
    echo "   Check your balance with:"
    echo "   sncast call --contract-address $CONTRACT_ADDRESS --function balance_of --calldata $ACCOUNT_ADDRESS --url $NETWORK_URL"
fi
echo ""

echo "📝 Next Steps:"
echo "   1. Save contract address: $CONTRACT_ADDRESS"
echo "   2. Users can mint tokens:"
echo "      sncast invoke --contract-address $CONTRACT_ADDRESS --function mint --calldata <amount> --url $NETWORK_URL --account <account>"
echo "   3. Integrate into your frontend"
echo ""
