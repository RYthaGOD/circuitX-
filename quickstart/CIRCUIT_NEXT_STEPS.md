# Next Steps After `nargo check` Success ✅

Your Noir circuit compiles successfully! Here's what to do next to generate the verifier contract and integrate it with your Cairo contracts.

## Step 1: Generate Witness

Execute the circuit with your `Prover.toml` inputs to generate a witness:

```bash
cd quickstart/circuit
nargo execute witness
```

**Expected output:**
- Creates `target/witness.gz` (compressed witness)
- Creates `target/circuit.json` (circuit representation)

---

## Step 2: Generate ZK Proof

Use Barretenberg to generate a ZK proof:

```bash
bb prove --scheme ultra_honk --zk --oracle_hash starknet \
  -b ./target/circuit.json \
  -w ./target/witness.gz \
  -o ./target
```

**Expected output:**
- Creates `target/proof` (the ZK proof)
- Creates `target/public_inputs` (public inputs for verification)

**Note:** Make sure you have `bb` (Barretenberg) installed. If not:
```bash
# Install Barretenberg (if not already installed)
make install-barretenberg
# Or follow: https://github.com/AztecProtocol/barretenberg
```

---

## Step 3: Generate Verifying Key (VK)

Generate the verifying key that will be used by the Cairo verifier contract:

```bash
bb write_vk --scheme ultra_honk --oracle_hash starknet \
  -b ./target/circuit.json \
  -o ./target
```

**Expected output:**
- Creates `target/vk` (verifying key file)

---

## Step 4: Generate Cairo Verifier Contract with Garaga

Use Garaga to automatically generate a Scarb project with the verifier contract:

```bash
# From quickstart directory (not circuit directory)
cd quickstart
garaga gen --system ultra_starknet_zk_honk \
  --vk ./circuit/target/vk \
  --project-name verifier
```

**Expected output:**
- Creates `quickstart/verifier/` directory
- Contains Scarb project with `UltraStarknetZKHonkVerifier` contract

**Note:** Make sure Garaga is installed:
```bash
pip install garaga==0.18.1
# Requires Python 3.10+
```

---

## Step 5: Build Verifier Contract

Build the generated verifier contract:

```bash
cd quickstart/verifier
scarb build
```

**Expected output:**
- Contract compiles successfully
- Ready for deployment

---

## Step 6: Verify Your Contracts Still Compile

Make sure your main contracts still compile with the new verifier:

```bash
cd quickstart/contracts
scarb build
```

**Expected output:**
- All contracts compile successfully
- Verifier integration is correct

---

## Step 7: Test Proof Verification (Optional)

Serialize the proof as contract calldata and test verification:

```bash
# From quickstart directory
garaga calldata --system ultra_starknet_zk_honk \
  --proof circuit/target/proof \
  --vk circuit/target/vk \
  --public-inputs circuit/target/public_inputs > calldata.txt
```

Then test with a deployed verifier (after deployment):
```bash
sncast call \
  --contract-address <VERIFIER_ADDRESS> \
  --function "verify_ultra_starknet_zk_honk_proof" \
  --calldata $(cat calldata.txt)
```

---

## Step 8: Deploy Verifier Contract (When Ready)

When you're ready to deploy:

```bash
# Declare the contract
cd quickstart/verifier
sncast declare --contract-name UltraStarknetZKHonkVerifier

# Deploy using UDC (Universal Deployer Contract)
# Replace <CLASS_HASH> with the output from declare command
sncast invoke \
  --contract-address 0x041a78e741e5af2fec34b695679bc6891742439f7afb8484ecd7766661ad02bf \
  --function "deployContract" \
  --calldata <CLASS_HASH> 0x0 0x0 0x0
```

---

## Quick Command Summary

```bash
# 1. Generate witness
cd quickstart/circuit
nargo execute witness

# 2. Generate proof
bb prove --scheme ultra_honk --zk --oracle_hash starknet \
  -b ./target/circuit.json -w ./target/witness.gz -o ./target

# 3. Generate VK
bb write_vk --scheme ultra_honk --oracle_hash starknet \
  -b ./target/circuit.json -o ./target

# 4. Generate verifier contract
cd ../..
garaga gen --system ultra_starknet_zk_honk \
  --vk ./circuit/target/vk --project-name verifier

# 5. Build verifier
cd verifier
scarb build

# 6. Verify main contracts
cd ../contracts
scarb build
```

---

## Troubleshooting

### Issue: `bb` command not found
**Solution:** Install Barretenberg
```bash
make install-barretenberg
# Or build from source: https://github.com/AztecProtocol/barretenberg
```

### Issue: `garaga` command not found
**Solution:** Install Garaga
```bash
pip install garaga==0.18.1
# Requires Python 3.10+
```

### Issue: Proof generation fails
**Solution:** 
- Check that `Prover.toml` has valid inputs
- Ensure witness was generated successfully
- Verify circuit.json exists in target/

### Issue: Verifier contract doesn't compile
**Solution:**
- Check Garaga version: `garaga --version` (should be 0.18.1)
- Verify VK file exists: `ls circuit/target/vk`
- Check Scarb version: `scarb --version`

---

## What's Next After This?

Once the verifier is generated and deployed:

1. ✅ **Update contract verifier address** - Point your contracts to the deployed verifier
2. ✅ **Test end-to-end** - Open/close positions with ZK proofs
3. ✅ **Build frontend** - Integrate proof generation in your dApp
4. ✅ **Deploy to testnet** - Deploy all contracts to Ztarknet
5. ✅ **Implement off-chain payment service** - For private payouts

---

**You're making great progress! 🚀**

