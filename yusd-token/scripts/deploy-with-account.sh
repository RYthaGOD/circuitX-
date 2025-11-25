#!/bin/bash

# yUSD Token Deployment Script - Using Existing Account
# Usage: ./deploy-with-account.sh <account_name> OR <private_key> <address>

set -e

NETWORK_URL="https://ztarknet-madara.d.karnot.xyz"
TOKEN_NAME="yUSD"
TOKEN_SYMBOL="yUSD"
INITIAL_SUPPLY=0

echo "🚀 Deploying yUSD Token to Ztarknet..."
echo ""

# Check if account name or private key provided
if [ -z "$1" ]; then
    echo "Usage:"
    echo "  Option 1: ./deploy-with-account.sh <account_name>"
    echo "  Option 2: ./deploy-with-account.sh <private_key> <address>"
    exit 1
fi

# Determine if using account name or private key
if [ -z "$2" ]; then
    # Using account name
    ACCOUNT_NAME=$1
    USE_ACCOUNT_NAME=true
    echo "📋 Using account: $ACCOUNT_NAME"
    
    # Get account address
    ACCOUNT_ADDRESS=$(sncast account list | grep -A 10 "$ACCOUNT_NAME" | grep "address:" | awk '{print $2}')
    if [ -z "$ACCOUNT_ADDRESS" ]; then
        echo "❌ Error: Account '$ACCOUNT_NAME' not found"
        echo "   Import your account first:"
        echo "   sncast account import --name $ACCOUNT_NAME --address <address> --private-key <key> --url $NETWORK_URL --class-hash 0x01484c93b9d6cf61614d698ed069b3c6992c32549194fc3465258c2194734189 --type oz"
        exit 1
    fi
else
    # Using private key + address
    PRIVATE_KEY=$1
    ACCOUNT_ADDRESS=$2
    USE_ACCOUNT_NAME=false
    echo "📋 Using account address: $ACCOUNT_ADDRESS"
fi

echo ""

# Step 1: Build
echo "📦 Building contract..."
scarb build
echo "✅ Build complete"
echo ""

# Step 2: Declare
echo "📝 Declaring contract..."
if [ "$USE_ACCOUNT_NAME" = true ]; then
    DECLARE_OUTPUT=$(sncast declare \
      --contract-name yUSD \
      --url $NETWORK_URL \
      --account $ACCOUNT_NAME)
else
    DECLARE_OUTPUT=$(sncast declare \
      --contract-name yUSD \
      --url $NETWORK_URL \
      --private-key $PRIVATE_KEY \
      --account-address $ACCOUNT_ADDRESS)
fi

# Extract class hash from output
CLASS_HASH=$(echo "$DECLARE_OUTPUT" | grep -i "class hash" | grep -oE "0x[a-fA-F0-9]{64}" | head -1)

if [ -z "$CLASS_HASH" ]; then
    echo "❌ Error: Could not extract class hash from output"
    exit 1
fi

echo "✅ Contract declared"
echo "   Class Hash: $CLASS_HASH"
echo ""

# Step 3: Deploy
echo "📤 Deploying contract..."
echo "   Name: $TOKEN_NAME"
echo "   Symbol: $TOKEN_SYMBOL"
echo "   Initial Supply: $INITIAL_SUPPLY"
echo "   Recipient: $ACCOUNT_ADDRESS"
echo ""

if [ "$USE_ACCOUNT_NAME" = true ]; then
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
else
    DEPLOY_OUTPUT=$(sncast deploy \
      --class-hash $CLASS_HASH \
      --constructor-calldata \
        0x79555344 \
        0x79555344 \
        0 \
        0 \
        $ACCOUNT_ADDRESS \
      --url $NETWORK_URL \
      --private-key $PRIVATE_KEY \
      --account-address $ACCOUNT_ADDRESS)
fi

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

echo "📝 Save this contract address for your frontend!"
echo "   $CONTRACT_ADDRESS"
echo ""

