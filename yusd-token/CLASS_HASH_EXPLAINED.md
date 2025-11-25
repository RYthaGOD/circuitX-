# What is a Class Hash?

In Starknet, there are **two types of class hashes** you'll encounter:

## 1. Account Class Hash (What you're asking about)

The **account class hash** (`0x01484c93b9d6cf61614d698ed069b3c6992c32549194fc3465258c2194734189`) identifies the **type of account contract** your account uses.

### What it represents:
- The **account implementation contract** that defines how your account works
- Think of it as the "blueprint" for your account's functionality
- Different account types have different class hashes

### Why it's needed:
When you add an existing account to sncast, it needs to know:
1. **What type of account** it is (OpenZeppelin, Argent, Braavos, etc.)
2. **How to interact** with it (sign transactions, validate signatures, etc.)

### Common Account Class Hashes:

| Account Type | Class Hash | Description |
|-------------|------------|-------------|
| **OpenZeppelin** | `0x01484c93b9d6cf61614d698ed069b3c6992c32549194fc3465258c2194734189` | Standard account (most common) |
| **Argent** | Different hash | Argent wallet account |
| **Braavos** | Different hash | Braavos wallet account |

### In your case:
```bash
--class-hash 0x01484c93b9d6cf61614d698ed069b3c6992c32549194fc3465258c2194734189
--type oz  # "oz" = OpenZeppelin
```

This tells sncast: *"This account uses the OpenZeppelin account implementation"*

---

## 2. Contract Class Hash (For deploying contracts)

When you **declare** a contract (like yUSD), you get a **contract class hash**:

```bash
sncast declare --contract-name yUSD
# Output: class_hash = 0x1234...abcd
```

This class hash is then used to **deploy instances** of that contract:

```bash
sncast deploy --class-hash 0x1234...abcd --constructor-calldata ...
```

### Key Difference:

| Type | Purpose | When Generated |
|------|---------|----------------|
| **Account Class Hash** | Identifies account type | Pre-deployed on network, you reference it |
| **Contract Class Hash** | Identifies your contract code | Generated when you declare your contract |

---

## Do you need the account class hash?

### ✅ YES - If:
- You're adding an existing account to sncast
- You're creating a new account
- Your account uses a non-standard implementation

### ❌ NO - If:
- You're using the account directly with `--private-key` and `--account-address`
- sncast can auto-detect it (sometimes)

---

## How to find your account's class hash:

If you don't know your account's class hash, you can:

1. **Check the account type** (OpenZeppelin, Argent, Braavos, etc.)
2. **Query the network**:
   ```bash
   # Get account info from network
   curl -X POST https://ztarknet-madara.d.karnot.xyz \
     -H "Content-Type: application/json" \
     -d '{
       "jsonrpc": "2.0",
       "method": "starknet_getClassHashAt",
       "params": {
         "block_id": "latest",
         "contract_address": "<YOUR_ACCOUNT_ADDRESS>"
       },
       "id": 1
     }'
   ```

3. **Use the default** (OpenZeppelin) if unsure:
   - Most accounts on Ztarknet use OpenZeppelin
   - The hash `0x01484c93b9d6cf61614d698ed069b3c6992c32549194fc3465258c2194734189` is the standard

---

## Summary

**Account Class Hash** = "What type of account contract is this?"
- Used when adding/creating accounts
- Pre-deployed on the network
- Standard value for OpenZeppelin accounts

**Contract Class Hash** = "What contract code am I deploying?"
- Generated when you declare your contract
- Used to deploy instances of that contract

For adding your existing account, you typically just need the OpenZeppelin class hash shown above, unless you know you're using a different account type.

