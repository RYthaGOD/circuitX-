#!/bin/bash

# yUSD Minting Script
# Mints yUSD tokens (for faucet functionality)

set -e

if [ -z "$1" ]; then
    echo "Usage: ./mint.sh <contract_address> [amount] [recipient]"
    echo "  contract_address: yUSD contract address"
    echo "  amount: Amount to mint (default: 1000 yUSD = 1000000000000000000000)"
    echo "  recipient: Address to mint to (default: caller address)"
    exit 1
fi

CONTRACT_ADDRESS=$1
AMOUNT=${2:-"1000000000000000000000"}  # Default: 1000 yUSD
RECIPIENT=${3:-""}

echo "💰 Minting yUSD tokens..."
echo "   Contract: $CONTRACT_ADDRESS"
echo "   Amount: $AMOUNT wei ($(echo "scale=2; $AMOUNT / 10^18" | bc) yUSD)"

if [ -z "$RECIPIENT" ]; then
    echo "   Minting to caller address..."
    sncast invoke \
        --contract-address $CONTRACT_ADDRESS \
        --function mint \
        --calldata $AMOUNT
else
    echo "   Minting to: $RECIPIENT"
    sncast invoke \
        --contract-address $CONTRACT_ADDRESS \
        --function mint_to \
        --calldata $RECIPIENT $AMOUNT
fi

echo "✅ Mint successful!"

