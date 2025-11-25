# Creating a New Account on Ztarknet

## Step 1: Create Account

```bash
cd yusd-token

sncast account create \
  --name yieldstark \
  --class-hash 0x01484c93b9d6cf61614d698ed069b3c6992c32549194fc3465258c2194734189 \
  --type oz \
  --url https://ztarknet-madara.d.karnot.xyz
```

This will:
- Generate a new private key
- Calculate the account address
- Save the account info locally
- **Save the private key and address shown in the output!**

## Step 2: Get Funds from Faucet

Visit the Ztarknet faucet:
- **URL**: https://faucet.ztarknet.cash/
- Enter your **account address** from Step 1
- Request testnet tokens

## Step 3: Deploy the Account

After you have funds, deploy the account to the network:

```bash
sncast account deploy \
  --url https://ztarknet-madara.d.karnot.xyz \
  --name yieldstark
```

## Step 4: Verify Account

```bash
# List accounts
sncast account list

# Check balance
sncast balance \
  --token-address 0x1ad102b4c4b3e40a51b6fb8a446275d600555bd63a95cdceed3e5cef8a6bc1d \
  --url https://ztarknet-madara.d.karnot.xyz \
  --account yieldstark
```

## Step 5: Update snfoundry.toml (if needed)

Make sure your `snfoundry.toml` has:
```toml
[sncast.default]
url = "https://ztarknet-madara.d.karnot.xyz"
account = "yieldstark"
```

## Security Notes

⚠️ **IMPORTANT:**
- Save your private key securely
- Never share your private key
- This is a testnet account - don't use for mainnet
- The account will be saved in your local sncast config

