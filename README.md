# CircuitX: Private Perpetual DEX on Solana (MagicBlock Edition)

**CircuitX** is a privacy-first perpetual exchange that leverages **MagicBlock Ephemeral Rollups (TEEs)** to offer fully private order execution and position management, with final settlement on **Solana**.

> **Trade Private Perpetuals. Prove Validity, Never Identity.**

## ⚡ Why CircuitX?

Traditional DEXs expose your trading strategy, size, and entry price to the world, making you vulnerable to MEV and copy-trading. CircuitX solves this by processing orders in a Trusted Execution Environment (**MagicBlock Ephemeral Rollups**).

- **Total Privacy:** Your position size, leverage, and liquidation price are processed off-chain in TEEs.
- **Solana Speed:** Instant settlement and low fees.
- **Confidential Matching:** The order book and matching engine run inside a secure enclosure.

## 🏗 Architecture

### 1. Solana (Settlement Layer)
- Handles user collateral deposits and withdrawals (USDC).
- Verifies settlement proofs from the TEE.
- **Stack:** Anchor, Rust.

### 2. MagicBlock (Privacy Layer)
- An Ephemeral Rollup running inside a TEE.
- Manages the order book and positions off-chain but verifyably.
- **Stack:** MagicBlock Ephemeral Rollups SDK.

### 3. Frontend (User Interface)
- A modern trading interface allowing users to **Delegate** their vault to the TEE for privacy.
- **Stack:** Next.js, TypeScript, Tailwind CSS, MagicBlock SDK.

## 🚀 Getting Started

For detailed setup and launch instructions, please see the **[SOLANA_LAUNCH_GUIDE.md](./SOLANA_LAUNCH_GUIDE.md)**.

### Quick Start (Devnet)

1.  **Helper Script**:
    ```bash
    ./deploy_devnet.sh
    ```

2.  **Frontend**:
    ```bash
    cd app-solana
    npm install
    npm run dev
    ```

3.  **App**: Open `http://localhost:3000`, Connect Wallet, and click **"Enable Privacy"**.

## 🔐 How it Works
1.  **Deposit**: User deposits USDC into the CircuitX Vault on Solana.
2.  **Delegate**: User **delegates** their vault account to the MagicBlock TEE validator.
3.  **Trade**: Matches occur inside the TEE (Devnet Validator). Observers only see encrypted state diffs.
4.  **Settle**: User undelegates or settles PnL, bringing the final balance back to Solana Mainnet state.

## 📄 License
MIT
