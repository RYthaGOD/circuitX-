# yUSD Token Deployment Script for Ztarknet (PowerShell)
# This script automates the deployment process

$ErrorActionPreference = "Stop"

$NETWORK_URL = "https://ztarknet-madara.d.karnot.xyz"
$ACCOUNT_NAME = "ztarknet"
$TOKEN_NAME = "yUSD"
$TOKEN_SYMBOL = "yUSD"
$INITIAL_SUPPLY = 0

Write-Host "🚀 Deploying yUSD Token to Ztarknet..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Build
Write-Host "📦 Building contract..." -ForegroundColor Yellow
scarb build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Build complete" -ForegroundColor Green
Write-Host ""

# Step 2: Declare
Write-Host "📝 Declaring contract..." -ForegroundColor Yellow
$DECLARE_OUTPUT = sncast declare --contract-name yUSD --url $NETWORK_URL --account $ACCOUNT_NAME
# Extract class hash from output (format: "Class hash declared: 0x...")
$CLASS_HASH = ($DECLARE_OUTPUT | Select-String -Pattern "0x[a-fA-F0-9]{64}").Matches[0].Value

Write-Host "✅ Contract declared" -ForegroundColor Green
Write-Host "   Class Hash: $CLASS_HASH" -ForegroundColor Cyan
Write-Host ""

# Step 3: Get recipient address
Write-Host "📋 Getting account address..." -ForegroundColor Yellow
$ACCOUNT_LIST = sncast account list
$ACCOUNT_LINE = $ACCOUNT_LIST | Select-String -Pattern "address:" | Select-Object -First 1

if (-not $ACCOUNT_LINE) {
    Write-Host "❌ Error: Account '$ACCOUNT_NAME' not found" -ForegroundColor Red
    Write-Host "   Please create an account first:" -ForegroundColor Yellow
    Write-Host "   sncast account create --name $ACCOUNT_NAME --url $NETWORK_URL" -ForegroundColor Yellow
    exit 1
}

$ACCOUNT_ADDRESS = ($ACCOUNT_LINE -split '\s+')[1]
Write-Host "   Account: $ACCOUNT_ADDRESS" -ForegroundColor Cyan
Write-Host ""

# Step 4: Deploy
Write-Host "📤 Deploying contract..." -ForegroundColor Yellow
Write-Host "   Name: $TOKEN_NAME"
Write-Host "   Symbol: $TOKEN_SYMBOL"
Write-Host "   Initial Supply: $INITIAL_SUPPLY"
Write-Host "   Recipient: $ACCOUNT_ADDRESS"
Write-Host ""

$DEPLOY_OUTPUT = sncast deploy `
  --class-hash $CLASS_HASH `
  --constructor-calldata 0x79555344 0x79555344 0 0 $ACCOUNT_ADDRESS `
  --url $NETWORK_URL `
  --account $ACCOUNT_NAME

# Extract contract address and tx hash from output
$CONTRACT_ADDRESS = ($DEPLOY_OUTPUT | Select-String -Pattern "contract address.*0x[a-fA-F0-9]{64}").Matches[0].Value -replace ".*(0x[a-fA-F0-9]{64}).*", '$1'
$TX_HASH = ($DEPLOY_OUTPUT | Select-String -Pattern "transaction hash.*0x[a-fA-F0-9]{64}").Matches[0].Value -replace ".*(0x[a-fA-F0-9]{64}).*", '$1'

Write-Host "✅ Contract deployed!" -ForegroundColor Green
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "📋 Deployment Summary" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "Contract Address: $CONTRACT_ADDRESS" -ForegroundColor White
Write-Host "Transaction Hash: $TX_HASH" -ForegroundColor White
Write-Host "Network: Ztarknet ($NETWORK_URL)" -ForegroundColor White
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

Write-Host "📝 Next Steps:" -ForegroundColor Yellow
Write-Host "   1. Save contract address: $CONTRACT_ADDRESS" -ForegroundColor White
Write-Host "   2. Users can mint tokens using the mint() function" -ForegroundColor White
Write-Host "   3. Integrate into your frontend" -ForegroundColor White
Write-Host ""

