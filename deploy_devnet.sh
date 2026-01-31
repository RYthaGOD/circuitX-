#!/bin/bash
set -e

echo "🚀 Deploying Perpl to Solana Devnet..."

# 1. Verification of Tools
if ! command -v anchor &> /dev/null; then
    echo "❌ Anchor CLI not found"
    exit 1
fi

if ! command -v arcium-cli &> /dev/null; then
    echo "⚠️  Arcium CLI not found. Skipping Arcium deploy step."
    echo "ℹ️  Please install arcium-cli to deploy the Encrypted Logic."
else
    # 2. Arcium Deployment
    echo "🔐 Deploying Arcium MXE Program..."
    cd arcium
    arcium program deploy --cluster devnet
    cd ..
fi

# 3. Solana Deployment
echo "⛓️  Deploying Solana Settlement Program..."
cd solana
anchor deploy --provider.cluster https://devnet-us.magicblock.app

echo "✅ Deployment Complete!"
