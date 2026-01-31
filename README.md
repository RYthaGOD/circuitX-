# CircuitX: Private Perpetual DEX on Solana + Arcium

**CircuitX** is a privacy-first perpetual exchange that leverages **Arcium**'s confidential computing network to offer fully private order execution and position management, with final settlement on **Solana**.

> **Trade Private Perpetuals. Prove Validity, Never Identity.**

## ⚡ Why CircuitX?

Traditional DEXs expose your trading strategy, size, and entry price to the world, making you vulnerable to MEV and copy-trading. CircuitX solves this by processing orders in a Trusted Execution Environment (**MagicBlock Ephemeral Rollups**).

- **Total Privacy:** Your position size, leverage, and liquidation price are processed off-chain in TEEs.
- **Solana Speed:** Instant settlement and low fees.
- **Confidential Matching:** The order book and matching engine run inside a secure enclosure.

---

## 🏗 Architecture

### 1. Solana (Settlement Layer)
- Handles user collateral deposits and withdrawals.
- Verifies PnL updates from the Arcium network.
- **Stack:** Anchor, Rust.

### 2. Arcium (Privacy Layer)
- A Multi-Party Execution (MXE) environment that manages the order book and positions off-chain but verifyably.
- Calculates PnL and instructs the Solana contract to settle.
- **Stack:** Arcium SDK, Rust.

### 3. Frontend (User Interface)
- A modern trading interface allowing users to deposit funds and manage positions.
- **Stack:** Next.js, TypeScript, Tailwind CSS, Solana Wallet Adapter.

---

## 📂 Project Structure

```
.
├── app-solana/       # Frontend application (Next.js)
├── solana/           # Anchor smart contracts (Settlement & Vault)
├── arcium/           # Confidential execution logic (Arcium MXE)
└── README.md         # This file
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18+
- **Rust & Cargo**
- **Solana CLI** & **Anchor**
- **Arcium SDK** (if running local simulation)

### 1. Solana Programs
Build and deploy the settlement contract.
```bash
cd solana
anchor build
anchor test
```

### 2. Frontend
Start the user interface.
```bash
cd app-solana
npm install
npm run dev
```
Visit `http://localhost:3000` to connect your wallet.

### 3. Arcium Node (Simulation)
Run the confidential execution logic.
```bash
cd arcium
cargo run
```

---

## 🔐 How it Works
1. **Deposit**: User deposits USDC into the CircuitX Vault on Solana.
2. **Trade**: User signs an encrypted order. This order is sent to the Arcium Network.
3. **Match & Manage**: Arcium nodes match the order and manage the position (calculating funding, leverage, etc.) in a confidential state.
4. **Settle**: When a position is closed or liquidated, Arcium generates a proof/signature and calls `settle_pnl` on the Solana contract to release funds.

---

## 📄 License
MIT
