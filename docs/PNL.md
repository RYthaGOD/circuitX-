## Profit and Loss (PnL) Calculation

This document explains how **profit and loss (PnL)** is calculated for positions in the Ztarknet perp DEX.  
It matches the logic used in the frontend helper `calculatePnL` and is consistent with the on‑chain economics.

---

## Core Idea

For a position opened with:
- **Entry price**: \( P_0 \) (USD)
- **Current price**: \( P \) (USD)
- **Margin / collateral**: \( M \) (yUSD)
- **Leverage**: \( L \) (e.g. 20x)
- **Direction**: long or short

we:

1. Compute the **price change** relative to entry:
\[
\text{priceChangePercent} = \frac{P - P_0}{P_0} \times 100
\]

2. Convert that price move into **PnL on the leveraged notional**:

- **Long position**
\[
\text{PnL}_\text{long} =
  \frac{\text{priceChangePercent}}{100} \times M \times L
\]

- **Short position**
\[
\text{PnL}_\text{short} =
  -\,\frac{\text{priceChangePercent}}{100} \times M \times L
\]

3. Derive **ROE (Return on Equity)** and **PnL %**:
\[
\text{ROE} = \frac{\text{PnL}}{M} \times 100
\]
\[
\text{PnLPercent} = \text{priceChangePercent} \times L
\]

So:
- Longs profit when \( P > P_0 \)
- Shorts profit when \( P < P_0 \)
- The effect is scaled by **collateral** \( M \) and **leverage** \( L \)

---

## Numerical Examples

### Long Example

- Entry price \( P_0 = 50{,}000 \)
- Current price \( P = 55{,}000 \)
- Margin \( M = 1{,}000 \) yUSD
- Leverage \( L = 10 \) (10x long)

1. Price change:
\[
\text{priceChangePercent} =
  \frac{55{,}000 - 50{,}000}{50{,}000} \times 100 = 10\%
\]

2. PnL:
\[
\text{PnL} =
  \frac{10}{100} \times 1{,}000 \times 10 = 1{,}000 \text{ yUSD profit}
\]

3. ROE:
\[
\text{ROE} = \frac{1{,}000}{1{,}000} \times 100 = 100\%
\]

### Short Example

- Entry price \( P_0 = 50{,}000 \)
- Current price \( P = 45{,}000 \)
- Margin \( M = 1{,}000 \) yUSD
- Leverage \( L = 10 \) (10x short)

1. Price change:
\[
\text{priceChangePercent} =
  \frac{45{,}000 - 50{,}000}{50{,}000} \times 100 = -10\%
\]

2. PnL for a short (note the sign flip):
\[
\text{PnL}_\text{short} =
  -\,\frac{-10}{100} \times 1{,}000 \times 10 = 1{,}000 \text{ yUSD profit}
\]

3. ROE:
\[
\text{ROE} = \frac{1{,}000}{1{,}000} \times 100 = 100\%
\]

If the current price moved the other way (price up for a short, down for a long), the same formulas would yield a **negative PnL** (a loss).

---

## Relation to Liquidation

PnL is one part of the overall position lifecycle:

- **Notional size** is approximately:
\[
\text{Size (notional)} \approx \frac{M \times L}{P_0}
\]
- As price moves against the position, negative PnL **reduces effective equity**.
- When equity falls below the **maintenance margin** (defined per market), the position becomes liquidatable.

The frontend uses a separate helper to approximate the **liquidation price**, but the core PnL intuition is that **larger leverage makes both profits and losses grow linearly** with the same underlying price move.

---

## Where This Is Implemented

- **Frontend helper**: `calculatePnL` in `quickstart/app/src/services/pnlService.ts`
  - Uses the formulas above for display‑only PnL and ROE.
- **On‑chain**:
  - The `PositionHandler` and associated pricing utilities apply the same economic logic when computing payouts and losses on close (plus fees and funding).







